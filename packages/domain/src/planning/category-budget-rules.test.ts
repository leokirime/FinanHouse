import { describe, expect, it } from 'vitest'
import type { Category } from '../category/category.js'
import { DomainError } from '../errors/domain-errors.js'
import { parseMoney } from '../money/money.js'
import type { MonthlyPeriod } from '../monthly-period/monthly-period.js'
import type { CategoryBudget } from './category-budget.js'
import {
  assertCategoryBudgetRemovable,
  createCategoryBudget,
  type CategoryBudgetContext,
  updateCategoryBudget,
} from './category-budget-rules.js'

function period(overrides: Partial<MonthlyPeriod> = {}): MonthlyPeriod {
  return { id: 1, householdId: 1, referenceMonth: '2026-07-01', status: 'open', closedAt: null, closedByUserId: null, ...overrides }
}

function category(overrides: Partial<Category> = {}): Category {
  return { id: 1, householdId: 1, name: 'Alimentação', entryType: 'expense', status: 'active', ...overrides }
}

function context(overrides: Partial<CategoryBudgetContext> = {}): CategoryBudgetContext {
  return { period: period(), category: category(), ...overrides }
}

describe('createCategoryBudget', () => {
  it('cria um limite válido', () => {
    const budget = createCategoryBudget(
      { id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: parseMoney('500.00') },
      context(),
      [],
    )
    expect(budget.limitAmount).toBe(parseMoney('500.00'))
    expect(budget.categoryId).toBe(1)
  })

  it('rejeita limite zero', () => {
    expect(() =>
      createCategoryBudget({ id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: 0n }, context(), []),
    ).toThrow(DomainError)
  })

  it('rejeita limite negativo', () => {
    expect(() =>
      createCategoryBudget({ id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: -100n }, context(), []),
    ).toThrow(DomainError)
  })

  it('rejeita categoria do tipo income', () => {
    expect(() =>
      createCategoryBudget(
        { id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: parseMoney('100.00') },
        context({ category: category({ entryType: 'income' }) }),
        [],
      ),
    ).toThrow(DomainError)
  })

  it('rejeita categoria inativa', () => {
    expect(() =>
      createCategoryBudget(
        { id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: parseMoney('100.00') },
        context({ category: category({ status: 'inactive' }) }),
        [],
      ),
    ).toThrow(DomainError)
  })

  it('rejeita competência fechada', () => {
    expect(() =>
      createCategoryBudget(
        { id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: parseMoney('100.00') },
        context({ period: period({ status: 'closed' }) }),
        [],
      ),
    ).toThrow(DomainError)
  })

  it('permite competência em revisão (diferente de movimentações comuns)', () => {
    expect(() =>
      createCategoryBudget(
        { id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: parseMoney('100.00') },
        context({ period: period({ status: 'review' }) }),
        [],
      ),
    ).not.toThrow()
  })

  it('rejeita categoria de outro household', () => {
    expect(() =>
      createCategoryBudget(
        { id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: parseMoney('100.00') },
        context({ category: category({ householdId: 2 }) }),
        [],
      ),
    ).toThrow(DomainError)
  })

  it('rejeita duplicidade de limite para a mesma categoria/competência', () => {
    const existing: CategoryBudget[] = [{ id: 9, householdId: 1, periodId: 1, categoryId: 1, limitAmount: parseMoney('50.00') }]
    expect(() =>
      createCategoryBudget(
        { id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: parseMoney('100.00') },
        context(),
        existing,
      ),
    ).toThrow(DomainError)
  })

  it('permite a mesma categoria em competências diferentes', () => {
    const existing: CategoryBudget[] = [{ id: 9, householdId: 1, periodId: 2, categoryId: 1, limitAmount: parseMoney('50.00') }]
    expect(() =>
      createCategoryBudget(
        { id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: parseMoney('100.00') },
        context(),
        existing,
      ),
    ).not.toThrow()
  })
})

describe('updateCategoryBudget', () => {
  const existing: CategoryBudget = { id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: parseMoney('100.00') }

  it('atualiza o valor do limite', () => {
    const updated = updateCategoryBudget(existing, { limitAmount: parseMoney('200.00') }, period())
    expect(updated.limitAmount).toBe(parseMoney('200.00'))
  })

  it('rejeita valor zero', () => {
    expect(() => updateCategoryBudget(existing, { limitAmount: 0n }, period())).toThrow(DomainError)
  })

  it('rejeita competência fechada', () => {
    expect(() => updateCategoryBudget(existing, { limitAmount: parseMoney('200.00') }, period({ status: 'closed' }))).toThrow(
      DomainError,
    )
  })

  it('permite competência em revisão', () => {
    expect(() =>
      updateCategoryBudget(existing, { limitAmount: parseMoney('200.00') }, period({ status: 'review' })),
    ).not.toThrow()
  })
})

describe('assertCategoryBudgetRemovable', () => {
  it('permite remoção em competência aberta', () => {
    expect(() => assertCategoryBudgetRemovable(period())).not.toThrow()
  })

  it('permite remoção em competência em revisão', () => {
    expect(() => assertCategoryBudgetRemovable(period({ status: 'review' }))).not.toThrow()
  })

  it('rejeita remoção em competência fechada', () => {
    expect(() => assertCategoryBudgetRemovable(period({ status: 'closed' }))).toThrow(DomainError)
  })
})
