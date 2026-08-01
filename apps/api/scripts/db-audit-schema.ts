/**
 * Auditoria somente leitura do schema remoto de `finanhouse_dev`, antes e
 * depois da aplicação da migration inicial. Nunca executa DDL/DML — apenas
 * `information_schema` e `SELECT`/`SELECT COUNT(*)`. Uma única conexão,
 * fechada em `finally`.
 *
 * NÃO é executado automaticamente.
 *
 * Uso:
 *   npm run db:audit:schema -- --phase=before
 *   npm run db:audit:schema -- --phase=after
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { DatabaseConfigError, resolveDatabaseConfig } from '../src/config/database-config.js'
import {
  assertAfterState,
  assertAuditEnvironmentAllowed,
  assertBeforeState,
  EXPECTED_APPLICATION_TABLES,
  MIGRATIONS_TABLE_NAME,
  parseAuditPhase,
  SchemaAuditError,
} from '../src/db/schema-audit.js'
import { categorizeConnectionError } from './lib/sanitize-error.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../.env.local')

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(ENV_LOCAL_PATH)
  } catch {
    console.error(`Arquivo de credenciais não encontrado: ${ENV_LOCAL_PATH}`)
    process.exit(1)
  }
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
    assertAuditEnvironmentAllowed({ environment: config.environment, database: config.database })
  } catch (error) {
    const message = error instanceof SchemaAuditError ? error.message : 'Ambiente não permitido para auditoria.'
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

    const [cipherRows] = (await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")) as [
      Array<{ Value: string }>,
      unknown,
    ]
    const tlsActive = (cipherRows[0]?.Value ?? '').length > 0
    console.log(`TLS ativo: ${tlsActive ? 'sim' : 'não'}`)

    const [tableRows] = (await connection.query(
      'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()',
    )) as [Array<{ name: string }>, unknown]
    const existingTables = tableRows.map((row) => row.name)
    const existingApplicationTables = EXPECTED_APPLICATION_TABLES.filter((table) => existingTables.includes(table))
    const migrationsTableExists = existingTables.includes(MIGRATIONS_TABLE_NAME)

    if (phase === 'before') {
      assertBeforeState({ existingApplicationTables, migrationsTableExists })
      console.log(`Tabelas da aplicação presentes: ${existingApplicationTables.length}/${EXPECTED_APPLICATION_TABLES.length}`)
      console.log(`Journal de migration presente: ${migrationsTableExists ? 'sim' : 'não'}`)
      console.log('\nAuditoria "before" aprovada: banco vazio, pronto para a migration inicial.')
      return
    }

    let migrationsRows: Array<{ hash: string }> = []
    if (migrationsTableExists) {
      const [rows] = (await connection.query(`SELECT \`hash\` FROM \`${MIGRATIONS_TABLE_NAME}\``)) as [
        Array<{ hash: string }>,
        unknown,
      ]
      migrationsRows = rows
    }

    const rowCounts: Record<string, number> = {}
    for (const table of existingApplicationTables) {
      const [countRows] = (await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``)) as [
        Array<{ total: number }>,
        unknown,
      ]
      rowCounts[table] = Number(countRows[0]?.total ?? 0)
    }

    assertAfterState({ existingApplicationTables, migrationsRows, rowCounts })

    console.log(`Tabelas da aplicação presentes: ${existingApplicationTables.length}/${EXPECTED_APPLICATION_TABLES.length}`)
    console.log(`Migrations registradas no journal: ${migrationsRows.length}`)
    console.log('Todas as tabelas da aplicação com zero registros: sim')
    console.log('\nAuditoria "after" aprovada: schema completo, sem dados.')
  } catch (error) {
    if (error instanceof SchemaAuditError) {
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
