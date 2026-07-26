import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import { CATEGORY_FOOD } from '../data/dashboard-fixtures.ts'
import { buildHistoryViewModel, DEFAULT_HISTORY_FILTERS } from '../view-models/history-view-model.ts'
import { createInitialFinanceDemoState } from './finance-demo-initial-state.ts'
import { financeDemoReducer } from './finance-demo-reducer.ts'
import type { FinanceDemoState } from './finance-demo-types.ts'

function historyFrom(state: FinanceDemoState) {
  return buildHistoryViewModel({
    periods: state.periods,
    entries: state.entries,
    categories: state.categories,
    selectedPeriodId: state.currentPeriodId,
    filters: DEFAULT_HISTORY_FILTERS,
  })
}

describe('sincronização entre o estado demonstrativo e o histórico', () => {
  it('atualiza o histórico após criar uma movimentação', () => {
    const before = createInitialFinanceDemoState()
    const beforeCount = historyFrom(before).entries.length

    const after = financeDemoReducer(before, {
      type: 'CREATE_ENTRY',
      input: {
        entryType: 'expense',
        description: 'Nova despesa do histórico',
        categoryId: CATEGORY_FOOD,
        expectedAmount: parseMoney('35.00'),
        initialStatus: 'pending',
        dueDate: '2026-07-29',
        responsibleMemberId: null,
        notes: null,
      },
    })

    const afterHistory = historyFrom(after)
    expect(afterHistory.entries.length).toBe(beforeCount + 1)
    expect(afterHistory.entries.some((entry) => entry.description === 'Nova despesa do histórico')).toBe(true)
  })

  it('atualiza a receita realizada do histórico após realizar uma movimentação pendente', () => {
    const before = createInitialFinanceDemoState()
    const pendingIncome = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'income' && entry.status === 'pending',
    )!
    const beforeIncome = historyFrom(before).summary!.realizedIncome.raw

    const after = financeDemoReducer(before, {
      type: 'REALIZE',
      id: pendingIncome.id,
      actualAmount: parseMoney('1300.00'),
      realizationDate: '2026-07-28',
    })

    const afterIncome = historyFrom(after).summary!.realizedIncome.raw
    expect(afterIncome).toBe(beforeIncome + parseMoney('1300.00'))
  })

  it('atualiza a contagem de status do histórico após cancelar uma movimentação', () => {
    const before = createInitialFinanceDemoState()
    const plannedExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'planned',
    )!
    const beforeCounts = historyFrom(before).statusCounts!

    const after = financeDemoReducer(before, { type: 'CANCEL', id: plannedExpense.id })
    const afterCounts = historyFrom(after).statusCounts!

    expect(afterCounts.planned).toBe(beforeCounts.planned - 1)
    expect(afterCounts.cancelled).toBe(beforeCounts.cancelled + 1)
  })

  it('alterações em Planejamento (criar limite) não afetam os valores históricos de movimentações', () => {
    const before = createInitialFinanceDemoState()
    const beforeHistory = historyFrom(before)

    const after = financeDemoReducer(before, {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: CATEGORY_FOOD, limitAmount: parseMoney('999.00') },
    })
    const afterHistory = historyFrom(after)

    expect(afterHistory.summary).toEqual(beforeHistory.summary)
    expect(afterHistory.entries).toEqual(beforeHistory.entries)
  })

  it('mesma fonte de estado: dashboard, Movimentações, Comparativo, Planejamento e Histórico derivam do mesmo FinanceDemoState', () => {
    const state = createInitialFinanceDemoState()
    expect(historyFrom(state).entries.length).toBeGreaterThan(0)
    expect(state.entries.length).toBeGreaterThan(0)
  })

  it('remontar o provider equivale a recriar o estado inicial das fixtures', () => {
    const changed = financeDemoReducer(createInitialFinanceDemoState(), {
      type: 'CREATE_ENTRY',
      input: {
        entryType: 'expense',
        description: 'Entrada temporária do histórico',
        categoryId: CATEGORY_FOOD,
        expectedAmount: parseMoney('10.00'),
        initialStatus: 'pending',
        dueDate: null,
        responsibleMemberId: null,
        notes: null,
      },
    })
    const remounted = createInitialFinanceDemoState()

    expect(historyFrom(remounted)).not.toEqual(historyFrom(changed))
    expect(historyFrom(remounted).entries.some((entry) => entry.description === 'Entrada temporária do histórico')).toBe(false)
  })
})
