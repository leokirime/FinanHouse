/**
 * Smoke-test transacional da API HTTP (`apps/api/src/http/`) contra o banco
 * `finanhouse_dev` (Aiven). Cria dados totalmente sintéticos dentro de uma
 * única transação, cria a aplicação HTTP sobre repositórios vinculados a
 * essa transação, exercita as rotas via `app.inject()` (sem abrir socket de
 * rede), e sempre executa ROLLBACK ao final — nunca commit. Não usa seed,
 * não insere dado real, não altera schema nem migrations.
 *
 * NÃO é executado automaticamente. Exige simultaneamente:
 *   1. `apps/api/.env.local` preenchido com credenciais reais do Aiven;
 *   2. DATABASE_ENV=development e DATABASE_NAME=finanhouse_dev (nunca produção);
 *   3. migrations 0000 e 0001 já aplicadas;
 *   4. todas as seis tabelas vazias antes de começar;
 *   5. `CONFIRM_HTTP_SMOKE=true` definido explicitamente no ambiente;
 *   6. autorização explícita do proprietário do projeto para esta execução.
 *
 * Uso: CONFIRM_HTTP_SMOKE=true npm run db:smoke:http
 *
 * Segue o mesmo padrão de `db-smoke-repositories.ts` (Bloco 14): sem porta
 * própria para `users`/`households`, dados sintéticos inseridos via Drizzle
 * direto; `categories`/`household_members` só são lidos através dos
 * repositórios reais (agora indiretamente, através das rotas HTTP).
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import type { ResultSetHeader } from 'mysql2/promise'
import { DatabaseConfigError, resolveDatabaseConfig } from '../src/config/database-config.js'
import { categorizeConnectionError } from '../src/db/sanitize-error.js'
import { EXPECTED_APPLICATION_TABLES, MIGRATIONS_TABLE_NAME } from '../src/db/schema-audit.js'
import { categories, householdMembers, households, users } from '../src/db/schema/index.js'
import {
  assertNoResidualData,
  assertSmokeEnvironmentAllowed,
  assertSmokeMigrationsPresent,
  assertSmokeStartingEmpty,
  SmokeGuardError,
} from '../src/db/smoke-repositories-guard.js'
import { createHttpApp } from '../src/http/app.js'
import { createDrizzleRepositories } from '../src/infrastructure/repositories/drizzle/index.js'
import type { DrizzleDb } from '../src/infrastructure/repositories/drizzle/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../.env.local')

/** Sinaliza sucesso do cenário completo — nunca deve chegar a um `COMMIT`. */
class SmokeRollbackSignal extends Error {}

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(ENV_LOCAL_PATH)
  } catch {
    console.error(`Arquivo de credenciais não encontrado: ${ENV_LOCAL_PATH}`)
    process.exit(1)
  }
}

async function readRowCounts(connection: mysql.Connection): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const table of EXPECTED_APPLICATION_TABLES) {
    const [rows] = (await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``)) as [
      Array<{ total: number }>,
      unknown,
    ]
    counts[table] = Number(rows[0]?.total ?? 0)
  }
  return counts
}

