import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import { buildDashboardViewModel } from '../../view-models/dashboard-view-model.ts'
import type { FinanceReadyState, FinanceState } from '../finance-types.ts'
import { CATEGORY_FOOD, createTestFinanceState } from './finance-test-fixtures.ts'
import { financeTestReducer } from './finance-test-reducer.ts'

function asReady(state: FinanceState): FinanceReadyState {
  if (state.status !== 'ready') throw new Error('estado inesperado (não "ready") no teste')
  return state
}

function dashboardFrom(state: FinanceReadyState) {
  return buildDashboardViewModel({
    entries: state.entries,
    categories: state.categories,
    periods: state.periods,
    currentPeriodId: state.currentPeriodId,
    previousPeriodId: state.previousPeriodId ?? -1,
  })
}

/** Garante que dashboard e Movimentações derivam do mesmo estado real — nenhum número "paralelo". */
describe('sincronização entre o estado financeiro e o dashboard', () => {
  it('atualiza os indicadores do dashboard após uma criação', () => {
    const before = createTestFinanceState()
    const beforeDashboard = dashboardFrom(before)

    const after = asReady(
      financeTestReducer(before, {
        type: 'CREATE_ENTRY',
        input: {
          entryType: 'expense',
          description: 'Nova despesa de teste',
          categoryId: CATEGORY_FOOD,
          expectedAmount: parseMoney('80.00'),
          initialStatus: 'pending',
          dueDate: null,
          responsibleMemberId: null,
          notes: null,
        },
      }),
    )
    const afterDashboard = dashboardFrom(after)

    expect(afterDashboard).not.toEqual(beforeDashboard)
  })

  it('atualiza receita/despesa realizada do dashboard após uma realização', () => {
    const before = createTestFinanceState()
    const pending = before.entries.find((entry) => entry.periodId === before.currentPeriodId && entry.status === 'pending')!
    const beforeSummary = dashboardFrom(before).indicators.find((indicator) => indicator.key === 'realizedExpense')

    const after = asReady(
      financeTestReducer(before, { type: 'REALIZE', id: pending.id, actualAmount: parseMoney('999.00'), realizationDate: '2026-07-22' }),
    )
    const afterSummary = dashboardFrom(after).indicators.find((indicator) => indicator.key === 'realizedExpense')

    if (pending.entryType === 'expense') {
      expect(afterSummary?.value).not.toBe(beforeSummary?.value)
    }
    const afterRecent = dashboardFrom(after).recentEntries.map((entry) => entry.id)
    expect(afterRecent).toContain(pending.id)
  })

  it('remove uma movimentação cancelada dos totais do dashboard', () => {
    const before = createTestFinanceState()
    const planned = before.entries.find((entry) => entry.periodId === before.currentPeriodId && entry.status === 'planned')!
    const beforeBreakdown = dashboardFrom(before).categoryBreakdown

    const after = asReady(financeTestReducer(before, { type: 'CANCEL', id: planned.id }))
    const afterBreakdown = dashboardFrom(after).categoryBreakdown

    if (planned.entryType === 'expense') {
      expect(afterBreakdown).not.toEqual(beforeBreakdown)
    }
  })

  it('remove uma movimentação excluída dos totais do dashboard (Bloco 20)', () => {
    const before = createTestFinanceState()
    const planned = before.entries.find((entry) => entry.periodId === before.currentPeriodId && entry.status === 'planned')!
    const beforeBreakdown = dashboardFrom(before).categoryBreakdown

    const after = asReady(financeTestReducer(before, { type: 'DELETE_ENTRY', id: planned.id }))
    const afterBreakdown = dashboardFrom(after).categoryBreakdown

    expect(after.entries.find((entry) => entry.id === planned.id)).toBeUndefined()
    if (planned.entryType === 'expense') {
      expect(afterBreakdown).not.toEqual(beforeBreakdown)
    }
  })

  it('recalcula a despesa realizada do dashboard após excluir uma movimentação "realized" (correção pós-revisão do Bloco 20)', () => {
    const before = createTestFinanceState()
    const realizedExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.status === 'realized' && entry.entryType === 'expense',
    )!
    const beforeIndicator = dashboardFrom(before).indicators.find((indicator) => indicator.key === 'realizedExpense')

    const after = asReady(financeTestReducer(before, { type: 'DELETE_ENTRY', id: realizedExpense.id }))
    const afterIndicator = dashboardFrom(after).indicators.find((indicator) => indicator.key === 'realizedExpense')

    expect(after.actionError).toBeNull()
    expect(after.entries.find((entry) => entry.id === realizedExpense.id)).toBeUndefined()
    expect(afterIndicator?.value).not.toBe(beforeIndicator?.value)
  })
})
