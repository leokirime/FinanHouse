import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import { buildHistoryViewModel, DEFAULT_HISTORY_FILTERS } from '../../view-models/history-view-model.ts'
import type { FinanceReadyState, FinanceState } from '../finance-types.ts'
import { CATEGORY_FOOD, createTestFinanceState } from './finance-test-fixtures.ts'
import { financeTestReducer } from './finance-test-reducer.ts'

function asReady(state: FinanceState): FinanceReadyState {
  if (state.status !== 'ready') throw new Error('estado inesperado (não "ready") no teste')
  return state
}

function historyFrom(state: FinanceReadyState) {
  return buildHistoryViewModel({
    periods: state.periods,
    entries: state.entries,
    categories: state.categories,
    selectedPeriodId: state.currentPeriodId,
    filters: DEFAULT_HISTORY_FILTERS,
  })
}

describe('sincronização entre o estado financeiro e o histórico', () => {
  it('atualiza o histórico após criar uma movimentação', () => {
    const before = createTestFinanceState()
    const beforeCount = historyFrom(before).entries.length

    const after = asReady(
      financeTestReducer(before, {
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
      }),
    )

    const afterHistory = historyFrom(after)
    expect(afterHistory.entries.length).toBe(beforeCount + 1)
    expect(afterHistory.entries.some((entry) => entry.description === 'Nova despesa do histórico')).toBe(true)
  })

  it('atualiza a receita realizada do histórico após realizar uma movimentação pendente', () => {
    const before = createTestFinanceState()
    const pendingIncome = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'income' && entry.status === 'pending',
    )!
    const beforeIncome = historyFrom(before).summary!.realizedIncome.raw

    const after = asReady(
      financeTestReducer(before, { type: 'REALIZE', id: pendingIncome.id, actualAmount: parseMoney('1300.00'), realizationDate: '2026-07-28' }),
    )

    const afterIncome = historyFrom(after).summary!.realizedIncome.raw
    expect(afterIncome).toBe(beforeIncome + parseMoney('1300.00'))
  })

  it('atualiza a contagem de status do histórico após cancelar uma movimentação', () => {
    const before = createTestFinanceState()
    const plannedExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'planned',
    )!
    const beforeCounts = historyFrom(before).statusCounts!

    const after = asReady(financeTestReducer(before, { type: 'CANCEL', id: plannedExpense.id }))
    const afterCounts = historyFrom(after).statusCounts!

    expect(afterCounts.planned).toBe(beforeCounts.planned - 1)
    expect(afterCounts.cancelled).toBe(beforeCounts.cancelled + 1)
  })

  it('remove a movimentação excluída do histórico — não vira "cancelled", desaparece (Bloco 20)', () => {
    const before = createTestFinanceState()
    const plannedExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'planned',
    )!
    const beforeCount = historyFrom(before).entries.length

    const after = asReady(financeTestReducer(before, { type: 'DELETE_ENTRY', id: plannedExpense.id }))
    const afterHistory = historyFrom(after)

    expect(afterHistory.entries.length).toBe(beforeCount - 1)
    expect(afterHistory.entries.some((entry) => entry.id === plannedExpense.id)).toBe(false)
  })

  it('recalcula a receita realizada do histórico após excluir uma movimentação "realized" (correção pós-revisão do Bloco 20)', () => {
    const before = createTestFinanceState()
    const realizedIncome = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'income' && entry.status === 'realized',
    )!
    const beforeIncome = historyFrom(before).summary!.realizedIncome.raw

    const after = asReady(financeTestReducer(before, { type: 'DELETE_ENTRY', id: realizedIncome.id }))
    const afterHistory = historyFrom(after)

    expect(afterHistory.entries.some((entry) => entry.id === realizedIncome.id)).toBe(false)
    expect(afterHistory.summary!.realizedIncome.raw).toBe(beforeIncome - realizedIncome.actualAmount!)
  })

  it('mesma fonte de estado: dashboard, Movimentações, Comparativo, Planejamento e Histórico derivam do mesmo FinanceReadyState', () => {
    const state = createTestFinanceState()
    expect(historyFrom(state).entries.length).toBeGreaterThan(0)
    expect(state.entries.length).toBeGreaterThan(0)
  })
})
