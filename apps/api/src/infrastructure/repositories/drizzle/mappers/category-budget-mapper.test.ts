import { describe, expect, it } from 'vitest'
import type { CategoryBudget as CategoryBudgetRow } from '../../../../db/types.js'
import { toDomainCategoryBudget, toPersistenceCategoryBudget } from './category-budget-mapper.js'

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

describe('category-budget-mapper', () => {
  it('toDomainCategoryBudget converte limitAmount de string decimal para Money (bigint)', () => {
    const budget = toDomainCategoryBudget(buildRow({ limitAmount: '1500.00' }))
    expect(budget.limitAmount).toBe(150000n)
  })

  it('toDomainCategoryBudget preserva id/householdId/periodId/categoryId', () => {
    const budget = toDomainCategoryBudget(buildRow({ id: 7, householdId: 11, periodId: 6, categoryId: 9 }))
    expect(budget).toEqual({ id: 7, householdId: 11, periodId: 6, categoryId: 9, limitAmount: 150000n })
  })

  it('toPersistenceCategoryBudget converte Money de volta para string decimal', () => {
    const values = toPersistenceCategoryBudget({ id: 1, householdId: 10, periodId: 5, categoryId: 3, limitAmount: 300000n })
    expect(values.limitAmount).toBe('3000.00')
  })
})
