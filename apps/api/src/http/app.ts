import type {
  AuthSessionRepository,
  CategoryBudgetRepository,
  CategoryRepository,
  FinancialEntryRepository,
  HouseholdMemberRepository,
  MonthlyPeriodRepository,
  UserRepository,
} from '../application/ports/index.js'
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify'
import { createErrorHandler } from './errors/error-handler.js'
import { registerAuthPlugin } from './plugins/auth.js'
import { registerCorsPlugin } from './plugins/cors.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerCategoryBudgetRoutes } from './routes/category-budgets.js'
import { registerCategoryRoutes } from './routes/categories.js'
import { registerEntryRoutes } from './routes/entries.js'
import { registerHealthRoute } from './routes/health.js'
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
}

export type HttpRuntimeMode = 'development' | 'test' | 'production'

export interface CreateHttpAppOptions {
  repositories: HttpAppRepositories
  logger?: boolean | FastifyBaseLogger
  runtimeMode: HttpRuntimeMode
  /** Injetada — nunca abre conexão real por conta própria; testes usam uma dependência falsa. */
  readiness?: ReadinessCheck
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
 * financeira, mas isso não é suficiente para produção por si só: bind e CORS
 * continuam estritamente locais (`http/server.ts`, `plugins/cors.ts`), não
 * há HTTPS, e a matriz completa de segurança de produção nunca foi validada
 * — por isso `runtimeMode: 'production'` continua recusado.
 */
export function createHttpApp(options: CreateHttpAppOptions): FastifyInstance {
  if (options.runtimeMode === 'production') {
    throw new Error(
      'createHttpApp: modo "production" recusado — bind/CORS continuam estritamente locais (Bloco 16/19) e esta API não deve ser executada em produção.',
    )
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
  registerCorsPlugin(fastify)

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

  return fastify
}
