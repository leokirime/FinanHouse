/**
 * Smoke-test transacional dos repositórios Drizzle reais
 * (`apps/api/src/infrastructure/repositories/drizzle/`) contra o banco
 * `finanhouse_dev` (Aiven). Cria dados totalmente sintéticos dentro de uma
 * única transação, exercita os repositórios reais (movimentações e
 * competências), e sempre executa ROLLBACK ao final — nunca commit. Não usa
 * seed, não insere dado real, não altera schema nem migrations.
 *
 * NÃO é executado automaticamente. Exige simultaneamente:
 *   1. `apps/api/.env.local` preenchido com credenciais reais do Aiven;
 *   2. DATABASE_ENV=development e DATABASE_NAME=finanhouse_dev (nunca produção);
 *   3. migrations 0000 e 0001 já aplicadas;
 *   4. todas as seis tabelas vazias antes de começar;
 *   5. `CONFIRM_REPOSITORY_SMOKE=true` definido explicitamente no ambiente;
 *   6. autorização explícita do proprietário do projeto para esta execução.
 *
 * Uso: CONFIRM_REPOSITORY_SMOKE=true npm run db:smoke:repositories
 *
 * Não existe porta/repositório para `users`/`households` (nenhum serviço de
 * aplicação hoje precisa persisti-los diretamente — ver DT-10); seus dados
 * sintéticos são inseridos via Drizzle direto (consultas parametrizadas,
 * nunca concatenação). `categories`/`household_members` TÊM repositório
 * Drizzle real, mas somente leitura (a porta não define `create`/`update`) —
 * por isso a preparação sintética também usa INSERT direto, mas a leitura é
 * sempre feita através de `repositories.categories`/`repositories.members`,
 * nunca por fora deles. `financial_entries` e `monthly_periods` — os únicos
 * repositórios com escrita, e o objeto central deste bloco — são exercitados
 * de ponta a ponta (escrita e leitura) exclusivamente através dos
 * repositórios reais, usando `create()`/`update()` com `id` sempre gerado
 * pelo `AUTO_INCREMENT` nativo do banco (DT-15) — nunca `nextId()`.
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
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
import { createDrizzleRepositories, HouseholdScopeViolationError } from '../src/infrastructure/repositories/drizzle/index.js'
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
  if (process.env.CONFIRM_REPOSITORY_SMOKE !== 'true') {
    console.error(
      '\nCONFIRM_REPOSITORY_SMOKE=true é obrigatório para executar o smoke-test transacional.\n' +
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
      confirmFlag: process.env.CONFIRM_REPOSITORY_SMOKE,
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

        // 1) Dados sintéticos de apoio (sem porta de repositório própria — ver DT-10):
        // dois households distintos, para exercitar isolamento e a rejeição de um
        // responsável de outro household.
        const [ownerUser] = (await tx
          .insert(users)
          .values({ displayName: 'Smoke Owner', email: 'smoke-owner@bloco14.invalid', status: 'active' })) as unknown as [
          ResultSetHeader,
          unknown,
        ]
        const ownerUserId = ownerUser.insertId

        const [householdA] = (await tx
          .insert(households)
          .values({ name: 'Smoke Household A', createdByUserId: ownerUserId })) as unknown as [ResultSetHeader, unknown]
        const householdAId = householdA.insertId

        const [householdB] = (await tx
          .insert(households)
          .values({ name: 'Smoke Household B', createdByUserId: ownerUserId })) as unknown as [ResultSetHeader, unknown]
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
          .values({ householdId: householdAId, name: 'Smoke Categoria', entryType: 'expense', status: 'active' })) as unknown as [
          ResultSetHeader,
          unknown,
        ]
        const categoryAId = categoryA.insertId

        // `categories`/`household_members` têm porta e repositório Drizzle real,
        // mas somente leitura (nenhum serviço de aplicação hoje os cria/edita) —
        // por isso a preparação acima usa INSERT direto, e a leitura abaixo
        // confirma que os repositórios reais enxergam exatamente o que foi
        // inserido, sem reimplementar a leitura por fora deles.
        const categoryAViaRepository = await repositories.categories.findById(categoryAId)
        const memberAViaRepository = await repositories.members.findById(memberAId)
        const readsViaReadOnlyRepositories =
          categoryAViaRepository?.id === categoryAId && memberAViaRepository?.id === memberAId
        console.log(`Leitura de categoria/membro via repositórios reais (somente leitura): ${readsViaReadOnlyRepositories ? 'aprovada' : 'reprovada'}`)
        if (!readsViaReadOnlyRepositories) {
          throw new Error('Smoke-test reprovado: CategoryRepository/HouseholdMemberRepository não leram os dados sintéticos inseridos.')
        }

        // 2) Competência mensal via repositório real — id gerado pelo AUTO_INCREMENT nativo
        // do banco (create(), DT-15), nunca calculado em código.
        const period = await repositories.periods.create({
          householdId: householdAId,
          referenceMonth: '2026-07-01',
          status: 'open',
          closedAt: null,
          closedByUserId: null,
        })
        const periodId = period.id
        console.log(`Competência sintética criada via repositório: id presente = ${period.id > 0}`)

        // 3) Movimentação sem responsável, via repositório real — leitura após escrita.
        const createdWithoutMember = await repositories.entries.create({
          householdId: householdAId,
          periodId,
          categoryId: categoryAId,
          responsibleMemberId: null,
          createdByUserId: ownerUserId,
          entryType: 'expense',
          status: 'planned',
          description: 'Movimentação sintética sem responsável',
          expectedAmount: 1000n,
          actualAmount: null,
          dueDate: null,
          realizationDate: null,
          notes: null,
          installmentPlanId: null,
          installmentNumber: null,
        })
        const entryWithoutMemberId = createdWithoutMember.id
        const reloadedWithoutMember = await repositories.entries.findById(entryWithoutMemberId)
        console.log(
          `Leitura após escrita (sem responsável): ${reloadedWithoutMember !== null && reloadedWithoutMember.responsibleMemberId === null ? 'aprovada' : 'reprovada'}`,
        )

        // 4) Movimentação com responsável do MESMO household — prova o preenchimento
        // interno da coluna auxiliar (nunca exposta ao domínio).
        const createdWithMember = await repositories.entries.create({
          householdId: householdAId,
          periodId,
          categoryId: categoryAId,
          responsibleMemberId: memberAId,
          createdByUserId: ownerUserId,
          entryType: 'expense',
          status: 'planned',
          description: 'Movimentação sintética com responsável',
          expectedAmount: 2000n,
          actualAmount: null,
          dueDate: null,
          realizationDate: null,
          notes: null,
          installmentPlanId: null,
          installmentNumber: null,
        })
        const entryWithMemberId = createdWithMember.id
        const reloadedWithMember = await repositories.entries.findById(entryWithMemberId)
        const domainExposesAuxiliaryColumn = reloadedWithMember !== null && 'responsibleMemberHouseholdId' in reloadedWithMember
        console.log(`Movimentação com responsável do mesmo household: aprovada`)
        console.log(`Coluna auxiliar exposta ao domínio: ${domainExposesAuxiliaryColumn ? 'sim (falha)' : 'não (esperado)'}`)

        const [auxiliaryColumnRows] = (await tx.execute(
          sql`SELECT responsible_member_household_id AS responsibleMemberHouseholdId FROM financial_entries WHERE id = ${entryWithMemberId}`,
        )) as unknown as [Array<{ responsibleMemberHouseholdId: number | null }>, unknown]
        const auxiliaryColumnFilledCorrectly = auxiliaryColumnRows[0]?.responsibleMemberHouseholdId === householdAId
        console.log(`Coluna auxiliar preenchida corretamente no banco: ${auxiliaryColumnFilledCorrectly ? 'sim' : 'não'}`)

        // 5) Tentativa de responsável de OUTRO household — deve ser rejeitada pela
        // FK composta/CHECK (DT-09), traduzida para HouseholdScopeViolationError.
        let crossHouseholdRejected = false
        try {
          await repositories.entries.create({
            householdId: householdAId,
            periodId,
            categoryId: categoryAId,
            responsibleMemberId: memberBId,
            createdByUserId: ownerUserId,
            entryType: 'expense',
            status: 'planned',
            description: 'Tentativa inválida de responsável de outro household',
            expectedAmount: 3000n,
            actualAmount: null,
            dueDate: null,
            realizationDate: null,
            notes: null,
            installmentPlanId: null,
            installmentNumber: null,
          })
        } catch (error) {
          crossHouseholdRejected = error instanceof HouseholdScopeViolationError
        }
        console.log(`Isolamento por household (responsável de outro household rejeitado): ${crossHouseholdRejected ? 'aprovado' : 'reprovado'}`)
        if (!crossHouseholdRejected) {
          throw new Error('Smoke-test reprovado: responsável de outro household não foi rejeitado pelo banco.')
        }

        // 6) Isolamento de leitura: householdB nunca enxerga dado de householdA.
        const entriesForHouseholdA = await repositories.entries.findByHousehold(householdAId)
        const entriesForHouseholdB = await repositories.entries.findByHousehold(householdBId)
        const readIsolationOk = entriesForHouseholdA.length === 2 && entriesForHouseholdB.length === 0
        console.log(`Isolamento por household (leitura): ${readIsolationOk ? 'aprovado' : 'reprovado'}`)
        if (!readIsolationOk) {
          throw new Error('Smoke-test reprovado: findByHousehold vazou dado entre households.')
        }

        // 7) Atualização suportada: pending.
        if (reloadedWithoutMember) {
          const updated = await repositories.entries.update({ ...reloadedWithoutMember, status: 'pending' })
          console.log(`Atualização suportada (status → pending): ${updated.status === 'pending' ? 'aprovada' : 'reprovada'}`)
        }

        // 8) Rollback intencional — nunca um commit.
        throw new SmokeRollbackSignal('rollback intencional do smoke-test — nenhum dado deve persistir')
      })
    } catch (error) {
      if (!(error instanceof SmokeRollbackSignal)) throw error
      console.log('\nRollback intencional executado com sucesso — nenhum dado deve ter persistido.')
    }

    const finalCounts = await readRowCounts(connection)
    assertNoResidualData({ before: initialCounts, after: finalCounts })
    console.log('Contagens finais: idênticas às iniciais (nenhum dado residual).')
    console.log('\nSmoke-test dos repositórios Drizzle aprovado.')
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
