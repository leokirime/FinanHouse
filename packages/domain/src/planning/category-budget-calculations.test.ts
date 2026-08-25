import { describe, expect, it } from 'vitest'
import type { Category } from '../category/category.js'
import type { FinancialEntry } from '../financial-entry/financial-entry.js'
import { parseMoney } from '../money/money.js'
import type { CategoryBudget } from './category-budget.js'
import { buildCategoryBudgetSummaries, summarizeCategoryBudget } from './category-budget-calculations.js'

function entry(overrides: Partial<FinancialEntry> = {}): FinancialEntry {
  return {
    id: Math.floor(Math.random() * 1_000_000),
    householdId: 1,
    periodId: 1,
    categoryId: 1,
    responsibleMemberId: null,
    createdByUserId: 1,
    entryType: 'expense',
    status: 'realized',
    description: 'Despesa de teste',
    expectedAmount: parseMoney('100.00'),
    actualAmount: parseMoney('100.00'),
    dueDate: null,
    realizationDate: '2026-07-05',
    notes: null,
    installmentPlanId: null,
    installmentNumber: null,
    ...overrides,
  }
}

function budget(overrides: Partial<CategoryBudget> = {}): CategoryBudget {
  return { id: 1, householdId: 1, periodId: 1, categoryId: 1, limitAmount: parseMoney('500.00'), ...overrides }
}

describe('summarizeCategoryBudget', () => {
  it('soma realizado, pendente e planejado separadamente', () => {
    const entries = [
      entry({ status: 'realized', actualAmount: parseMoney('100.00') }),
      entry({ status: 'pending', expectedAmount: parseMoney('50.00'), actualAmount: null, realizationDate: null }),
      entry({ status: 'planned', expectedAmount: parseMoney('30.00'), actualAmount: null, realizationDate: null }),
    ]
    const summary = summarizeCategoryBudget(1, 1, entries, [budget()])
    expect(summary.realizedAmount).toBe(parseMoney('100.00'))
    expect(summary.pendingAmount).toBe(parseMoney('50.00'))
    expect(summary.plannedAmount).toBe(parseMoney('30.00'))
    expect(summary.projectedAmount).toBe(parseMoney('180.00'))
  })

  it('cancelled nunca compõe nenhum total', () => {
    const entries = [entry({ status: 'cancelled', actualAmount: null, realizationDate: null })]
    const summary = summarizeCategoryBudget(1, 1, entries, [budget()])
    expect(summary.realizedAmount).toBe(0n)
    expect(summary.projectedAmount).toBe(0n)
  })

  it('status "healthy" quando a projeção é menor que 80% do limite', () => {
    const entries = [entry({ actualAmount: parseMoney('100.00') })] // 100/500 = 20%
    const summary = summarizeCategoryBudget(1, 1, entries, [budget({ limitAmount: parseMoney('500.00') })])
    expect(summary.status).toBe('healthy')
    expect(summary.percentConsumed).toBe(20)
  })

  it('status "attention" quando a projeção é >= 80% e <= 100% do limite', () => {
    const entries = [entry({ actualAmount: parseMoney('420.00') })] // 420/500 = 84%
    const summary = summarizeCategoryBudget(1, 1, entries, [budget({ limitAmount: parseMoney('500.00') })])
    expect(summary.status).toBe('attention')
  })

  it('status "attention" no limiar exato de 80%', () => {
    const entries = [entry({ actualAmount: parseMoney('400.00') })] // 400/500 = 80%
    const summary = summarizeCategoryBudget(1, 1, entries, [budget({ limitAmount: parseMoney('500.00') })])
    expect(summary.status).toBe('attention')
  })

  it('status "exceeded" quando a projeção ultrapassa o limite', () => {
    const entries = [entry({ actualAmount: parseMoney('600.00') })]
    const summary = summarizeCategoryBudget(1, 1, entries, [budget({ limitAmount: parseMoney('500.00') })])
    expect(summary.status).toBe('exceeded')
    expect(summary.exceededAmount).toBe(parseMoney('100.00'))
  })

  it('status "unplanned" quando há despesa mas nenhum limite definido', () => {
    const entries = [entry({ actualAmount: parseMoney('50.00') })]
    const summary = summarizeCategoryBudget(1, 1, entries, [])
    expect(summary.status).toBe('unplanned')
    expect(summary.limitAmount).toBeNull()
    expect(summary.percentConsumed).toBeNull()
    expect(summary.remainingAmount).toBeNull()
    expect(summary.exceededAmount).toBeNull()
  })

  it('nunca produz NaN ou Infinity, mesmo sem limite e sem despesas', () => {
    const summary = summarizeCategoryBudget(1, 1, [], [])
    expect(summary.percentConsumed).toBeNull()
    expect(Number.isNaN(summary.projectedAmount)).toBe(false)
  })

  it('remainingAmount pode ser negativo quando o limite é excedido', () => {
    const entries = [entry({ actualAmount: parseMoney('600.00') })]
    const summary = summarizeCategoryBudget(1, 1, entries, [budget({ limitAmount: parseMoney('500.00') })])
    expect(summary.remainingAmount).toBe(-parseMoney('100.00'))
  })

  it('categorias/competências diferentes não se misturam', () => {
    const entries = [entry({ categoryId: 2, actualAmount: parseMoney('999.00') })]
    const summary = summarizeCategoryBudget(1, 1, entries, [budget()])
    expect(summary.realizedAmount).toBe(0n)
  })
})

describe('buildCategoryBudgetSummaries', () => {
  const categories: Category[] = [
    { id: 1, householdId: 1, name: 'Alimentação', entryType: 'expense', status: 'active' },
    { id: 2, householdId: 1, name: 'Lazer', entryType: 'expense', status: 'active' },
    { id: 3, householdId: 1, name: 'Transporte', entryType: 'expense', status: 'active' },
    { id: 4, householdId: 1, name: 'Salário', entryType: 'income', status: 'active' },
  ]

  it('inclui categoria com limite mesmo sem despesa', () => {
    const summaries = buildCategoryBudgetSummaries(1, [], categories, [budget({ categoryId: 1 })])
    expect(summaries.map((s) => s.categoryId)).toContain(1)
  })

  it('inclui categoria sem limite quando há despesa (unplanned)', () => {
    const entries = [entry({ categoryId: 2, actualAmount: parseMoney('50.00') })]
    const summaries = buildCategoryBudgetSummaries(1, entries, categories, [])
    const leisure = summaries.find((s) => s.categoryId === 2)
    expect(leisure?.status).toBe('unplanned')
  })

  it('omite categoria sem limite e sem despesa', () => {
    const summaries = buildCategoryBudgetSummaries(1, [], categories, [])
    expect(summaries).toEqual([])
  })

  it('nunca inclui categorias do tipo income', () => {
    const entries = [entry({ categoryId: 4, entryType: 'income', actualAmount: parseMoney('1000.00') })]
    const summaries = buildCategoryBudgetSummaries(1, entries, categories, [])
    expect(summaries.some((s) => s.categoryId === 4)).toBe(false)
  })

  it('despesa cancelada sozinha não torna a categoria "unplanned"', () => {
    const entries = [entry({ categoryId: 3, status: 'cancelled', actualAmount: null, realizationDate: null })]
    const summaries = buildCategoryBudgetSummaries(1, entries, categories, [])
    expect(summaries.some((s) => s.categoryId === 3)).toBe(false)
  })
})
