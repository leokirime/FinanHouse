import { describe, expect, it } from 'vitest'
import type { CategoryBudget as CategoryBudgetRow } from '../../../db/types.js'
import { DrizzleCategoryBudgetRepository } from './drizzle-category-budget-repository.js'
import { DuplicateRecordError, HouseholdScopeViolationError, PersistenceError } from './persistence-errors.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

function buildRow(overrides: Partial<CategoryBudgetRow> = {}): CategoryBudgetRow {
  return {
    id: 1,
    householdId: 10,
    periodId: 5,
    categoryId: 3,
    limitAmount: '1500.00',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function repositoryWith(rows: CategoryBudgetRow[] = [], failWith?: unknown) {
  const db = new FakeDrizzleDb(rows, failWith)
  return { repository: new DrizzleCategoryBudgetRepository(db as unknown as DrizzleDb), db }
}

describe('DrizzleCategoryBudgetRepository', () => {
  it('findById retorna o limite mapeado quando encontrado', async () => {
    const { repository } = repositoryWith([buildRow({ id: 4, limitAmount: '2000.00' })])
    const budget = await repository.findById(4)
    expect(budget?.limitAmount).toBe(200000n)
  })

  it('findByHouseholdAndPeriod isola por household e competência simultaneamente', async () => {
    const { repository } = repositoryWith([
      buildRow({ id: 1, householdId: 10, periodId: 5 }),
      buildRow({ id: 2, householdId: 10, periodId: 6 }),
      buildRow({ id: 3, householdId: 20, periodId: 5 }),
    ])
    const budgets = await repository.findByHouseholdAndPeriod(10, 5)
    expect(budgets).toHaveLength(1)
    expect(budgets[0]?.id).toBe(1)
  })

  it('findByHouseholdPeriodAndCategory filtra pelas três dimensões', async () => {
    const { repository } = repositoryWith([
      buildRow({ id: 1, householdId: 10, periodId: 5, categoryId: 3 }),
      buildRow({ id: 2, householdId: 10, periodId: 5, categoryId: 4 }),
    ])
    const budget = await repository.findByHouseholdPeriodAndCategory(10, 5, 4)
    expect(budget?.id).toBe(2)
  })

  it('save insere um novo limite e o devolve inalterado', async () => {
    const { repository, db } = repositoryWith([])
    const budget = { id: 9, householdId: 10, periodId: 5, categoryId: 3, limitAmount: 150000n }
    const saved = await repository.save(budget)
    expect(saved).toEqual(budget)
    expect(db.insertedValues[0]?.limitAmount).toBe('1500.00')
  })

  it('save atualiza um limite existente do mesmo household (sem upsert)', async () => {
    const { repository, db } = repositoryWith([buildRow({ id: 1, householdId: 10, limitAmount: '1500.00' })])
    const updated = await repository.save({ id: 1, householdId: 10, periodId: 5, categoryId: 3, limitAmount: 999900n })
    expect(updated.limitAmount).toBe(999900n)
    expect(db.insertedValues[0]?.limitAmount).toBe('9999.00')
  })

  it('rejeita salvar limite com ID que pertence a outro household', async () => {
    const { repository } = repositoryWith([buildRow({ id: 1, householdId: 10 })])
    await expect(
      repository.save({ id: 1, householdId: 20, periodId: 5, categoryId: 3, limitAmount: 100000n }),
    ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
  })

  it('conflito de unicidade (household+período+categoria) gera erro de duplicidade', async () => {
    const { repository } = repositoryWith([], {
      code: 'ER_DUP_ENTRY',
      sqlMessage: "Duplicate entry '10-5-3' for key 'category_budgets.category_budgets_household_period_category_unique'",
    })
    await expect(
      repository.save({ id: 99, householdId: 10, periodId: 5, categoryId: 3, limitAmount: 100000n }),
    ).rejects.toBeInstanceOf(DuplicateRecordError)
  })

  it('remove exclui o limite pelo id', async () => {
    const { repository, db } = repositoryWith([buildRow({ id: 1 }), buildRow({ id: 2, categoryId: 4 })])
    await repository.remove(1)
    const remaining = await repository.findByHouseholdAndPeriod(10, 5)
    expect(remaining.map((budget) => budget.id)).toEqual([2])
    expect(db).toBeDefined()
  })

  it('nextId lê o próximo AUTO_INCREMENT via information_schema', async () => {
    const { repository, db } = repositoryWith([])
    db.executeRows = [{ nextId: 17 }]
    expect(await repository.nextId()).toBe(17)
  })

  it('propaga PersistenceError sanitizado quando findById falha', async () => {
    const { repository } = repositoryWith([], new Error('falha simulada'))
    await expect(repository.findById(1)).rejects.toBeInstanceOf(PersistenceError)
  })
})
