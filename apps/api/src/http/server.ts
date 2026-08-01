/**
 * Bootstrap runtime da API HTTP — separado da fábrica pura (`app.ts`).
 * Aqui, e só aqui: lê `.env.local`, resolve a config real, cria o pool de
 * conexões, decide o modo de execução e efetivamente escuta uma porta.
 *
 * Bind estritamente local: sempre `127.0.0.1`, nunca configurável, nunca em
 * todas as interfaces de rede — a API não tem autenticação real (Bloco 16) e
 * não pode ficar acessível fora da máquina local.
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/mysql2'
import { DatabaseConfigError, resolveDatabaseConfig } from '../config/database-config.js'
import { categorizeConnectionError } from '../db/sanitize-error.js'
import { createDatabasePool, type DatabasePool } from '../db/pool.js'
import { createDrizzleRepositories } from '../infrastructure/repositories/drizzle/create-drizzle-repositories.js'
import { createHttpApp, type HttpRuntimeMode } from './app.js'
import type { ReadinessCheck } from './routes/ready.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../../.env.local')

const LOCAL_HOST = '127.0.0.1'
const DEFAULT_PORT = 3000

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(ENV_LOCAL_PATH)
  } catch {
    console.error(`Arquivo de credenciais não encontrado: ${ENV_LOCAL_PATH}`)
    process.exit(1)
  }
}

function resolveRuntimeMode(): HttpRuntimeMode {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

function createReadinessCheck(pool: DatabasePool): ReadinessCheck {
  return async () => {
    try {
      const connection = await pool.pool.getConnection()
      try {
        const [rows] = (await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")) as [
          Array<{ Value: string }>,
          unknown,
        ]
        const tlsActive = (rows[0]?.Value ?? '').length > 0
        return { ready: true, checks: { configResolved: true, poolAvailable: true, connectionOk: true, tlsActive } }
      } finally {
        connection.release()
      }
    } catch {
      return {
        ready: false,
        checks: { configResolved: true, poolAvailable: true, connectionOk: false, tlsActive: false },
      }
    }
  }
}

export interface RunningHttpServer {
  close: () => Promise<void>
}

export async function startHttpServer(): Promise<RunningHttpServer> {
  loadLocalEnv()

  let config
  try {
    config = resolveDatabaseConfig(process.env)
  } catch (error) {
    const message = error instanceof DatabaseConfigError ? error.message : 'Configuração de banco inválida.'
    console.error(`Configuração inválida: ${message}`)
    process.exit(1)
  }

  const dbPool = createDatabasePool(config)
  const db = drizzle(dbPool.pool)
  const repositories = createDrizzleRepositories(db)

  const app = createHttpApp({
    repositories,
    runtimeMode: resolveRuntimeMode(),
    logger: true,
    readiness: createReadinessCheck(dbPool),
  })

  const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT

  try {
    await app.listen({ port, host: LOCAL_HOST })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Falha ao iniciar o servidor HTTP. Categoria: ${categorizeConnectionError(message)}`)
    await dbPool.close()
    process.exit(1)
  }

  return {
    close: async () => {
      await app.close()
      await dbPool.close()
    },
  }
}
