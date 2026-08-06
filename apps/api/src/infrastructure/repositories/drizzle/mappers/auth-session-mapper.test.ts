import { describe, expect, it } from 'vitest'
import type { AuthSessionRow } from '../../../../db/types.js'
import { toDomainAuthSession } from './auth-session-mapper.js'

describe('toDomainAuthSession', () => {
  it('mapeia campos 1:1 (camelCase já compatível com o domínio)', () => {
    const row: AuthSessionRow = {
      id: 1,
      userId: 10,
      householdId: 100,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date('2026-08-05T00:00:00Z'),
      revokedAt: null,
      createdAt: new Date('2026-08-04T00:00:00Z'),
      lastUsedAt: null,
    }
    expect(toDomainAuthSession(row)).toEqual({
      id: 1,
      userId: 10,
      householdId: 100,
      tokenHash: 'a'.repeat(64),
      expiresAt: row.expiresAt,
      revokedAt: null,
      createdAt: row.createdAt,
      lastUsedAt: null,
    })
  })
})