async function main(): Promise<void> {
  if (process.env.CONFIRM_HTTP_SMOKE !== 'true') {
    console.error(
      '\nCONFIRM_HTTP_SMOKE=true é obrigatório para executar o smoke-test transacional da API HTTP.\n' +
        'Sem essa confirmação explícita, nenhuma conexão é aberta e nenhuma transação é iniciada.',
    )
    process.exit(1)
  }

  loadLocalEnv()

  let config
  try {
    config = resolveDatabaseConfig(process.env)
  } catch (error) {
    const message = error instanceof DatabaseConfigError ? error.message : 'Configuração de banco inválida.'
    console.error(`\nConfiguração inválida: ${message}`)
    process.exit(1)
  }

  try {
    assertSmokeEnvironmentAllowed({
      environment: config.environment,
      database: config.database,
      confirmFlag: process.env.CONFIRM_HTTP_SMOKE,
    })
  } catch (error) {
    const message = error instanceof SmokeGuardError ? error.message : 'Ambiente não permitido para o smoke-test.'
    console.error(`\n${message}`)
    process.exit(1)
  }

  console.log(`Provider: ${config.provider}`)
  console.log(`Ambiente: ${config.environment}`)
  console.log(`Banco: ${config.database}`)

  let connection: mysql.Connection | undefined
  try {
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
    })

    const [cipherRows] = (await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")) as [
      Array<{ Value: string }>,
      unknown,
    ]
    const tlsActive = (cipherRows[0]?.Value ?? '').length > 0
    console.log(`TLS ativo: ${tlsActive ? 'sim' : 'não'}`)
    if (!tlsActive) {
      throw new SmokeGuardError('TLS não está ativo na conexão — smoke-test abortado antes de qualquer escrita.')
    }

    const [migrationsRows] = (await connection.query(`SELECT \`hash\` FROM \`${MIGRATIONS_TABLE_NAME}\``)) as [
      Array<{ hash: string }>,
      unknown,
    ]
    assertSmokeMigrationsPresent({ migrationsRows })
    console.log(`Migrations registradas: ${migrationsRows.length}`)

    const initialCounts = await readRowCounts(connection)
    assertSmokeStartingEmpty({ rowCounts: initialCounts })
    console.log('Contagens iniciais: todas as seis tabelas vazias (confirmado).')

    const db = drizzle(connection)

    console.log('\nIniciando transação sintética...')
    try {
      await db.transaction(async (tx) => {
        const repositories = createDrizzleRepositories(tx as unknown as DrizzleDb)
        const app = createHttpApp({
          repositories,
          runtimeMode: 'development',
          logger: false,
          readiness: async () => ({
            ready: true,
            checks: { configResolved: true, poolAvailable: true, connectionOk: true, tlsActive: true },
          }),
        })

        // 1) Dados sintéticos de apoio (sem porta de repositório própria — ver DT-10):
        // dois households distintos, para exercitar isolamento e a rejeição de um
        // responsável de outro household.
        const [ownerUser] = (await tx
          .insert(users)
          .values({ displayName: 'Smoke HTTP Owner', email: 'smoke-http-owner@bloco16.invalid', status: 'active' })) as unknown as [
          ResultSetHeader,
          unknown,
        ]
        const ownerUserId = ownerUser.insertId

        const [householdA] = (await tx
          .insert(households)
          .values({ name: 'Smoke HTTP Household A', createdByUserId: ownerUserId })) as unknown as [ResultSetHeader, unknown]
        const householdAId = householdA.insertId

        const [householdB] = (await tx
          .insert(households)
          .values({ name: 'Smoke HTTP Household B', createdByUserId: ownerUserId })) as unknown as [ResultSetHeader, unknown]
        const householdBId = householdB.insertId

        const [memberA] = (await tx
          .insert(householdMembers)
          .values({ householdId: householdAId, userId: ownerUserId, role: 'owner', status: 'active' })) as unknown as [
          ResultSetHeader,
          unknown,
        ]
        const memberAId = memberA.insertId

        const [memberB] = (await tx
          .insert(householdMembers)
          .values({ householdId: householdBId, userId: ownerUserId, role: 'owner', status: 'active' })) as unknown as [
          ResultSetHeader,
          unknown,
        ]
        const memberBId = memberB.insertId

        const [categoryA] = (await tx
          .insert(categories)
          .values({ householdId: householdAId, name: 'Smoke HTTP Categoria', entryType: 'expense', status: 'active' })) as unknown as [
          ResultSetHeader,
          unknown,
        ]
        const categoryAId = categoryA.insertId

        // 2) Health check via HTTP real (in-process, sem socket).
        const health = await app.inject({ method: 'GET', url: '/health' })
        console.log(`GET /health: ${health.statusCode === 200 ? 'aprovado' : 'reprovado'}`)
        if (health.statusCode !== 200) throw new Error('Smoke-test reprovado: GET /health não retornou 200.')

        // 3) Criação de competência via HTTP (PUT idempotente).
        const putPeriod = await app.inject({
          method: 'PUT',
          url: `/api/v1/households/${householdAId}/periods/2026-07-01`,
          payload: {},
        })
        console.log(`PUT .../periods/2026-07-01: ${putPeriod.statusCode === 201 ? 'aprovado' : 'reprovado'}`)
        if (putPeriod.statusCode !== 201) throw new Error('Smoke-test reprovado: criação de competência via HTTP falhou.')
        const periodId = putPeriod.json().data.id as number

        // 4) Criação de movimentação sem responsável, via HTTP — leitura após escrita.
        const createEntry = await app.inject({
          method: 'POST',
          url: `/api/v1/households/${householdAId}/entries`,
          payload: {
            periodId,
            categoryId: categoryAId,
            createdByUserId: ownerUserId,
            entryType: 'expense',
            description: 'Movimentação sintética HTTP sem responsável',
            expectedAmount: '10.00',
          },
        })
        console.log(`POST .../entries (sem responsável): ${createEntry.statusCode === 201 ? 'aprovado' : 'reprovado'}`)
        if (createEntry.statusCode !== 201) throw new Error('Smoke-test reprovado: criação de movimentação via HTTP falhou.')
        const entryId = createEntry.json().data.id as number
        const moneyAsStringOk = createEntry.json().data.expectedAmount === '10.00'
        console.log(`Dinheiro retornado como string decimal: ${moneyAsStringOk ? 'sim' : 'não'}`)

        const readAfterWrite = await app.inject({ method: 'GET', url: `/api/v1/households/${householdAId}/entries/${entryId}` })
        console.log(`Leitura após escrita: ${readAfterWrite.statusCode === 200 ? 'aprovada' : 'reprovada'}`)

        // 5) Movimentação com responsável do MESMO household — DTO nunca expõe a coluna auxiliar.
        const createWithMember = await app.inject({
          method: 'POST',
          url: `/api/v1/households/${householdAId}/entries`,
          payload: {
            periodId,
            categoryId: categoryAId,
            responsibleMemberId: memberAId,
            createdByUserId: ownerUserId,
            entryType: 'expense',
            description: 'Movimentação sintética HTTP com responsável',
            expectedAmount: '20.00',
          },
        })
        const memberEntryOk = createWithMember.statusCode === 201
        const dtoBody = createWithMember.body
        const dtoLeaksAuxiliaryColumn = dtoBody.includes('responsibleMemberHouseholdId')
        console.log(`Movimentação com responsável do mesmo household: ${memberEntryOk ? 'aprovada' : 'reprovada'}`)
        console.log(`DTO expõe coluna auxiliar: ${dtoLeaksAuxiliaryColumn ? 'sim (falha)' : 'não (esperado)'}`)
        if (!memberEntryOk || dtoLeaksAuxiliaryColumn) {
          throw new Error('Smoke-test reprovado: movimentação com responsável ou vazamento de coluna auxiliar no DTO.')
        }

        // 6) Tentativa de responsável de OUTRO household — deve ser rejeitada (conflito de domínio, HTTP).
        const crossHousehold = await app.inject({
          method: 'POST',
          url: `/api/v1/households/${householdAId}/entries`,
          payload: {
            periodId,
            categoryId: categoryAId,
            responsibleMemberId: memberBId,
            createdByUserId: ownerUserId,
            entryType: 'expense',
            description: 'Tentativa inválida via HTTP',
            expectedAmount: '30.00',
          },
        })
        const crossHouseholdRejected = crossHousehold.statusCode === 409
        console.log(`Isolamento por household (responsável de outro household rejeitado via HTTP): ${crossHouseholdRejected ? 'aprovado' : 'reprovado'}`)
        if (!crossHouseholdRejected) {
          throw new Error('Smoke-test reprovado: responsável de outro household não foi rejeitado pela API.')
        }

        // 7) Isolamento de leitura entre households via HTTP.
        const listHouseholdA = await app.inject({ method: 'GET', url: `/api/v1/households/${householdAId}/entries` })
        const listHouseholdB = await app.inject({ method: 'GET', url: `/api/v1/households/${householdBId}/entries` })
        const readIsolationOk = listHouseholdA.json().data.length === 2 && listHouseholdB.json().data.length === 0
        console.log(`Isolamento por household (leitura via HTTP): ${readIsolationOk ? 'aprovado' : 'reprovado'}`)
        if (!readIsolationOk) {
          throw new Error('Smoke-test reprovado: listagem HTTP vazou dado entre households.')
        }

        // 8) Transição suportada via HTTP (mark-pending).
        const markPending = await app.inject({ method: 'POST', url: `/api/v1/households/${householdAId}/entries/${entryId}/mark-pending` })
        const transitionOk = markPending.statusCode === 200 && markPending.json().data.status === 'pending'
        console.log(`Transição suportada via HTTP (planned → pending): ${transitionOk ? 'aprovada' : 'reprovada'}`)

        await app.close()

        // 9) Rollback intencional — nunca um commit.
        throw new SmokeRollbackSignal('rollback intencional do smoke-test HTTP — nenhum dado deve persistir')
      })
    } catch (error) {
      if (!(error instanceof SmokeRollbackSignal)) throw error
      console.log('\nRollback intencional executado com sucesso — nenhum dado deve ter persistido.')
    }

    const finalCounts = await readRowCounts(connection)
    assertNoResidualData({ before: initialCounts, after: finalCounts })
    console.log('Contagens finais: idênticas às iniciais (nenhum dado residual).')
    console.log('\nSmoke-test da API HTTP aprovado.')
  } catch (error) {
    if (error instanceof SmokeGuardError) {
      console.error(`\nSmoke-test reprovado: ${error.message}`)
      process.exitCode = 1
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\nFalha no smoke-test. Categoria: ${categorizeConnectionError(message)}`)
    process.exitCode = 1
  } finally {
    await connection?.end()
  }
}

main()
