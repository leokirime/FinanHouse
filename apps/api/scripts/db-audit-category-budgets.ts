/**
 * Auditoria somente leitura da migration `category_budgets` (Bloco 18,
 * DT-13), antes e depois de sua aplicação. Diferente de `db-audit-schema.ts`
 * (que assume banco vazio pós-migration): este banco já tem household,
 * usuários, membros e categorias reais do bootstrap do Bloco 17 — a
 * auditoria confirma que essas seis tabelas permanecem com as MESMAS
 * contagens antes/depois, que `category_budgets` passa a existir vazia, e
 * que o journal ganha exatamente uma migration nova. Nunca executa DDL/DML —
 * apenas `information_schema` e `SELECT`/`SELECT COUNT(*)`. Nenhum dado
 * pessoal ou financeiro é impresso — apenas nomes de tabela e contagens.
 *
 * NÃO é executado automaticamente.
 *
 * Uso:
 *   npm run db:audit:category-budgets -- --phase=before
 *   npm run db:audit:category-budgets -- --phase=after
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { DatabaseConfigError, resolveDatabaseConfig } from '../src/config/database-config.js'
import {
  assertCategoryBudgetsAfterState,
  assertCategoryBudgetsAuditEnvironmentAllowed,
  assertCategoryBudgetsBeforeState,
  assertPreExistingCountsPreserved,
  CategoryBudgetsAuditError,
  PRE_EXISTING_APPLICATION_TABLES,
} from '../src/db/category-budgets-audit.js'
import { MIGRATIONS_TABLE_NAME } from '../src/db/schema-audit.js'
import { categorizeConnectionError } from '../src/db/sanitize-error.js'
import { parseAuditPhase, SchemaAuditError } from '../src/db/schema-audit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../.env.local')
const SNAPSHOT_PATH = path.join(tmpdir(), 'finanhouse-category-budgets-audit-before.json')

interface BeforeSnapshot {
  rowCounts: Record<string, number>
}

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(ENV_LOCAL_PATH)
  } catch {
    console.error(`Arquivo de credenciais não encontrado: ${ENV_LOCAL_PATH}`)
    process.exit(1)
  }
}

async function readRowCounts(connection: mysql.Connection, tables: readonly string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const table of tables) {
    const [rows] = (await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``)) as [Array<{ total: number }>, unknown]
    counts[table] = Number(rows[0]?.total ?? 0)
  }
  return counts
}

async function main(): Promise<void> {
  let phase
  try {
    phase = parseAuditPhase(process.argv.slice(2))
  } catch (error) {
    const message = error instanceof SchemaAuditError ? error.message : 'Fase de auditoria inválida.'
    console.error(`\n${message}`)
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
    assertCategoryBudgetsAuditEnvironmentAllowed({ environment: config.environment, database: config.database })
  } catch (error) {
    const message = error instanceof CategoryBudgetsAuditError ? error.message : 'Ambiente não permitido para auditoria.'
    console.error(`\n${message}`)
    process.exit(1)
  }

  console.log(`Fase: ${phase}`)
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

    const [cipherRows] = (await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")) as [Array<{ Value: string }>, unknown]
    const tlsActive = (cipherRows[0]?.Value ?? '').length > 0
    console.log(`TLS ativo: ${tlsActive ? 'sim' : 'não'}`)

    const [tableRows] = (await connection.query(
      'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
    )) as [Array<{ name: string }>, unknown]
    const existingTables = tableRows.map((row) => row.name)
    const existingApplicationTables = [...PRE_EXISTING_APPLICATION_TABLES, 'category_budgets'].filter((table) =>
      existingTables.includes(table),
    )
    const migrationsTableExists = existingTables.includes(MIGRATIONS_TABLE_NAME)
    const migrationsRows = migrationsTableExists
      ? ((await connection.query(`SELECT \`hash\` FROM \`${MIGRATIONS_TABLE_NAME}\``))[0] as Array<{ hash: string }>)
      : []

    if (phase === 'before') {
      assertCategoryBudgetsBeforeState({ existingApplicationTables, migrationsRows })
      const rowCounts = await readRowCounts(connection, PRE_EXISTING_APPLICATION_TABLES)
      const snapshot: BeforeSnapshot = { rowCounts }
      writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot), 'utf8')
      console.log(`Tabelas pré-existentes confirmadas: ${PRE_EXISTING_APPLICATION_TABLES.length}/${PRE_EXISTING_APPLICATION_TABLES.length}`)
      console.log('Tabela category_budgets: ausente (esperado)')
      console.log(`Migrations registradas: ${migrationsRows.length} (esperado: 2)`)
      console.log('\nAuditoria "before" aprovada — snapshot de contagens salvo para comparação em "after".')
      return
    }

    if (!existsSync(SNAPSHOT_PATH)) {
      throw new CategoryBudgetsAuditError(`Snapshot "before" não encontrado (${SNAPSHOT_PATH}) — execute --phase=before antes de --phase=after.`)
    }
    const before = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as BeforeSnapshot

    const categoryBudgetsRowCount = existingApplicationTables.includes('category_budgets')
      ? (await readRowCounts(connection, ['category_budgets']))['category_budgets']!
      : -1

    assertCategoryBudgetsAfterState({ existingApplicationTables, migrationsRows, categoryBudgetsRowCount })

    const after = await readRowCounts(connection, PRE_EXISTING_APPLICATION_TABLES)
    assertPreExistingCountsPreserved(before.rowCounts, after)

    unlinkSync(SNAPSHOT_PATH)

    console.log(`Tabelas da aplicação presentes: ${PRE_EXISTING_APPLICATION_TABLES.length + 1}/${PRE_EXISTING_APPLICATION_TABLES.length + 1}`)
    console.log(`Migrations registradas: ${migrationsRows.length} (esperado: 3)`)
    console.log('category_budgets: vazia (esperado)')
    console.log('Contagens das seis tabelas estruturais: preservadas (idênticas ao "before")')
    console.log('\nAuditoria "after" aprovada: migration de category_budgets aplicada sem afetar dados existentes.')
  } catch (error) {
    if (error instanceof CategoryBudgetsAuditError) {
      console.error(`\nAuditoria reprovada: ${error.message}`)
      process.exitCode = 1
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\nFalha na auditoria. Categoria: ${categorizeConnectionError(message)}`)
    process.exitCode = 1
  } finally {
    await connection?.end()
  }
}

main()
