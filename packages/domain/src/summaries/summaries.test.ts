import { describe, expect, it } from 'vitest'
import type { FinancialEntry } from '../financial-entry/financial-entry.js'
import { parseMoney } from '../money/money.js'
import { calculateChange, calculatePercentChange, compareMonthlyPeriods } from './compare-periods.js'

function entry(periodId: number, overrides: Partial<FinancialEntry> = {}): FinancialEntry {
  return {
    id: Math.floor(Math.random() * 1_000_000),
    householdId: 1,
    periodId,
    categoryId: 20,
    responsibleMemberId: null,
    createdByUserId: 40,
    entryType: 'expense',
    status: 'realized',
    description: 'Movimentação de teste',
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

describe('calculatePercentChange', () => {
  it('calcula percentual de aumento', () => {
    expect(calculatePercentChange(parseMoney('100.00'), parseMoney('150.00'))).toBe(50)
  })

  it('calcula percentual de queda', () => {
    expect(calculatePercentChange(parseMoney('100.00'), parseMoney('50.00'))).toBe(-50)
  })

  it('retorna null quando o período anterior é zero (sem base comparável)', () => {
    expect(calculatePercentChange(0n, parseMoney('100.00'))).toBeNull()
  })

  it('nunca retorna Infinity ou NaN', () => {
    const result = calculatePercentChange(0n, parseMoney('100.00'))
    expect(result).not.toBe(Infinity)
    expect(Number.isNaN(result)).toBe(false)
  })

  it('arredonda a duas casas decimais', () => {
    const result = calculatePercentChange(parseMoney('3.00'), parseMoney('4.00'))
    expect(result).toBe(33.33)
  })
})

describe('calculateChange', () => {
  it('combina variação absoluta e percentual', () => {
    const change = calculateChange(parseMoney('100.00'), parseMoney('120.00'))
    expect(change.absolute).toBe(parseMoney('20.00'))
    expect(change.percent).toBe(20)
  })
})

describe('compareMonthlyPeriods', () => {
  it('compara receitas, despesas e saldo realizado entre dois meses', () => {
    const previous = [
      entry(1, { entryType: 'income', actualAmount: parseMoney('3000.00'), expectedAmount: parseMoney('3000.00') }),
      entry(1, { entryType: 'expense', actualAmount: parseMoney('2000.00'), expectedAmount: parseMoney('2000.00') }),
    ]
    const current = [
      entry(2, { entryType: 'income', actualAmount: parseMoney('3300.00'), expectedAmount: parseMoney('3300.00') }),
      entry(2, { entryType: 'expense', actualAmount: parseMoney('1800.00'), expectedAmount: parseMoney('1800.00') }),
    ]
    const comparison = compareMonthlyPeriods({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(comparison.incomeChange.absolute).toBe(parseMoney('300.00'))
    expect(comparison.expenseChange.absolute).toBe(-parseMoney('200.00'))
    expect(comparison.realizedBalanceChange.absolute).toBe(parseMoney('500.00'))
  })

  it('identifica categorias que mais aumentaram e mais diminuíram', () => {
    const previous = [
      entry(1, { categoryId: 1, actualAmount: parseMoney('100.00'), expectedAmount: parseMoney('100.00') }),
      entry(1, { categoryId: 2, actualAmount: parseMoney('200.00'), expectedAmount: parseMoney('200.00') }),
    ]
    const current = [
      entry(2, { categoryId: 1, actualAmount: parseMoney('180.00'), expectedAmount: parseMoney('180.00') }), // +80
      entry(2, { categoryId: 2, actualAmount: parseMoney('50.00'), expectedAmount: parseMoney('50.00') }), // -150
    ]
    const comparison = compareMonthlyPeriods({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(comparison.categoriesIncreased[0]?.categoryId).toBe(1)
    expect(comparison.categoriesDecreased[0]?.categoryId).toBe(2)
  })

  it('identifica categorias de despesa novas e encerradas', () => {
    const previous = [entry(1, { categoryId: 1 })]
    const current = [entry(2, { categoryId: 2 })]
    const comparison = compareMonthlyPeriods({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(comparison.newExpenseCategories).toEqual([2])
    expect(comparison.discontinuedExpenseCategories).toEqual([1])
  })

  it('categorias canceladas não entram na comparação', () => {
    const previous = [entry(1, { categoryId: 1, status: 'cancelled', actualAmount: null, realizationDate: null })]
    const current = [entry(2, { categoryId: 1, actualAmount: parseMoney('50.00') })]
    const comparison = compareMonthlyPeriods({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    // categoria 1 não existia (de fato) no período anterior porque estava cancelada -> conta como "nova"
    expect(comparison.newExpenseCategories).toEqual([1])
  })

  it('compara previsto vs. realizado do período atual', () => {
    const current = [
      entry(2, {
        status: 'pending',
        expectedAmount: parseMoney('500.00'),
        actualAmount: null,
        realizationDate: null,
      }),
      entry(2, { expectedAmount: parseMoney('100.00'), actualAmount: parseMoney('90.00') }),
    ]
    const comparison = compareMonthlyPeriods({ periodId: 1, entries: [] }, { periodId: 2, entries: current })
    // expected: 500 (pending) + 100 (realized expected) = 600; realized: 90
    expect(comparison.currentExpectedVsRealized.absolute).toBe(-parseMoney('510.00'))
  })

  it('não divide por zero e não produz NaN/Infinity em nenhuma variação', () => {
    const comparison = compareMonthlyPeriods({ periodId: 1, entries: [] }, { periodId: 2, entries: [] })
    expect(comparison.incomeChange.percent).toBeNull()
    expect(comparison.expenseChange.percent).toBeNull()
    expect(comparison.realizedBalanceChange.percent).toBeNull()
  })
})
