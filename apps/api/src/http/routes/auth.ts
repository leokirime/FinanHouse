import fastifyRateLimit from '@fastify/rate-limit'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { SessionNotFoundError } from '../../application/auth-errors.js'
import { LoginService, LogoutService, ValidateSessionService, type AuthServiceDependencies } from '../../application/services/auth-services.js'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '../plugins/auth.js'
import { loginBodySchema } from '../schemas/auth-schemas.js'
import type { HttpRuntimeMode } from '../app.js'

interface LoginBody {
  email: string
  password: string
}

interface SessionDto {
  user: { id: number; displayName: string; email: string }
  householdId: number
}

export function registerAuthRoutes(fastify: FastifyInstance, deps: AuthServiceDependencies, runtimeMode: HttpRuntimeMode): void {
  const cookieOptions = sessionCookieOptions(runtimeMode)

  // Encapsulado em um plugin próprio: `fastify.rateLimit()` só existe depois que
  // `@fastify/rate-limit` termina de carregar (`await instance.register(...)`) — não dá para
  // referenciá-lo síncrono logo após `fastify.register(fastifyRateLimit)` no escopo pai.
  fastify.register(async (instance) => {
    await instance.register(fastifyRateLimit, { global: false })

    instance.post(
      '/api/v1/auth/login',
      {
        schema: { body: loginBodySchema },
        // Uso doméstico local — 10 tentativas por 5 minutos por IP é folgado o bastante para um
        // usuário real errar a senha algumas vezes, apertado o bastante para dificultar força bruta.
        preHandler: instance.rateLimit({ max: 10, timeWindow: '5 minutes' }),
      },
      async (request: FastifyRequest<{ Body: LoginBody }>, reply) => {
        const result = await new LoginService(deps).execute({ email: request.body.email, password: request.body.password })
        reply.setCookie(SESSION_COOKIE_NAME, result.rawToken, cookieOptions)
        const data: SessionDto = { user: result.user, householdId: result.householdId }
        reply.status(200).send({ data })
      },
    )
  })

  fastify.get('/api/v1/auth/session', async (request, reply) => {
    const rawToken = request.cookies[SESSION_COOKIE_NAME]
    if (!rawToken) throw new SessionNotFoundError('Sessão ausente.')

    const validated = await new ValidateSessionService(deps).execute(rawToken)
    const data: SessionDto = { user: validated.user, householdId: validated.session.householdId }
    reply.status(200).send({ data })
  })

  fastify.post('/api/v1/auth/logout', async (request, reply) => {
    const rawToken = request.cookies[SESSION_COOKIE_NAME]
    if (rawToken) await new LogoutService(deps).execute(rawToken)
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
    reply.status(204).send()
  })
}
