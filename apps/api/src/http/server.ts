/**
 * Bootstrap runtime da API HTTP — separado da fábrica pura (`app.ts`).
 * Aqui, e só aqui: lê `.env.local`, resolve a config real, cria o pool de
 * conexões, decide o modo de execução e efetivamente escuta uma porta.
 *
 * Bind e CORS são resolvidos a partir do ambiente (`HTTP_HOST`,
 * `CORS_ALLOWED_ORIGINS`) — em desenvolvimento/teste caem para os padrões
 * locais existentes (`127.0.0.1`, origens do Vite); em produção são
 * obrigatórios e nunca aceitam localhost/127.0.0.1 (fail closed —
 * `config/http-bind-config.ts`/`config/cors-config.ts`, Sessão 14, Bloco 01).
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/mysql2'
import { CorsConfigError, resolveCorsAllowedOrigins } from '../config/cors-config.js'
import { DatabaseConfigError, resolveDatabaseConfig } from '../config/database-config.js'
import { HttpBindConfigError, resolveBindHost } from '../config/http-bind-config.js'
import { connectWithRetry } from '../db/connect-with-retry.js'
import { createDatabasePool, type DatabasePool } from '../db/pool.js'
import { createDrizzleRepositories } from '../infrastructure/repositories/drizzle/create-drizzle-repositories.js'
import { DrizzleInstallmentTransactionRunner } from '../infrastructure/repositories/drizzle/drizzle-installment-transaction-runner.js'
import { createHttpApp, type HttpRuntimeMode } from './app.js'
import { classifyListenError } from './listen-error-classifier.js'
import type { ReadinessCheck } from './routes/ready.js'
import { formatStartupFailureMessage } from './startup-diagnostics.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../../.env.local')

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

  const runtimeMode = resolveRuntimeMode()

  // Falha antes de qualquer conexão de banco — uma configuração HTTP inválida
  // (bind/CORS) não deveria gastar uma tentativa de conexão com o Aiven antes
  // de ser percebida.
  let bindHost: string
  try {
    bindHost = resolveBindHost(runtimeMode, process.env)
  } catch (error) {
    const message = error instanceof HttpBindConfigError ? error.message : 'Configuração de host HTTP inválida.'
    console.error(`Configuração inválida: ${message}`)
    process.exit(1)
  }

  let corsAllowedOrigins: string[]
  try {
    corsAllowedOrigins = resolveCorsAllowedOrigins(process.env, runtimeMode)
  } catch (error) {
    const message = error instanceof CorsConfigError ? error.message : 'Configuração de CORS inválida.'
    console.error(`Configuração inválida: ${message}`)
    process.exit(1)
  }

  let config
  try {
    config = resolveDatabaseConfig(process.env)
  } catch (error) {
    const message = error instanceof DatabaseConfigError ? error.message : 'Configuração de banco inválida.'
    console.error(`Configuração inválida: ${message}`)
    process.exit(1)
  }

  const debugStartup = process.env.FINANHOUSE_DEBUG_STARTUP === 'true'
  const dbPool = createDatabasePool(config)

  // Valida a conexão inicial (TCP/TLS/autenticação) antes de vincular a porta
  // HTTP — sem isso, um erro de rede/handshake momentâneo com o Aiven só
  // seria percebido depois, na primeira requisição real a /ready. Só repete
  // para erros classificados como transitórios (ver connect-with-retry.ts);
  // credencial/certificado/config inválidos falham já na primeira tentativa.
  const connectionResult = await connectWithRetry(async () => {
    const connection = await dbPool.pool.getConnection()
    try {
      // Só valida o handshake — nenhuma consulta é necessária aqui.
    } finally {
      connection.release()
    }
  })

  if (!connectionResult.ok) {
    console.error(
      formatStartupFailureMessage(
        'conexão inicial com o banco',
        connectionResult.classification,
        connectionResult.lastError,
        debugStartup,
      ),
    )
    await dbPool.close()
    process.exit(1)
  }

  const db = drizzle(dbPool.pool)
  const repositories = createDrizzleRepositories(db)

  const app = createHttpApp({
    repositories,
    runtimeMode,
    logger: true,
    readiness: createReadinessCheck(dbPool),
    installmentTransactionRunner: new DrizzleInstallmentTransactionRunner(db),
    corsAllowedOrigins,
  })

  const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT

  try {
    await app.listen({ port, host: bindHost })
  } catch (error) {
    // Deliberadamente NÃO usa o classificador de erros de banco: uma falha de
    // `listen()` (porta em uso, permissão negada) não tem nenhuma relação com
    // o banco de dados — rotulá-la como erro de banco (bug anterior) mandava
    // a investigação na direção errada.
    const classification = classifyListenError(error)
    console.error(formatStartupFailureMessage('vinculação da porta HTTP', classification, error, debugStartup))
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
