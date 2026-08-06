export interface AuthSession {
  id: number
  userId: number
  householdId: number
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  createdAt: Date
  lastUsedAt: Date | null
}

/** Dados de uma sessão ainda não persistida — sem `id` (gerado pelo `AUTO_INCREMENT` nativo do banco em `create()`), sem `revokedAt`/`lastUsedAt` (sempre `null` numa sessão recém-criada). */
export interface NewAuthSession {
  userId: number
  householdId: number
  tokenHash: string
  expiresAt: Date
  createdAt: Date
}

/**
 * `create()` e `update()` são deliberadamente métodos separados (não um
 * único `save()` ambíguo): `create()` sempre insere uma linha nova, com
 * `id` gerado pelo `AUTO_INCREMENT` do banco — nunca calculado em código,
 * nunca sujeito a colisão sob logins concorrentes. `update()` só existe
 * para tocar uma sessão já existente (revogação, `lastUsedAt`) e nunca
 * altera `tokenHash` — o hash pertence exclusivamente ao momento da
 * criação (DT-14, corrigido após incidente de colisão de `id` documentado
 * em `Docs/02_architecture/decisoes_tecnicas.md`).
 */
export interface AuthSessionRepository {
  findByTokenHash(tokenHash: string): Promise<AuthSession | null>
  create(session: NewAuthSession): Promise<AuthSession>
  update(session: AuthSession): Promise<AuthSession>
}
