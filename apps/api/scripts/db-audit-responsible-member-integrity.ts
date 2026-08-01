/**
 * Auditoria somente leitura da correção de integridade do membro
 * responsável (`financial_entries.responsible_member_id`), antes e depois
 * da migration incremental `0001_responsible_member_household_integrity`.
 * Nunca executa DDL/DML — apenas `information_schema` e
 * `SELECT`/`SELECT COUNT(*)`. Uma única conexão, fechada em `finally`.
 *
 * NÃO é executado automaticamente.
 *
 * Uso:
 *   npm run db:audit:responsible-member -- --phase=before
 *   npm run db:audit:responsible-member -- --phase=after
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { DatabaseConfigError, resolveDatabaseConfig } from '../src/config/database-config.js'
import {
  assertAuditEnvironmentAllowed,
  assertResponsibleMemberAfterState,
  assertResponsibleMemberBeforeState,
  AUXILIARY_COLUMN_NAME,
  CHECK_CONSTRAINT_NAME,
  CHILD_INDEX_NAME,
  NEW_COMPOSITE_FK_NAME,
  OLD_SIMPLE_FK_NAME,
  parseAuditPhase,
  PARENT_UNIQUE_INDEX_NAME,
  SchemaAuditError,
} from '../src/db/responsible-member-integrity-audit.js'
import { EXPECTED_APPLICATION_TABLES, MIGRATIONS_TABLE_NAME } from '../src/db/schema-audit.js'
import { categorizeConnectionError } from '../src/db/sanitize-error.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../.env.local')

const APPLICATION_TABLE = 'financial_entries'
const PARENT_TABLE = 'household_members'

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

    const [auxiliaryColumnRows] = (await connection.query(
      'SELECT IS_NULLABLE AS isNullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [APPLICATION_TABLE, AUXILIARY_COLUMN_NAME],
    )) as [Array<{ isNullable: string }>, unknown]
    const auxiliaryColumnExists = auxiliaryColumnRows.length > 0
    const auxiliaryColumnNullable = auxiliaryColumnRows[0]?.isNullable === 'YES'

    const [oldFkRows] = (await connection.query(
      "SELECT COUNT(*) AS total FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
      [APPLICATION_TABLE, OLD_SIMPLE_FK_NAME],
    )) as [Array<{ total: number }>, unknown]
    const oldSimpleForeignKeyExists = Number(oldFkRows[0]?.total ?? 0) > 0

    const [newFkRows] = (await connection.query(
      'SELECT DELETE_RULE AS deleteRule FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?',
      [APPLICATION_TABLE, NEW_COMPOSITE_FK_NAME],
    )) as [Array<{ deleteRule: string }>, unknown]
    const newCompositeForeignKeyExists = newFkRows.length > 0
    const newForeignKeyDeleteRule = newFkRows[0]?.deleteRule ?? null

    const [parentUniqueRows] = (await connection.query(
      "SELECT COUNT(*) AS total FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'UNIQUE'",
      [PARENT_TABLE, PARENT_UNIQUE_INDEX_NAME],
    )) as [Array<{ total: number }>, unknown]
    const parentUniqueIndexExists = Number(parentUniqueRows[0]?.total ?? 0) > 0

    const [childIndexRows] = (await connection.query(
      'SELECT COUNT(*) AS total FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
      [APPLICATION_TABLE, CHILD_INDEX_NAME],
    )) as [Array<{ total: number }>, unknown]
    const childIndexExists = Number(childIndexRows[0]?.total ?? 0) > 0

    const [checkRows] = (await connection.query(
      'SELECT COUNT(*) AS total FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?',
      [CHECK_CONSTRAINT_NAME],
    )) as [Array<{ total: number }>, unknown]
    const checkConstraintExists = Number(checkRows[0]?.total ?? 0) > 0

    if (phase === 'before') {
      assertResponsibleMemberBeforeState({
        existingApplicationTables,
        migrationsRows,
        rowCounts,
        auxiliaryColumnExists,
        oldSimpleForeignKeyExists,
        newCompositeForeignKeyExists,
      })
      console.log(`Migrations registradas: ${migrationsRows.length}`)
      console.log(`FK simples antiga presente: ${oldSimpleForeignKeyExists ? 'sim' : 'não'}`)
      console.log(`Coluna auxiliar presente: ${auxiliaryColumnExists ? 'sim' : 'não'}`)
      console.log('\nAuditoria "before" aprovada: estado pré-correção confirmado.')
      return
    }

    assertResponsibleMemberAfterState({
      existingApplicationTables,
      migrationsRows,
      rowCounts,
      auxiliaryColumnExists,
      auxiliaryColumnNullable,
      parentUniqueIndexExists,
      childIndexExists,
      oldSimpleForeignKeyExists,
      newCompositeForeignKeyExists,
      newForeignKeyDeleteRule,
      checkConstraintExists,
    })

    console.log(`Migrations registradas: ${migrationsRows.length}`)
    console.log(`Coluna auxiliar presente e nullable: ${auxiliaryColumnExists && auxiliaryColumnNullable ? 'sim' : 'não'}`)
    console.log(`FK composta presente, DELETE_RULE=${newForeignKeyDeleteRule}: ${newCompositeForeignKeyExists ? 'sim' : 'não'}`)
    console.log(`CHECK constraint presente: ${checkConstraintExists ? 'sim' : 'não'}`)
    console.log('\nAuditoria "after" aprovada: correção de integridade confirmada.')
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
