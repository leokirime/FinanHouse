import type {
  AuthSessionRepository,
  CategoryBudgetRepository,
  CategoryRepository,
  FinancialEntryRepository,
  HouseholdMemberRepository,
  InstallmentPlanRepository,
  InstallmentTransactionRunner,
  MonthlyPeriodRepository,
  UserRepository,
} from '../application/ports/index.js'
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify'
import { assertOriginsSafeForProduction, DEVELOPMENT_DEFAULT_ORIGINS } from '../config/cors-config.js'
import { createErrorHandler } from './errors/error-handler.js'
import { registerAuthPlugin } from './plugins/auth.js'
import { registerCorsPlugin } from './plugins/cors.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerCategoryBudgetRoutes } from './routes/category-budgets.js'
import { registerCategoryRoutes } from './routes/categories.js'
import { registerEntryRoutes } from './routes/entries.js'
import { registerHealthRoute } from './routes/health.js'
import { registerInstallmentPlanRoutes } from './routes/installment-plans.js'
import { registerMemberRoutes } from './routes/members.js'
import { registerPeriodRoutes } from './routes/periods.js'
import { registerReadyRoute, type ReadinessCheck, type ReadinessResult } from './routes/ready.js'

/** As portas já existentes em `application/ports/` — nunca uma porta nova fora deste contrato, nunca acoplado ao Drizzle. */
export interface HttpAppRepositories {
  entries: FinancialEntryRepository
  periods: MonthlyPeriodRepository
  categories: CategoryRepository
  members: HouseholdMemberRepository
  budgets: CategoryBudgetRepository
  users: UserRepository
  authSessions: AuthSessionRepository
  installmentPlans: InstallmentPlanRepository
}

export type HttpRuntimeMode = 'development' | 'test' | 'production'

export interface CreateHttpAppOptions {
  repositories: HttpAppRepositories
  logger?: boolean | FastifyBaseLogger
  runtimeMode: HttpRuntimeMode
  /** Injetada — nunca abre conexão real por conta própria; testes usam uma dependência falsa. */
  readiness?: ReadinessCheck
  /**
   * Unidade de trabalho para a criação atômica de plano + N parcelas (RS-01,
   * Sessão 12, Bloco 04) — nunca faz parte de `repositories` (que representa
   * repositórios não-transacionais, cada um com sua própria conexão/leitura
   * ambiente); é uma dependência à parte, exatamente porque abre sua própria
   * transação real ao ser usada.
   */
  installmentTransactionRunner: InstallmentTransactionRunner
  /**
   * Origens permitidas de CORS. Fora de produção, o padrão são as origens
   * locais do Vite (`config/cors-config.ts`) quando omitida. Em produção é
   * validada por `assertOriginsSafeForProduction` mesmo se fornecida
   * diretamente (defesa em profundidade — `http/server.ts` já a resolve a
   * partir de `CORS_ALLOWED_ORIGINS` antes de chegar aqui, mas esta função
   * nunca confia cegamente em quem a chama).
   */
  corsAllowedOrigins?: string[]
}

const DEFAULT_READINESS: ReadinessCheck = async (): Promise<ReadinessResult> => ({
  ready: false,
  checks: { configResolved: false, poolAvailable: false, connectionOk: false, tlsActive: false },
})

/**
 * Fábrica pura da aplicação HTTP — recebe repositórios, logger e modo de
 * execução por injeção; nunca cria pool, nunca lê `.env.local`, nunca inicia
 * um servidor de rede (isso é responsabilidade de `http/server.ts`). Pode
 * ser usada em testes via `app.inject()` sem qualquer conexão real.
 *
 * Desde o Bloco 19 (DT-14) a API exige sessão real para toda rota
 * financeira. Até a Sessão 14 (Bloco 01), `runtimeMode: 'production'` era
 * recusado incondicionalmente porque bind/CORS eram estritamente locais e
 * nenhuma pré-condição de produção era validada. Isso foi substituído por uma
 * validação real de pré-condições (`assertOriginsSafeForProduction`) — em
 * produção, a aplicação só é construída se as origens de CORS forem
 * explicitamente configuradas e nenhuma apontar para localhost/127.0.0.1;
 * falha fechado (fail closed) caso contrário. Bind de host, HTTPS e a
 * topologia de cookie same-origin continuam responsabilidade de
 * `http/server.ts`/infraestrutura de deploy — esta função nunca abre socket.
 */
export function createHttpApp(options: CreateHttpAppOptions): FastifyInstance {
  const corsAllowedOrigins = options.corsAllowedOrigins ?? DEVELOPMENT_DEFAULT_ORIGINS
  if (options.runtimeMode === 'production') {
    assertOriginsSafeForProduction(corsAllowedOrigins)
  }

  const fastify = Fastify({
    logger: options.logger ?? false,
    // O padrão do Fastify é `removeAdditional: true` — remove silenciosamente campos
    // desconhecidos do corpo em vez de rejeitá-los. Isso contradiria a exigência de
    // rejeitar `householdId` concorrente (ou qualquer outro campo desconhecido) no
    // corpo: precisamos que `additionalProperties: false` realmente rejeite (400),
    // nunca limpe silenciosamente.
    ajv: { customOptions: { removeAdditional: false } },
  })

  fastify.setErrorHandler(createErrorHandler())
  registerCorsPlugin(fastify, corsAllowedOrigins)

  const authDeps = { users: options.repositories.users, members: options.repositories.members, sessions: options.repositories.authSessions }

  registerHealthRoute(fastify)
  registerReadyRoute(fastify, options.readiness ?? DEFAULT_READINESS)
  registerAuthRoutes(fastify, authDeps, options.runtimeMode)
  registerAuthPlugin(fastify, authDeps)

  registerCategoryRoutes(fastify, options.repositories)
  registerMemberRoutes(fastify, options.repositories)
  registerPeriodRoutes(fastify, options.repositories)
  registerEntryRoutes(fastify, options.repositories)
  registerCategoryBudgetRoutes(fastify, options.repositories)
  registerInstallmentPlanRoutes(fastify, options.repositories, options.installmentTransactionRunner)

  return fastify
}
