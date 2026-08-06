import type { AuthSession } from '../../../../application/ports/auth-session-repository.js'
import type { AuthSessionRow } from '../../../../db/types.js'

export function toDomainAuthSession(row: AuthSessionRow): AuthSession {
  return {
    id: row.id,
    userId: row.userId,
    householdId: row.householdId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
  }
}
