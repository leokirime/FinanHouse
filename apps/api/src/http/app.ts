import type { CategoryRepository, FinancialEntryRepository, HouseholdMemberRepository, MonthlyPeriodRepository } from '../application/ports/index.js'
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify'
import { createErrorHandler } from './errors/error-handler.js'
import { registerCorsPlugin } from './plugins/cors.js'
import { registerCategoryRoutes } from './routes/categories.js'
import { registerEntryRoutes } from './routes/entries.js'
import { registerHealthRoute } from './routes/health.js'
import { registerMemberRoutes } from './routes/members.js'
import { registerPeriodRoutes } from './routes/periods.js'
import { registerReadyRoute, type ReadinessCheck, type ReadinessResult } from './routes/ready.js'

/** As quatro portas já existentes em `application/ports/` — nunca uma porta nova, nunca acoplado ao Drizzle. */
export interface HttpAppRepositories {
  entries: FinancialEntryRepository
  periods: MonthlyPeriodRepository
  categories: CategoryRepository
  members: HouseholdMemberRepository
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
 * A API ainda não tem autenticação real (ver Bloco 16) — por isso nunca é
 * permitido criá-la em modo `production`: sem autenticação, executar em
 * produção significaria expor dados financeiros sem qualquer controle de
 * acesso.
 */
export function createHttpApp(options: CreateHttpAppOptions): FastifyInstance {
  if (options.runtimeMode === 'production') {
    throw new Error(
      'createHttpApp: modo "production" recusado — esta API ainda não implementa autenticação real (Bloco 16) e não pode ser executada em produção.',
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

  registerHealthRoute(fastify)
  registerReadyRoute(fastify, options.readiness ?? DEFAULT_READINESS)

  registerCategoryRoutes(fastify, options.repositories)
  registerMemberRoutes(fastify, options.repositories)
  registerPeriodRoutes(fastify, options.repositories)
  registerEntryRoutes(fastify, options.repositories)

  return fastify
}
