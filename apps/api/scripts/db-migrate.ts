/**
 * Aplica as migrations SQL versionadas em `database/migrations/` ao banco
 * Aiven configurado. NUNCA usar `drizzle-kit push` — apenas migrations
 * já revisadas manualmente e versionadas no repositório.
 *
 * NÃO é executado automaticamente. Exige:
 *   1. `apps/api/.env.local` preenchido com credenciais reais do Aiven;
 *   2. `CONFIRM_DATABASE_MIGRATION=true` definido explicitamente no ambiente;
 *   3. autorização explícita do proprietário do projeto para esta execução.
 *
 * Uso: CONFIRM_DATABASE_MIGRATION=true npm run db:migrate
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/mysql2'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import mysql from 'mysql2/promise'
import { DatabaseConfigError, resolveDatabaseConfig } from '../src/config/database-config.js'
import { categorizeConnectionError } from './lib/sanitize-error.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../.env.local')
const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../../database/migrations')

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(ENV_LOCAL_PATH)
  } catch {
    console.error(`Arquivo de credenciais não encontrado: ${ENV_LOCAL_PATH}`)
    process.exit(1)
  }
}

async function main(): Promise<void> {
  if (process.env.CONFIRM_DATABASE_MIGRATION !== 'true') {
    console.error(
      '\nCONFIRM_DATABASE_MIGRATION=true é obrigatório para aplicar migrations.\n' +
        'Sem essa confirmação explícita, nenhuma conexão é aberta e nenhuma migration é aplicada.',
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

  console.log(`Aplicando migrations versionadas em: ${config.provider}/${config.environment}/${config.database}`)

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

    const db = drizzle(connection)
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
    console.log('\nMigrations aplicadas com sucesso.')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\nFalha ao aplicar migrations. Categoria: ${categorizeConnectionError(message)}`)
    process.exitCode = 1
  } finally {
    await connection?.end()
  }
}

main()
