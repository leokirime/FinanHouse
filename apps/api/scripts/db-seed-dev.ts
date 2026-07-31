/**
 * Popula o banco de DESENVOLVIMENTO (`finanhouse_dev`) com dados sintéticos
 * mínimos (um household, um usuário, categorias e uma competência com
 * poucas movimentações). Nunca disponível para produção — bloqueado tanto
 * por `DATABASE_ENV` quanto por `DATABASE_NAME`. Idempotente: se o usuário
 * de seed já existir, nenhuma escrita é realizada. Nunca apaga dados
 * existentes.
 *
 * NÃO é executado automaticamente (nem sozinho, nem após `db:migrate`).
 *
 * Uso: npm run db:seed:dev
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { DatabaseConfigError, resolveDatabaseConfig } from '../src/config/database-config.js'
import { categories, financialEntries, households, householdMembers, monthlyPeriods, users } from '../src/db/schema/index.js'
import { categorizeConnectionError } from './lib/sanitize-error.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../.env.local')

const SEED_OWNER_EMAIL = 'dev-owner@finanhouse.dev'

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(ENV_LOCAL_PATH)
  } catch {
    console.error(`Arquivo de credenciais não encontrado: ${ENV_LOCAL_PATH}`)
    process.exit(1)
  }
}

function currentReferenceMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
}

async function main(): Promise<void> {
  loadLocalEnv()

  let config
  try {
    config = resolveDatabaseConfig(process.env)
  } catch (error) {
    const message = error instanceof DatabaseConfigError ? error.message : 'Configuração de banco inválida.'
    console.error(`\nConfiguração inválida: ${message}`)
    process.exit(1)
  }

  if (config.environment !== 'development') {
    console.error('\ndb:seed:dev só pode ser executado com DATABASE_ENV=development.')
    process.exit(1)
  }
  if (config.database !== 'finanhouse_dev') {
    console.error('\ndb:seed:dev só pode ser executado com DATABASE_NAME=finanhouse_dev.')
    process.exit(1)
  }

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl,
  })

  try {
    const db = drizzle(connection)

    const existingOwner = await db.select({ id: users.id }).from(users).where(eq(users.email, SEED_OWNER_EMAIL)).limit(1)
    if (existingOwner.length > 0) {
      console.log('\nDados sintéticos já presentes (usuário de seed encontrado) — nenhuma escrita realizada.')
      return
    }

    const [{ id: ownerId }] = await db
      .insert(users)
      .values({ displayName: 'Proprietário (dev)', email: SEED_OWNER_EMAIL, status: 'active' })
      .$returningId()

    const [{ id: householdId }] = await db
      .insert(households)
      .values({
        name: 'Residência de desenvolvimento',
        currencyCode: 'BRL',
        timezone: 'America/Sao_Paulo',
        createdByUserId: ownerId,
      })
      .$returningId()

    await db.insert(householdMembers).values({ householdId, userId: ownerId, role: 'owner', status: 'active' })

    const [{ id: incomeCategoryId }] = await db
      .insert(categories)
      .values({ householdId, name: 'Salário', entryType: 'income', status: 'active' })
      .$returningId()

    const [{ id: expenseCategoryId }] = await db
      .insert(categories)
      .values({ householdId, name: 'Alimentação', entryType: 'expense', status: 'active' })
      .$returningId()

    const referenceMonth = currentReferenceMonth()
    const [{ id: periodId }] = await db
      .insert(monthlyPeriods)
      .values({ householdId, referenceMonth, status: 'open' })
      .$returningId()

    await db.insert(financialEntries).values([
      {
        householdId,
        periodId,
        categoryId: incomeCategoryId,
        createdByUserId: ownerId,
        entryType: 'income',
        status: 'pending',
        description: 'Salário (dado sintético)',
        expectedAmount: '5000.00',
        dueDate: referenceMonth,
      },
      {
        householdId,
        periodId,
        categoryId: expenseCategoryId,
        createdByUserId: ownerId,
        entryType: 'expense',
        status: 'planned',
        description: 'Supermercado (dado sintético)',
        expectedAmount: '600.00',
        dueDate: referenceMonth,
      },
    ])

    console.log('\nDados sintéticos inseridos com sucesso em finanhouse_dev.')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\nFalha ao inserir dados sintéticos. Categoria: ${categorizeConnectionError(message)}`)
    process.exitCode = 1
  } finally {
    await connection.end()
  }
}

main()
