import { describe, expect, it } from 'vitest'
import type { HouseholdMember as HouseholdMemberRow } from '../../../../db/types.js'
import { UnexpectedPersistedValueError } from '../persistence-errors.js'
import { toDomainHouseholdMember } from './household-member-mapper.js'

function buildRow(overrides: Partial<HouseholdMemberRow> = {}): HouseholdMemberRow {
  return {
    id: 1,
    householdId: 10,
    userId: 20,
    role: 'owner',
    status: 'active',
    joinedAt: new Date('2026-07-01T00:00:00Z'),
    removedAt: null,
    ...overrides,
  }
}

describe('toDomainHouseholdMember', () => {
  it('mapeia um membro ativo', () => {
    const member = toDomainHouseholdMember(buildRow())
    expect(member).toEqual({ id: 1, householdId: 10, userId: 20, role: 'owner', status: 'active' })
  })

  it('lança UnexpectedPersistedValueError para role inesperado', () => {
    expect(() => toDomainHouseholdMember(buildRow({ role: 'guest' }))).toThrow(UnexpectedPersistedValueError)
  })

  it('lança UnexpectedPersistedValueError para status inesperado', () => {
    expect(() => toDomainHouseholdMember(buildRow({ status: 'archived' }))).toThrow(UnexpectedPersistedValueError)
  })
})
