import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import { buildComparisonViewModel } from '../../view-models/comparison-view-model.ts'
import type { FinanceReadyState, FinanceState } from '../finance-types.ts'
import { CATEGORY_FOOD, createTestFinanceState } from './finance-test-fixtures.ts'
import { financeTestReducer } from './finance-test-reducer.ts'

function asReady(state: FinanceState): FinanceReadyState {
  if (state.status !== 'ready') throw new Error('estado inesperado (não "ready") no teste')
  return state
}

function comparisonFrom(state: FinanceReadyState) {
  return buildComparisonViewModel({
    periods: state.periods,
    entries: state.entries,
    categories: state.categories,
    basePeriodId: state.currentPeriodId,
    comparedPeriodId: state.previousPeriodId,
  })
}

describe('sincronização entre o estado financeiro e o comparativo', () => {
  it('atualiza o comparativo após criar uma movimentação', () => {
    const before = createTestFinanceState()
    const beforeComparison = comparisonFrom(before)

    const after = asReady(
      financeTestReducer(before, {
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
      }),
    )

    const afterComparison = comparisonFrom(after)
    expect(afterComparison.newExpenses.map((expense) => expense.description)).toContain('Despesa nova do comparativo')
    expect(afterComparison.chart.summary).not.toBe(beforeComparison.chart.summary)
  })

  it('atualiza indicadores após realizar uma movimentação pendente', () => {
    const before = createTestFinanceState()
    const pendingExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'pending',
    )!
    const beforeExpense = comparisonFrom(before).indicators.find((indicator) => indicator.key === 'realizedExpense')?.base.label

    const after = asReady(
      financeTestReducer(before, { type: 'REALIZE', id: pendingExpense.id, actualAmount: parseMoney('123.00'), realizationDate: '2026-07-26' }),
    )
    const afterExpense = comparisonFrom(after).indicators.find((indicator) => indicator.key === 'realizedExpense')?.base.label

    expect(afterExpense).not.toBe(beforeExpense)
  })

  it('remove a despesa cancelada dos totais projetados do comparativo', () => {
    const before = createTestFinanceState()
    const plannedExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'planned',
    )!
    const beforeProjected = comparisonFrom(before).indicators.find((indicator) => indicator.key === 'projectedBalance')?.base.label

    const after = asReady(financeTestReducer(before, { type: 'CANCEL', id: plannedExpense.id }))
    const afterProjected = comparisonFrom(after).indicators.find((indicator) => indicator.key === 'projectedBalance')?.base.label

    expect(afterProjected).not.toBe(beforeProjected)
  })

  it('remove a despesa excluída dos totais projetados do comparativo (Bloco 20)', () => {
    const before = createTestFinanceState()
    const plannedExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'planned',
    )!
    const beforeProjected = comparisonFrom(before).indicators.find((indicator) => indicator.key === 'projectedBalance')?.base.label

    const after = asReady(financeTestReducer(before, { type: 'DELETE_ENTRY', id: plannedExpense.id }))
    const afterProjected = comparisonFrom(after).indicators.find((indicator) => indicator.key === 'projectedBalance')?.base.label

    expect(after.entries.find((entry) => entry.id === plannedExpense.id)).toBeUndefined()
    expect(afterProjected).not.toBe(beforeProjected)
  })

  it('recalcula a despesa realizada do comparativo após excluir uma movimentação "realized" (correção pós-revisão do Bloco 20)', () => {
    const before = createTestFinanceState()
    const realizedExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'realized',
    )!
    const beforeExpense = comparisonFrom(before).indicators.find((indicator) => indicator.key === 'realizedExpense')?.base.label

    const after = asReady(financeTestReducer(before, { type: 'DELETE_ENTRY', id: realizedExpense.id }))
    const afterExpense = comparisonFrom(after).indicators.find((indicator) => indicator.key === 'realizedExpense')?.base.label

    expect(after.entries.find((entry) => entry.id === realizedExpense.id)).toBeUndefined()
    expect(afterExpense).not.toBe(beforeExpense)
  })
})
