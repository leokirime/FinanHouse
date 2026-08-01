import { describe, expect, it } from 'vitest'
import type { HouseholdMember as HouseholdMemberRow } from '../../../db/types.js'
import { DrizzleHouseholdMemberRepository } from './drizzle-household-member-repository.js'
import { PersistenceError } from './persistence-errors.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

function buildRow(overrides: Partial<HouseholdMemberRow> = {}): HouseholdMemberRow {
  return {
    id: 1,
    householdId: 10,
    userId: 20,
    role: 'member',
    status: 'active',
    joinedAt: new Date(),
    removedAt: null,
    ...overrides,
  }
}

function repositoryWith(rows: HouseholdMemberRow[], failWith?: unknown) {
  const db = new FakeDrizzleDb(rows, failWith)
  return new DrizzleHouseholdMemberRepository(db as unknown as DrizzleDb)
}

describe('DrizzleHouseholdMemberRepository', () => {
  it('findById retorna o membro mapeado quando encontrado', async () => {
    const repository = repositoryWith([buildRow({ id: 5, role: 'owner' })])
    const member = await repository.findById(5)
    expect(member?.role).toBe('owner')
  })

  it('findById retorna null quando não encontrado', async () => {
    const repository = repositoryWith([buildRow({ id: 5 })])
    expect(await repository.findById(999)).toBeNull()
  })

  it('findByHousehold isola por household — nunca retorna membro de outro household', async () => {
    const repository = repositoryWith([
      buildRow({ id: 1, householdId: 10 }),
      buildRow({ id: 2, householdId: 20 }),
    ])
    const members = await repository.findByHousehold(10)
    expect(members).toHaveLength(1)
    expect(members[0]?.id).toBe(1)
  })

  it('propaga PersistenceError sanitizado quando a consulta falha', async () => {
    const repository = repositoryWith([], new Error('connect ECONNREFUSED'))
    await expect(repository.findByHousehold(10)).rejects.toBeInstanceOf(PersistenceError)
  })
})
