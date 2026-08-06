/**
 * Auditoria somente leitura da migration `auth_sessions` (Bloco 19, DT-14),
 * antes e depois de sua aplicação. Mesmo raciocínio de
 * `db-audit-category-budgets.ts` (Bloco 18): o banco já tem household,
 * usuários, membros, categorias e category_budgets reais — a auditoria
 * confirma que essas sete tabelas permanecem com as MESMAS contagens
 * antes/depois, que `auth_sessions` passa a existir vazia, que nenhum
 * usuário ganhou senha só pela migration (isso é responsabilidade exclusiva
 * de `db-configure-initial-passwords.ts`, autorização separada), e que o
 * journal ganha exatamente uma migration nova. Nunca executa DDL/DML —
 * apenas `information_schema` e `SELECT`/`SELECT COUNT(*)`. Nenhum dado
 * pessoal ou financeiro é impresso — apenas nomes de tabela e contagens.
 *
 * NÃO é executado automaticamente.
 *
 * Uso:
 *   npm run db:audit:auth-sessions -- --phase=before
 *   npm run db:audit:auth-sessions -- --phase=after
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { DatabaseConfigError, resolveDatabaseConfig } from '../src/config/database-config.js'
import {
  assertAuthSessionsAfterState,
  assertAuthSessionsAuditEnvironmentAllowed,
  assertAuthSessionsBeforeState,
  assertPreExistingCountsPreserved,
  AuthSessionsAuditError,
  PRE_EXISTING_APPLICATION_TABLES,
} from '../src/db/auth-sessions-audit.js'
import { MIGRATIONS_TABLE_NAME } from '../src/db/schema-audit.js'
import { categorizeConnectionError } from '../src/db/sanitize-error.js'
import { parseAuditPhase, SchemaAuditError } from '../src/db/schema-audit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../.env.local')
const SNAPSHOT_PATH = path.join(tmpdir(), 'finanhouse-auth-sessions-audit-before.json')

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
    assertAuthSessionsAuditEnvironmentAllowed({ environment: config.environment, database: config.database })
  } catch (error) {
    const message = error instanceof AuthSessionsAuditError ? error.message : 'Ambiente não permitido para auditoria.'
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
    const existingApplicationTables = [...PRE_EXISTING_APPLICATION_TABLES, 'auth_sessions'].filter((table) => existingTables.includes(table))
    const migrationsTableExists = existingTables.includes(MIGRATIONS_TABLE_NAME)
    const migrationsRows = migrationsTableExists
      ? ((await connection.query(`SELECT \`hash\` FROM \`${MIGRATIONS_TABLE_NAME}\``))[0] as Array<{ hash: string }>)
      : []

    if (phase === 'before') {
      assertAuthSessionsBeforeState({ existingApplicationTables, migrationsRows })
      const rowCounts = await readRowCounts(connection, PRE_EXISTING_APPLICATION_TABLES)
      const snapshot: BeforeSnapshot = { rowCounts }
      writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot), 'utf8')
      console.log(`Tabelas pré-existentes confirmadas: ${PRE_EXISTING_APPLICATION_TABLES.length}/${PRE_EXISTING_APPLICATION_TABLES.length}`)
      console.log('Tabela auth_sessions: ausente (esperado)')
      console.log(`Migrations registradas: ${migrationsRows.length} (esperado: 3)`)
      console.log('\nAuditoria "before" aprovada — snapshot de contagens salvo para comparação em "after".')
      return
    }

    if (!existsSync(SNAPSHOT_PATH)) {
      throw new AuthSessionsAuditError(`Snapshot "before" não encontrado (${SNAPSHOT_PATH}) — execute --phase=before antes de --phase=after.`)
    }
    const before = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as BeforeSnapshot

    const authSessionsRowCount = existingApplicationTables.includes('auth_sessions')
      ? (await readRowCounts(connection, ['auth_sessions']))['auth_sessions']!
      : -1

    const [passwordCountRows] = (await connection.query(
      'SELECT COUNT(*) AS total FROM `users` WHERE `password_hash` IS NOT NULL',
    )) as [Array<{ total: number }>, unknown]
    const usersWithPasswordConfiguredCount = Number(passwordCountRows[0]?.total ?? 0)

    assertAuthSessionsAfterState({ existingApplicationTables, migrationsRows, authSessionsRowCount, usersWithPasswordConfiguredCount })

    const after = await readRowCounts(connection, PRE_EXISTING_APPLICATION_TABLES)
    assertPreExistingCountsPreserved(before.rowCounts, after)

    unlinkSync(SNAPSHOT_PATH)

    console.log(`Tabelas da aplicação presentes: ${PRE_EXISTING_APPLICATION_TABLES.length + 1}/${PRE_EXISTING_APPLICATION_TABLES.length + 1}`)
    console.log(`Migrations registradas: ${migrationsRows.length} (esperado: 4)`)
    console.log('auth_sessions: vazia (esperado)')
    console.log('users com senha configurada: 0 (esperado — script de senhas é separado)')
    console.log('Contagens das sete tabelas estruturais: preservadas (idênticas ao "before")')
    console.log('\nAuditoria "after" aprovada: migration de auth_sessions aplicada sem afetar dados existentes.')
  } catch (error) {
    if (error instanceof AuthSessionsAuditError) {
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
