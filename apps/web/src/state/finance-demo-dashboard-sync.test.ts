import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import { CATEGORY_FOOD } from '../data/dashboard-fixtures.ts'
import { buildDashboardViewModel } from '../view-models/dashboard-view-model.ts'
import { createInitialFinanceDemoState } from './finance-demo-initial-state.ts'
import { financeDemoReducer } from './finance-demo-reducer.ts'
import type { FinanceDemoState } from './finance-demo-types.ts'

function dashboardFrom(state: FinanceDemoState) {
  return buildDashboardViewModel({
    entries: state.entries,
    categories: state.categories,
    periods: state.periods,
    currentPeriodId: state.currentPeriodId,
    previousPeriodId: state.previousPeriodId,
  })
}

/**
 * Garante que dashboard e Movimentações derivam do mesmo estado: qualquer
 * mudança feita pelo reducer precisa aparecer no view-model do dashboard na
 * próxima leitura, sem nenhum número "paralelo".
 */
describe('sincronização entre o estado demonstrativo e o dashboard', () => {
  it('atualiza os indicadores do dashboard após uma criação', () => {
    const before = createInitialFinanceDemoState()
    const beforeDashboard = dashboardFrom(before)

    const after = financeDemoReducer(before, {
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
    })
    const afterDashboard = dashboardFrom(after)

    // Uma movimentação "pending" não altera receitas/despesas realizadas,
    // mas deve aparecer nas movimentações recentes ou no total de pendências
    // — a asserção robusta aqui é que os dois view-models não são idênticos.
    expect(afterDashboard).not.toEqual(beforeDashboard)
  })

  it('atualiza receita/despesa realizada do dashboard após uma realização', () => {
    const before = createInitialFinanceDemoState()
    const pending = before.entries.find((entry) => entry.periodId === before.currentPeriodId && entry.status === 'pending')!
    const beforeSummary = dashboardFrom(before).indicators.find((indicator) => indicator.key === 'realizedExpense')

    const after = financeDemoReducer(before, {
      type: 'REALIZE',
      id: pending.id,
      actualAmount: parseMoney('999.00'),
      realizationDate: '2026-07-22',
    })
    const afterSummary = dashboardFrom(after).indicators.find((indicator) => indicator.key === 'realizedExpense')

    if (pending.entryType === 'expense') {
      expect(afterSummary?.value).not.toBe(beforeSummary?.value)
    }
    // A movimentação realizada passa a aparecer nas movimentações recentes.
    const afterRecent = dashboardFrom(after).recentEntries.map((entry) => entry.id)
    expect(afterRecent).toContain(pending.id)
  })

  it('remove uma movimentação cancelada dos totais do dashboard', () => {
    const before = createInitialFinanceDemoState()
    const planned = before.entries.find((entry) => entry.periodId === before.currentPeriodId && entry.status === 'planned')!
    const beforeBreakdown = dashboardFrom(before).categoryBreakdown

    const after = financeDemoReducer(before, { type: 'CANCEL', id: planned.id })
    const afterBreakdown = dashboardFrom(after).categoryBreakdown

    // Cancelada nunca compõe a distribuição por categoria — o total daquela
    // categoria (se `planned` era despesa) deve cair ou a categoria some.
    if (planned.entryType === 'expense') {
      expect(afterBreakdown).not.toEqual(beforeBreakdown)
    }
  })
})
