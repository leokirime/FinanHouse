import { DatabaseCaResolutionError, resolveCaCertificate, type DatabaseCaEnv } from './database-ca.js'

export const DATABASE_ENVIRONMENTS = ['development', 'test', 'production'] as const
export type DatabaseEnvironment = (typeof DATABASE_ENVIRONMENTS)[number]

export class DatabaseConfigError extends Error {}

export interface DatabaseConfigEnv extends DatabaseCaEnv {
  DATABASE_PROVIDER?: string
  DATABASE_ENV?: string
  DATABASE_HOST?: string
  DATABASE_PORT?: string
  DATABASE_USER?: string
  DATABASE_PASSWORD?: string
  DATABASE_NAME?: string
  DATABASE_SSL_MODE?: string
}

export interface DatabaseSslConfig {
  ca: string
  rejectUnauthorized: true
  minVersion: 'TLSv1.2'
}

export interface DatabaseConfig {
  provider: 'aiven'
  environment: DatabaseEnvironment
  host: string
  port: number
  user: string
  password: string
  database: string
  ssl: DatabaseSslConfig
}

const REQUIRED_DATABASE_NAME_BY_ENVIRONMENT: Partial<Record<DatabaseEnvironment, string>> = {
  development: 'finanhouse_dev',
  production: 'finanhouse_prod',
}

const FORBIDDEN_DATABASE_NAMES = new Set(['defaultdb'])

function requireNonEmpty(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new DatabaseConfigError(`${fieldName} é obrigatório.`)
  }
  return trimmed
}

function resolveEnvironment(raw: string | undefined): DatabaseEnvironment {
  const trimmed = raw?.trim()
  if (!DATABASE_ENVIRONMENTS.includes(trimmed as DatabaseEnvironment)) {
    throw new DatabaseConfigError(`DATABASE_ENV deve ser um dos valores: ${DATABASE_ENVIRONMENTS.join(', ')}.`)
  }
  return trimmed as DatabaseEnvironment
}

function resolvePort(raw: string | undefined): number {
  const trimmed = raw?.trim()
  if (!trimmed) {
    throw new DatabaseConfigError('DATABASE_PORT é obrigatório.')
  }
  const port = Number(trimmed)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new DatabaseConfigError('DATABASE_PORT deve ser um número inteiro válido entre 1 e 65535.')
  }
  return port
}

function assertDatabaseNameAllowed(database: string, environment: DatabaseEnvironment): void {
  if (FORBIDDEN_DATABASE_NAMES.has(database.toLowerCase())) {
    throw new DatabaseConfigError(
      `DATABASE_NAME não pode ser "${database}" — este nome é reservado pelo provedor e nunca deve ser usado como banco da aplicação.`,
    )
  }

  const requiredName = REQUIRED_DATABASE_NAME_BY_ENVIRONMENT[environment]
  if (requiredName && database !== requiredName) {
    throw new DatabaseConfigError(
      `DATABASE_ENV="${environment}" exige DATABASE_NAME="${requiredName}". Ambientes de desenvolvimento e produção nunca podem apontar para o banco um do outro.`,
    )
  }
}

function assertSslMode(raw: string | undefined): void {
  if (raw?.trim() !== 'verify_identity') {
    throw new DatabaseConfigError('DATABASE_SSL_MODE deve ser "verify_identity" — nenhum outro modo de SSL é aceito.')
  }
}

/**
 * Resolve e valida toda a configuração de conexão com o Aiven a partir de um
 * objeto de ambiente recebido por argumento (nunca lê `process.env`
 * diretamente nem `.env.local`). Falha antes de qualquer tentativa de
 * conexão quando qualquer regra é violada. Reaproveitada por app, pool,
 * `db:check`, `db:migrate` e `db:seed:dev` para nunca duplicar validação.
 */
export function resolveDatabaseConfig(env: DatabaseConfigEnv): DatabaseConfig {
  if (env.DATABASE_PROVIDER?.trim() !== 'aiven') {
    throw new DatabaseConfigError('DATABASE_PROVIDER deve ser "aiven". A Clever Cloud não é mais a infraestrutura ativa do Finanhouse.')
  }

  const environment = resolveEnvironment(env.DATABASE_ENV)
  const host = requireNonEmpty(env.DATABASE_HOST, 'DATABASE_HOST')
  const user = requireNonEmpty(env.DATABASE_USER, 'DATABASE_USER')
  const password = requireNonEmpty(env.DATABASE_PASSWORD, 'DATABASE_PASSWORD')
  const database = requireNonEmpty(env.DATABASE_NAME, 'DATABASE_NAME')
  const port = resolvePort(env.DATABASE_PORT)

  assertDatabaseNameAllowed(database, environment)
  assertSslMode(env.DATABASE_SSL_MODE)

  let ca: string
  try {
    ca = resolveCaCertificate(env)
  } catch (error) {
    if (error instanceof DatabaseCaResolutionError) {
      throw new DatabaseConfigError(error.message)
    }
    throw error
  }

  return {
    provider: 'aiven',
    environment,
    host,
    port,
    user,
    password,
    database,
    ssl: { ca, rejectUnauthorized: true, minVersion: 'TLSv1.2' },
  }
}
