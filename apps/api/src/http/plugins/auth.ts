import fastifyCookie from '@fastify/cookie'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { SessionNotFoundError } from '../../application/auth-errors.js'
import { ValidateSessionService, type AuthServiceDependencies } from '../../application/services/auth-services.js'
import type { HttpRuntimeMode } from '../app.js'
import { NotFoundHttpError } from '../errors/http-error.js'

export const SESSION_COOKIE_NAME = 'finanhouse_session'
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

export interface AuthenticatedSession {
  userId: number
  householdId: number
  displayName: string
  email: string
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Preenchida pelo preHandler de autenticação — nunca lida diretamente do corpo/query (DT-14). */
    authSession?: AuthenticatedSession
  }
}

/** Rotas que nunca exigem sessão — login precisa ser alcançável sem cookie; `/health`/`/ready` são infraestrutura. */
function isPublicRoute(url: string): boolean {
  return url === '/health' || url === '/ready' || url.startsWith('/api/v1/auth/')
}

/** Só rotas financeiras (`/api/v1/households/:householdId/...`) carregam um `:householdId` para checar contra a sessão. */
function extractHouseholdIdFromUrl(url: string): number | null {
  const match = /^\/api\/v1\/households\/(\d+)(?:\/|$|\?)/.exec(url)
  return match?.[1] ? Number(match[1]) : null
}

export function sessionCookieOptions(runtimeMode: HttpRuntimeMode) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: runtimeMode !== 'development',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}

/**
 * Registra o parser de cookies e o guard de autenticação. Toda rota
 * `/api/v1/households/:householdId/...` passa a exigir uma sessão válida
 * (401 se ausente/expirada/revogada) cujo `householdId` bata com o da URL
 * (404 se divergir — mesmo padrão de "recurso de outro household nunca é
 * distinguível de inexistente" já usado em `entries`/`periods`/`budgets`).
 * Login/sessão/logout nunca passam por este guard (senão ninguém
 * conseguiria autenticar).
 */
export function registerAuthPlugin(fastify: FastifyInstance, deps: AuthServiceDependencies): void {
  fastify.register(fastifyCookie)

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    if (isPublicRoute(request.url)) return

    const householdIdFromUrl = extractHouseholdIdFromUrl(request.url)
    if (householdIdFromUrl === null) return // rota fora do escopo financeiro (ex.: 404 genérico) — nada a autenticar aqui

    const rawToken = request.cookies[SESSION_COOKIE_NAME]
    if (!rawToken) throw new SessionNotFoundError('Sessão ausente.')

    const validated = await new ValidateSessionService(deps).execute(rawToken)
    request.authSession = {
      userId: validated.user.id,
      householdId: validated.session.householdId,
      displayName: validated.user.displayName,
      email: validated.user.email,
    }

    if (validated.session.householdId !== householdIdFromUrl) {
      // Nunca 401/403 aqui: um household divergente deve ser indistinguível de um household inexistente.
      throw new NotFoundHttpError(`Household ${householdIdFromUrl} não encontrado.`)
    }
  })
}
