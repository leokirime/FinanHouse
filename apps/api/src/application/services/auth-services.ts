import { InvalidCredentialsError, SessionNotFoundError } from '../auth-errors.js'
import { hashPassword, verifyPassword } from '../../security/password-hashing.js'
import { generateSessionToken, hashSessionToken } from '../../security/session-token.js'
import type { AuthSession, AuthSessionRepository } from '../ports/auth-session-repository.js'
import type { HouseholdMemberRepository } from '../ports/household-member-repository.js'
import type { AuthUserRecord, UserRepository } from '../ports/user-repository.js'

export interface AuthServiceDependencies {
  users: UserRepository
  members: HouseholdMemberRepository
  sessions: AuthSessionRepository
}

/** 7 dias — razoável para um app doméstico de uso pessoal, sem "lembrar de mim" separado. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Hash Argon2id fixo de um valor arbitrário — usado só para que
 * `verifyPassword` sempre execute (mesmo custo de CPU) quando o e-mail não
 * existe, evitando que a ausência da chamada real vire um sinal de timing
 * que revele se o e-mail está cadastrado.
 */
let dummyHashPromise: Promise<string> | null = null
function dummyHash(): Promise<string> {
  if (!dummyHashPromise) dummyHashPromise = hashPassword('finanhouse-dummy-hash-nunca-usado-como-senha-real')
  return dummyHashPromise
}

export interface LoginInput {
  email: string
  password: string
}

export interface LoginResult {
  rawToken: string
  session: AuthSession
  user: Pick<AuthUserRecord, 'id' | 'displayName' | 'email'>
  householdId: number
}

/**
 * Autentica por e-mail/senha e cria uma sessão real. Mensagem de erro
 * sempre genérica (`InvalidCredentialsError`) — nunca distingue "e-mail não
 * existe" de "senha errada" de "conta inativa"/"sem senha configurada"/"sem
 * vínculo ativo com nenhum household" (DT-14).
 */
export class LoginService {
  constructor(private readonly deps: AuthServiceDependencies) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const user = await this.deps.users.findByEmail(input.email)
    const passwordOk = await verifyPassword(user?.passwordHash ?? (await dummyHash()), input.password)

    if (!user || !user.passwordHash || !passwordOk || user.status !== 'active') {
      throw new InvalidCredentialsError('E-mail ou senha inválidos.')
    }

    const memberships = await this.deps.members.findByUserId(user.id)
    const activeMembership = memberships.find((member) => member.status === 'active')
    if (!activeMembership) {
      throw new InvalidCredentialsError('E-mail ou senha inválidos.')
    }

    const rawToken = generateSessionToken()
    const now = new Date()
    const session = await this.deps.sessions.create({
      userId: user.id,
      householdId: activeMembership.householdId,
      tokenHash: hashSessionToken(rawToken),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      createdAt: now,
    })

    return {
      rawToken,
      session,
      user: { id: user.id, displayName: user.displayName, email: user.email },
      householdId: activeMembership.householdId,
    }
  }
}

export interface ValidatedSession {
  session: AuthSession
  user: Pick<AuthUserRecord, 'id' | 'displayName' | 'email'>
}

/**
 * Valida um token de sessão bruto (nunca comparado em texto puro — sempre
 * via `hashSessionToken`, e a comparação em si é feita pelo `findByTokenHash`
 * do repositório, que usa `WHERE token_hash = ?`, nunca varredura manual).
 * Sessão ausente, expirada, revogada, de usuário inativo ou sem vínculo
 * ativo com o household da sessão sempre vira `SessionNotFoundError` — nunca
 * detalha qual caso, mesma lógica de `InvalidCredentialsError`.
 */
export class ValidateSessionService {
  constructor(private readonly deps: AuthServiceDependencies) {}

  async execute(rawToken: string): Promise<ValidatedSession> {
    const session = await this.deps.sessions.findByTokenHash(hashSessionToken(rawToken))
    if (!session) throw new SessionNotFoundError('Sessão inválida.')

    const now = new Date()
    if (session.revokedAt !== null || session.expiresAt.getTime() <= now.getTime()) {
      throw new SessionNotFoundError('Sessão expirada ou revogada.')
    }

    const user = await this.deps.users.findById(session.userId)
    if (!user || user.status !== 'active') throw new SessionNotFoundError('Sessão inválida.')

    const memberships = await this.deps.members.findByUserId(user.id)
    const stillActiveMember = memberships.some((member) => member.householdId === session.householdId && member.status === 'active')
    if (!stillActiveMember) throw new SessionNotFoundError('Sessão inválida.')

    const touchedSession = await this.deps.sessions.update({ ...session, lastUsedAt: now })

    return { session: touchedSession, user: { id: user.id, displayName: user.displayName, email: user.email } }
  }
}

/** Idempotente: revogar uma sessão já revogada ou inexistente nunca lança — apenas confirma que ela não está mais válida. */
export class LogoutService {
  constructor(private readonly deps: Pick<AuthServiceDependencies, 'sessions'>) {}

  async execute(rawToken: string): Promise<void> {
    const session = await this.deps.sessions.findByTokenHash(hashSessionToken(rawToken))
    if (!session || session.revokedAt !== null) return
    await this.deps.sessions.update({ ...session, revokedAt: new Date() })
  }
}
