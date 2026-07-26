import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import { CATEGORY_FOOD } from '../data/dashboard-fixtures.ts'
import { buildComparisonViewModel } from '../view-models/comparison-view-model.ts'
import { createInitialFinanceDemoState } from './finance-demo-initial-state.ts'
import { financeDemoReducer } from './finance-demo-reducer.ts'
import type { FinanceDemoState } from './finance-demo-types.ts'

function comparisonFrom(state: FinanceDemoState) {
  return buildComparisonViewModel({
    periods: state.periods,
    entries: state.entries,
    categories: state.categories,
    basePeriodId: state.currentPeriodId,
    comparedPeriodId: state.previousPeriodId,
  })
}

describe('sincronização entre o estado demonstrativo e o comparativo', () => {
  it('atualiza o comparativo após criar uma movimentação', () => {
    const before = createInitialFinanceDemoState()
    const beforeComparison = comparisonFrom(before)

    const after = financeDemoReducer(before, {
      type: 'CREATE_ENTRY',
      input: {
        entryType: 'expense',
        description: 'Despesa nova do comparativo',
        categoryId: CATEGORY_FOOD,
        expectedAmount: parseMoney('70.00'),
        initialStatus: 'pending',
        dueDate: '2026-07-29',
        responsibleMemberId: null,
        notes: null,
      },
    })

    const afterComparison = comparisonFrom(after)
    expect(afterComparison.newExpenses.map((expense) => expense.description)).toContain('Despesa nova do comparativo')
    expect(afterComparison.chart.summary).not.toBe(beforeComparison.chart.summary)
  })

  it('atualiza indicadores após realizar uma movimentação pendente', () => {
    const before = createInitialFinanceDemoState()
    const pendingExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'pending',
    )!
    const beforeExpense = comparisonFrom(before).indicators.find((indicator) => indicator.key === 'realizedExpense')?.base.label

    const after = financeDemoReducer(before, {
      type: 'REALIZE',
      id: pendingExpense.id,
      actualAmount: parseMoney('123.00'),
      realizationDate: '2026-07-26',
    })
    const afterExpense = comparisonFrom(after).indicators.find((indicator) => indicator.key === 'realizedExpense')?.base.label

    expect(afterExpense).not.toBe(beforeExpense)
    expect(afterExpense).toBe('R$ 2.533,00')
  })

  it('remove a despesa cancelada dos totais projetados do comparativo', () => {
    const before = createInitialFinanceDemoState()
    const plannedExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'planned',
    )!
    const beforeProjected = comparisonFrom(before).indicators.find((indicator) => indicator.key === 'projectedBalance')?.base.label

    const after = financeDemoReducer(before, { type: 'CANCEL', id: plannedExpense.id })
    const afterProjected = comparisonFrom(after).indicators.find((indicator) => indicator.key === 'projectedBalance')?.base.label

    expect(afterProjected).not.toBe(beforeProjected)
    expect(afterProjected).toBe('R$ 7.080,00')
  })

  it('remontar o provider equivale a recriar o estado inicial das fixtures', () => {
    const changed = financeDemoReducer(createInitialFinanceDemoState(), {
      type: 'CREATE_ENTRY',
      input: {
        entryType: 'expense',
        description: 'Entrada temporária',
        categoryId: CATEGORY_FOOD,
        expectedAmount: parseMoney('50.00'),
        initialStatus: 'pending',
        dueDate: null,
        responsibleMemberId: null,
        notes: null,
      },
    })
    const remounted = createInitialFinanceDemoState()

    expect(comparisonFrom(remounted)).not.toEqual(comparisonFrom(changed))
    expect(comparisonFrom(remounted).newExpenses.map((expense) => expense.description)).not.toContain('Entrada temporária')
  })
})
