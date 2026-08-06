import type { AuthSession, AuthSessionRepository, NewAuthSession } from '../../../application/ports/auth-session-repository.js'

export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  private sessions = new Map<number, AuthSession>()
  private nextIdCounter = 1

  async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    return [...this.sessions.values()].find((session) => session.tokenHash === tokenHash) ?? null
  }

  /** Sempre insere uma sessão nova — `id` gerado aqui, nunca fornecido pelo chamador (mesmo contrato do `AUTO_INCREMENT` real). */
  async create(session: NewAuthSession): Promise<AuthSession> {
    const id = this.nextIdCounter
    this.nextIdCounter += 1
    const created: AuthSession = { id, ...session, revokedAt: null, lastUsedAt: null }
    this.sessions.set(id, created)
    return created
  }

  /** Nunca cria: só atualiza uma sessão já existente — `tokenHash` nunca é regravado aqui. */
  async update(session: AuthSession): Promise<AuthSession> {
    const existing = this.sessions.get(session.id)
    if (!existing) throw new Error(`Sessão ${session.id} não encontrada — atualização bloqueada.`)
    const updated: AuthSession = { ...existing, expiresAt: session.expiresAt, revokedAt: session.revokedAt, lastUsedAt: session.lastUsedAt }
    this.sessions.set(session.id, updated)
    return updated
  }

  reset(): void {
    this.sessions.clear()
    this.nextIdCounter = 1
  }
}
