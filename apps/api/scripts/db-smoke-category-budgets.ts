/**
 * Smoke-test transacional específico da persistência de limites mensais por
 * categoria (`category_budgets`, Bloco 18, DT-13) contra o banco
 * `finanhouse_dev` (Aiven). Diferente de `db-smoke-repositories.ts`/
 * `db-smoke-http.ts` (Bloco 14/16), que exigem as seis tabelas estruturais
 * vazias, este smoke roda **depois** do bootstrap estrutural do Bloco 17 —
 * o banco já tem household/usuários/membros/categorias/competência reais.
 * Por isso não reusa `assertSmokeStartingEmpty`: só confirma que as
 * contagens de TODAS as tabelas (as seis estruturais + `category_budgets`)
 * são idênticas antes e depois do rollback (`assertNoResidualData`), o
 * mesmo raciocínio de `db-audit-category-budgets.ts`.
 *
 * Cria um household sintético totalmente novo dentro de uma única
 * transação, exercita o repositório Drizzle real de `CategoryBudget` e as
 * rotas HTTP de budgets via `app.inject()` (sem socket de rede), e sempre
 * executa ROLLBACK ao final — nunca commit. Não usa seed, não insere dado
 * real, não altera schema nem migrations.
 *
 * NÃO é executado automaticamente. Exige simultaneamente:
 *   1. `apps/api/.env.local` preenchido com credenciais reais do Aiven;
 *   2. DATABASE_ENV=development e DATABASE_NAME=finanhouse_dev (nunca produção);
 *   3. migration `0002_category_budgets.sql` já aplicada;
 *   4. `CONFIRM_CATEGORY_BUDGETS_SMOKE=true` definido explicitamente no ambiente;
 *   5. autorização explícita do proprietário do projeto para esta execução.
 *
 * Uso: CONFIRM_CATEGORY_BUDGETS_SMOKE=true npm run db:smoke:category-budgets
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
import { categories, householdMembers, households, monthlyPeriods, users } from '../src/db/schema/index.js'
import { assertNoResidualData, assertSmokeEnvironmentAllowed, assertSmokeMigrationsPresent, SmokeGuardError } from '../src/db/smoke-repositories-guard.js'
import { createHttpApp } from '../src/http/app.js'
import { createDrizzleRepositories, HouseholdScopeViolationError } from '../src/infrastructure/repositories/drizzle/index.js'
import type { DrizzleDb } from '../src/infrastructure/repositories/drizzle/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../.env.local')
const ALL_TABLES = [...EXPECTED_APPLICATION_TABLES, 'category_budgets'] as const

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
  for (const table of ALL_TABLES) {
    const [rows] = (await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``)) as [Array<{ total: number }>, unknown]
    counts[table] = Number(rows[0]?.total ?? 0)
  }
  return counts
}

async function main(): Promise<void> {
  if (process.env.CONFIRM_CATEGORY_BUDGETS_SMOKE !== 'true') {
    console.error(
      '\nCONFIRM_CATEGORY_BUDGETS_SMOKE=true é obrigatório para executar o smoke-test transacional de category_budgets.\n' +
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
      confirmFlag: process.env.CONFIRM_CATEGORY_BUDGETS_SMOKE,
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
  let initialCounts: Record<string, number> = {}
  try {
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
    })

    const [cipherRows] = (await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")) as [Array<{ Value: string }>, unknown]
    const tlsActive = (cipherRows[0]?.Value ?? '').length > 0
    console.log(`TLS ativo: ${tlsActive ? 'sim' : 'não'}`)
    if (!tlsActive) {
      throw new SmokeGuardError('TLS não está ativo na conexão — smoke-test abortado antes de qualquer escrita.')
    }

    const [migrationsRows] = (await connection.query(`SELECT \`hash\` FROM \`${MIGRATIONS_TABLE_NAME}\``)) as [Array<{ hash: string }>, unknown]
    assertSmokeMigrationsPresent({ migrationsRows })
    console.log(`Migrations registradas: ${migrationsRows.length}`)

    const [categoryBudgetsTableRows] = (await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'category_budgets'",
    )) as [Array<{ TABLE_NAME: string }>, unknown]
    if (categoryBudgetsTableRows.length === 0) {
      throw new SmokeGuardError('Tabela category_budgets não existe — a migration 0002 precisa estar aplicada antes deste smoke-test.')
    }

    initialCounts = await readRowCounts(connection)
    console.log(`Contagens iniciais (dado real do bootstrap preservado): ${JSON.stringify(initialCounts)}`)

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

        // 1) Household sintético totalmente novo, isolado do dado real do bootstrap.
        const [ownerUser] = (await tx
          .insert(users)
          .values({ displayName: 'Smoke Budgets Owner', email: 'smoke-budgets-owner@bloco18.invalid', status: 'active' })) as unknown as [
          ResultSetHeader,
          unknown,
        ]
        const ownerUserId = ownerUser.insertId

        const [householdA] = (await tx
          .insert(households)
          .values({ name: 'Smoke Budgets Household A', createdByUserId: ownerUserId })) as unknown as [ResultSetHeader, unknown]
        const householdAId = householdA.insertId

        const [householdB] = (await tx
          .insert(households)
          .values({ name: 'Smoke Budgets Household B', createdByUserId: ownerUserId })) as unknown as [ResultSetHeader, unknown]
        const householdBId = householdB.insertId

        await tx.insert(householdMembers).values({ householdId: householdAId, userId: ownerUserId, role: 'owner', status: 'active' })

        const [categoryA] = (await tx
          .insert(categories)
          .values({ householdId: householdAId, name: 'Smoke Budgets Categoria', entryType: 'expense', status: 'active' })) as unknown as [
          ResultSetHeader,
          unknown,
        ]
        const categoryAId = categoryA.insertId

        const [categoryB] = (await tx
          .insert(categories)
          .values({ householdId: householdBId, name: 'Smoke Budgets Categoria B', entryType: 'expense', status: 'active' })) as unknown as [
          ResultSetHeader,
          unknown,
        ]
        const categoryBId = categoryB.insertId

        const [period] = (await tx
          .insert(monthlyPeriods)
          .values({ householdId: householdAId, referenceMonth: '2026-07-01', status: 'open' })) as unknown as [ResultSetHeader, unknown]
        const periodId = period.insertId

        // 2) Repositório real: criação via `create()` (INSERT sem id, insertId nativo — DT-15), leitura após escrita.
        const created = await repositories.budgets.create({ householdId: householdAId, periodId, categoryId: categoryAId, limitAmount: 200000n })
        const budgetId = created.id
        console.log(`Repositório — criação (create(), insertId nativo): ${created.limitAmount === 200000n ? 'aprovada' : 'reprovada'}`)

        const reloaded = await repositories.budgets.findByHouseholdPeriodAndCategory(householdAId, periodId, categoryAId)
        console.log(`Repositório — leitura após escrita: ${reloaded?.id === budgetId ? 'aprovada' : 'reprovada'}`)
        if (reloaded?.id !== budgetId) throw new Error('Smoke-test reprovado: leitura após escrita do repositório falhou.')

        // 3) Repositório real: atualização (nunca cria implicitamente) via `update()` sobre `id` existente.
        const updated = await repositories.budgets.update({ ...reloaded, limitAmount: 350000n })
        console.log(`Repositório — atualização (update() nunca cria): ${updated.limitAmount === 350000n ? 'aprovada' : 'reprovada'}`)

        // 4) Rotas HTTP reais sobre a mesma transação.
        const listEmpty = await app.inject({ method: 'GET', url: `/api/v1/households/${householdBId}/periods/2026-07-01/budgets` })
        console.log(`GET .../budgets (household B, sem período aberto): status ${listEmpty.statusCode}`)

        const putBudget = await app.inject({
          method: 'PUT',
          url: `/api/v1/households/${householdAId}/periods/2026-07-01/budgets/${categoryAId}`,
          payload: { limitAmount: '400.00' },
        })
        console.log(`PUT .../budgets/:categoryId (atualiza limite existente): ${putBudget.statusCode === 200 ? 'aprovado' : 'reprovado'}`)
        if (putBudget.statusCode !== 200) throw new Error('Smoke-test reprovado: PUT de limite existente via HTTP não retornou 200.')

        const listAfterPut = await app.inject({ method: 'GET', url: `/api/v1/households/${householdAId}/periods/2026-07-01/budgets` })
        const listOk = listAfterPut.statusCode === 200 && listAfterPut.json().data.length === 1 && listAfterPut.json().data[0].limitAmount === '400.00'
        console.log(`GET .../budgets (lista contém o limite atualizado): ${listOk ? 'aprovado' : 'reprovado'}`)
        if (!listOk) throw new Error('Smoke-test reprovado: listagem HTTP não refletiu a atualização.')

        // 5) Isolamento por household via HTTP: categoria de outro household nunca é aceita (409, DT-09).
        const crossHousehold = await app.inject({
          method: 'PUT',
          url: `/api/v1/households/${householdAId}/periods/2026-07-01/budgets/${categoryBId}`,
          payload: { limitAmount: '100.00' },
        })
        const crossHouseholdRejected = crossHousehold.statusCode === 409
        console.log(`Isolamento por household (categoria de outro household rejeitada via HTTP): ${crossHouseholdRejected ? 'aprovado' : 'reprovado'}`)
        if (!crossHouseholdRejected) throw new Error('Smoke-test reprovado: categoria de outro household não foi rejeitada pela API.')

        // 6) Remoção via HTTP e confirmação de ausência.
        const deleteBudget = await app.inject({ method: 'DELETE', url: `/api/v1/households/${householdAId}/periods/2026-07-01/budgets/${categoryAId}` })
        console.log(`DELETE .../budgets/:categoryId: ${deleteBudget.statusCode === 204 ? 'aprovado' : 'reprovado'}`)

        const listAfterDelete = await app.inject({ method: 'GET', url: `/api/v1/households/${householdAId}/periods/2026-07-01/budgets` })
        const emptyAfterDelete = listAfterDelete.statusCode === 200 && listAfterDelete.json().data.length === 0
        console.log(`GET .../budgets (vazio após remoção): ${emptyAfterDelete ? 'aprovado' : 'reprovado'}`)
        if (!emptyAfterDelete) throw new Error('Smoke-test reprovado: limite continuou listado após DELETE.')

        // 7) Repositório real: `update()` sobre `id` de outro household é rejeitado (HouseholdScopeViolationError), nunca cria implicitamente.
        const secondBudget = await repositories.budgets.create({ householdId: householdAId, periodId, categoryId: categoryAId, limitAmount: 500000n })
        let crossHouseholdUpdateRejected = false
        try {
          await repositories.budgets.update({ id: secondBudget.id, householdId: householdBId, periodId, categoryId: categoryAId, limitAmount: 999999n })
        } catch (error) {
          crossHouseholdUpdateRejected = error instanceof HouseholdScopeViolationError
        }
        console.log(`Repositório — update() com household divergente do existente rejeitado: ${crossHouseholdUpdateRejected ? 'aprovado' : 'reprovado'}`)
        if (!crossHouseholdUpdateRejected) throw new Error('Smoke-test reprovado: update() não rejeitou household divergente do registro existente.')

        await app.close()

        // 8) Rollback intencional — nunca um commit.
        throw new SmokeRollbackSignal('rollback intencional do smoke-test de category_budgets — nenhum dado deve persistir')
      })
    } catch (error) {
      if (!(error instanceof SmokeRollbackSignal)) throw error
      console.log('\nRollback intencional executado com sucesso — nenhum dado deve ter persistido.')
    }

    const finalCounts = await readRowCounts(connection)
    assertNoResidualData({ before: initialCounts, after: finalCounts })
    console.log('Contagens finais: idênticas às iniciais em todas as tabelas, incluindo category_budgets (nenhum dado residual).')
    console.log('\nSmoke-test de category_budgets aprovado.')
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
