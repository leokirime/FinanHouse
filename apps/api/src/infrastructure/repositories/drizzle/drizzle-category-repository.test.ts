import { describe, expect, it } from 'vitest'
import type { Category as CategoryRow } from '../../../db/types.js'
import { DrizzleCategoryRepository } from './drizzle-category-repository.js'
import { PersistenceError } from './persistence-errors.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

function buildRow(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: 1,
    householdId: 10,
    name: 'Mercado',
    entryType: 'expense',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function repositoryWith(rows: CategoryRow[], failWith?: unknown) {
  const db = new FakeDrizzleDb(rows, failWith)
  return { repository: new DrizzleCategoryRepository(db as unknown as DrizzleDb), db }
}

describe('DrizzleCategoryRepository', () => {
  it('findById retorna a categoria mapeada quando encontrada', async () => {
    const { repository } = repositoryWith([buildRow({ id: 7, name: 'Transporte' })])
    const category = await repository.findById(7)
    expect(category?.name).toBe('Transporte')
  })

  it('findById retorna null quando não encontrada', async () => {
    const { repository } = repositoryWith([buildRow({ id: 7 })])
    expect(await repository.findById(999)).toBeNull()
  })

  it('findByHousehold isola por household — nunca retorna categoria de outro household', async () => {
    const { repository } = repositoryWith([
      buildRow({ id: 1, householdId: 10, name: 'Casa A' }),
      buildRow({ id: 2, householdId: 20, name: 'Casa B' }),
    ])
    const categories = await repository.findByHousehold(10)
    expect(categories).toHaveLength(1)
    expect(categories[0]?.name).toBe('Casa A')
  })

  it('propaga PersistenceError sanitizado quando a consulta falha', async () => {
    const { repository } = repositoryWith([], { code: 'ETIMEDOUT' })
    await expect(repository.findByHousehold(10)).rejects.toBeInstanceOf(PersistenceError)
  })
})
