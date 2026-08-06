import { describe, expect, it } from 'vitest'
import type { User as UserRow } from '../../../db/types.js'
import { DrizzleUserRepository } from './drizzle-user-repository.js'
import { PersistenceError } from './persistence-errors.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

function buildRow(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 1,
    displayName: 'Usuária de Teste',
    email: 'teste@finanhouse.invalid',
    status: 'active',
    passwordHash: null,
    passwordConfiguredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function repositoryWith(rows: UserRow[] = [], failWith?: unknown) {
  const db = new FakeDrizzleDb(rows, failWith)
  return { repository: new DrizzleUserRepository(db as unknown as DrizzleDb), db }
}

describe('DrizzleUserRepository', () => {
  it('findByEmail retorna o usuário mapeado, incluindo passwordHash', async () => {
    const { repository } = repositoryWith([buildRow({ id: 3, email: 'a@b.invalid', passwordHash: '$argon2id$fake' })])
    const user = await repository.findByEmail('a@b.invalid')
    expect(user?.id).toBe(3)
    expect(user?.passwordHash).toBe('$argon2id$fake')
  })

  it('findByEmail devolve null quando não encontrado', async () => {
    const { repository } = repositoryWith([buildRow({ email: 'a@b.invalid' })])
    expect(await repository.findByEmail('outro@b.invalid')).toBeNull()
  })

  it('findById retorna o usuário mapeado', async () => {
    const { repository } = repositoryWith([buildRow({ id: 7 })])
    const user = await repository.findById(7)
    expect(user?.id).toBe(7)
  })

  it('propaga PersistenceError sanitizado quando a consulta falha', async () => {
    const { repository } = repositoryWith([], new Error('falha simulada'))
    await expect(repository.findByEmail('a@b.invalid')).rejects.toBeInstanceOf(PersistenceError)
  })
})
