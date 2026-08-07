import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import { buildEntryRows, buildPlanningRealSummary, buildPlanningViewModel } from '../../view-models/planning-view-model.ts'
import type { FinanceReadyState, FinanceState } from '../finance-types.ts'
import { CATEGORY_FOOD, CATEGORY_LEISURE, CATEGORY_SALARY, createTestFinanceState } from './finance-test-fixtures.ts'
import { financeTestReducer } from './finance-test-reducer.ts'

function asReady(state: FinanceState): FinanceReadyState {
  if (state.status !== 'ready') throw new Error('estado inesperado (não "ready") no teste')
  return state
}

function planningFrom(state: FinanceReadyState) {
  // Limites por categoria ainda não têm persistência própria (DT-12) — Planejamento sempre usa `budgets: []`.
  return buildPlanningViewModel({
    periods: state.periods,
    selectedPeriodId: state.currentPeriodId,
    categories: state.categories,
    entries: state.entries,
    budgets: [],
  })
}

describe('sincronização entre o estado financeiro e o planejamento (movimentações reais, sem limite por categoria)', () => {
  it('atualiza a distribuição por categoria após criar uma movimentação de despesa', () => {
    const before = createTestFinanceState()
    const beforeFood = planningFrom(before).rows.find((row) => row.categoryId === CATEGORY_FOOD)!

    const after = asReady(
      financeTestReducer(before, {
        type: 'CREATE_ENTRY',
        input: {
          entryType: 'expense',
          description: 'Compra extra do mês',
          categoryId: CATEGORY_FOOD,
          expectedAmount: parseMoney('40.00'),
          initialStatus: 'pending',
          dueDate: '2026-07-29',
          responsibleMemberId: null,
          notes: null,
        },
      }),
    )
    const afterFood = planningFrom(after).rows.find((row) => row.categoryId === CATEGORY_FOOD)!

    expect(afterFood.projected.raw).toBe(beforeFood.projected.raw + parseMoney('40.00'))
    expect(afterFood.hasLimit).toBe(false)
    expect(afterFood.status).toBe('unplanned')
  })

  it('atualiza o realizado da distribuição após realizar uma movimentação pendente', () => {
    const before = createTestFinanceState()
    const pendingExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'pending' && entry.categoryId === CATEGORY_FOOD,
    )!
    const beforeFood = planningFrom(before).rows.find((row) => row.categoryId === CATEGORY_FOOD)!

    const after = asReady(
      financeTestReducer(before, { type: 'REALIZE', id: pendingExpense.id, actualAmount: parseMoney('20.00'), realizationDate: '2026-07-26' }),
    )
    const afterFood = planningFrom(after).rows.find((row) => row.categoryId === CATEGORY_FOOD)!

    expect(afterFood.realized.raw).toBe(beforeFood.realized.raw + parseMoney('20.00'))
  })

  it('remove a categoria da distribuição quando a única despesa é cancelada e não há limite', () => {
    const before = createTestFinanceState()
    const plannedExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'planned',
    )!
    expect(plannedExpense.categoryId).toBe(CATEGORY_LEISURE)

    const after = asReady(financeTestReducer(before, { type: 'CANCEL', id: plannedExpense.id }))
    const afterLeisure = planningFrom(after).rows.find((row) => row.categoryId === CATEGORY_LEISURE)

    expect(afterLeisure).toBeUndefined()
  })

  it('remove a categoria da distribuição quando a única despesa é excluída e não há limite (Bloco 20)', () => {
    const before = createTestFinanceState()
    const plannedExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'planned',
    )!
    expect(plannedExpense.categoryId).toBe(CATEGORY_LEISURE)

    const after = asReady(financeTestReducer(before, { type: 'DELETE_ENTRY', id: plannedExpense.id }))
    const afterLeisure = planningFrom(after).rows.find((row) => row.categoryId === CATEGORY_LEISURE)

    expect(after.entries.find((entry) => entry.id === plannedExpense.id)).toBeUndefined()
    expect(afterLeisure).toBeUndefined()
  })

  it('reduz o realizado da distribuição após excluir uma movimentação "realized" (correção pós-revisão do Bloco 20)', () => {
    const before = createTestFinanceState()
    const realizedFood = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'realized' && entry.categoryId === CATEGORY_FOOD,
    )!
    const beforeFood = planningFrom(before).rows.find((row) => row.categoryId === CATEGORY_FOOD)!

    const after = asReady(financeTestReducer(before, { type: 'DELETE_ENTRY', id: realizedFood.id }))
    const afterFood = planningFrom(after).rows.find((row) => row.categoryId === CATEGORY_FOOD)!

    expect(after.entries.find((entry) => entry.id === realizedFood.id)).toBeUndefined()
    expect(afterFood.realized.raw).toBe(beforeFood.realized.raw - realizedFood.actualAmount!)
  })

  it('receita planejada aparece separadamente das despesas, via buildEntryRows("income")', () => {
    const state = createTestFinanceState()
    const incomePlanned = buildEntryRows(state.entries, state.categories, state.currentPeriodId, 'planned', 'income')
    const incomePending = buildEntryRows(state.entries, state.categories, state.currentPeriodId, 'pending', 'income')

    expect(incomePlanned.every((row) => row.categoryName !== 'Sem categoria')).toBe(true)
    expect(incomePending.some((row) => row.categoryName === 'Freelance')).toBe(true)
  })

  it('resumo real combina receita/despesa a partir de movimentações — nunca de um limite fictício', () => {
    const state = createTestFinanceState()
    const viewModel = planningFrom(state)
    const summary = buildPlanningRealSummary(state.entries, state.currentPeriodId, viewModel.summary!)

    expect(summary.incomePending.raw).toBeGreaterThan(0n)
    expect(summary.projectedBalance.raw).toBe(summary.incomeProjected.raw - summary.expenseProjected.raw)
  })

  it('criar uma receita não afeta a distribuição de despesas por categoria', () => {
    const before = createTestFinanceState()
    const beforeRows = planningFrom(before).rows

    const after = asReady(
      financeTestReducer(before, {
        type: 'CREATE_ENTRY',
        input: {
          entryType: 'income',
          description: 'Receita extra',
          categoryId: CATEGORY_SALARY,
          expectedAmount: parseMoney('300.00'),
          initialStatus: 'planned',
          dueDate: null,
          responsibleMemberId: null,
          notes: null,
        },
      }),
    )
    const afterRows = planningFrom(after).rows

    expect(afterRows).toEqual(beforeRows)
  })
})
