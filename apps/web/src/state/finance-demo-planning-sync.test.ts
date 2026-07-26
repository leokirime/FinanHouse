import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import { BUDGET_HOUSING_CURRENT, CATEGORY_FOOD, CATEGORY_HOUSING, CATEGORY_LEISURE } from '../data/dashboard-fixtures.ts'
import { buildPlanningViewModel } from '../view-models/planning-view-model.ts'
import { createInitialFinanceDemoState } from './finance-demo-initial-state.ts'
import { financeDemoReducer } from './finance-demo-reducer.ts'
import type { FinanceDemoState } from './finance-demo-types.ts'

function planningFrom(state: FinanceDemoState) {
  return buildPlanningViewModel({
    periods: state.periods,
    selectedPeriodId: state.currentPeriodId,
    categories: state.categories,
    entries: state.entries,
    budgets: state.categoryBudgets,
  })
}

describe('sincronização entre o estado demonstrativo e o planejamento', () => {
  it('atualiza o planejamento após criar uma movimentação de despesa', () => {
    const before = createInitialFinanceDemoState()
    const beforeFood = planningFrom(before).rows.find((row) => row.categoryId === CATEGORY_FOOD)!

    const after = financeDemoReducer(before, {
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
    })
    const afterFood = planningFrom(after).rows.find((row) => row.categoryId === CATEGORY_FOOD)!

    expect(afterFood.projected.raw).toBe(beforeFood.projected.raw + parseMoney('40.00'))
  })

  it('atualiza o realizado do planejamento após realizar uma movimentação pendente', () => {
    const before = createInitialFinanceDemoState()
    const pendingExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'pending' && entry.categoryId === CATEGORY_FOOD,
    )!
    const beforeFood = planningFrom(before).rows.find((row) => row.categoryId === CATEGORY_FOOD)!

    const after = financeDemoReducer(before, {
      type: 'REALIZE',
      id: pendingExpense.id,
      actualAmount: parseMoney('20.00'),
      realizationDate: '2026-07-26',
    })
    const afterFood = planningFrom(after).rows.find((row) => row.categoryId === CATEGORY_FOOD)!

    expect(afterFood.realized.raw).toBe(beforeFood.realized.raw + parseMoney('20.00'))
    expect(afterFood.pending.raw).toBe(0n) // a única despesa "pending" de Alimentação foi realizada

  })

  it('remove a despesa cancelada dos totais projetados do planejamento', () => {
    const before = createInitialFinanceDemoState()
    const plannedExpense = before.entries.find(
      (entry) => entry.periodId === before.currentPeriodId && entry.entryType === 'expense' && entry.status === 'planned',
    )!
    const beforePlanning = planningFrom(before)
    const beforeLeisure = beforePlanning.rows.find((row) => row.categoryId === CATEGORY_LEISURE)!
    expect(beforeLeisure.status).toBe('unplanned')

    const after = financeDemoReducer(before, { type: 'CANCEL', id: plannedExpense.id })
    const afterLeisure = planningFrom(after).rows.find((row) => row.categoryId === CATEGORY_LEISURE)

    // Sem mais despesa não cancelada nem limite: categoria some da lista.
    expect(afterLeisure).toBeUndefined()
  })

  it('atualiza os indicadores após editar o limite de uma categoria', () => {
    const before = createInitialFinanceDemoState()
    const after = financeDemoReducer(before, {
      type: 'UPDATE_CATEGORY_BUDGET',
      id: BUDGET_HOUSING_CURRENT,
      changes: { limitAmount: parseMoney('100.00') },
    })
    const housing = planningFrom(after).rows.find((row) => row.categoryId === CATEGORY_HOUSING)!
    expect(housing.status).toBe('exceeded')
  })

  it('categoria vira "unplanned" após remover seu limite, se ainda houver despesa', () => {
    const before = createInitialFinanceDemoState()
    const after = financeDemoReducer(before, { type: 'REMOVE_CATEGORY_BUDGET', id: BUDGET_HOUSING_CURRENT })
    const housing = planningFrom(after).rows.find((row) => row.categoryId === CATEGORY_HOUSING)!
    expect(housing.status).toBe('unplanned')
    expect(housing.hasLimit).toBe(false)
  })

  it('mesma fonte de estado: dashboard, movimentações e planejamento derivam do mesmo FinanceDemoState', () => {
    const state = createInitialFinanceDemoState()
    expect(planningFrom(state).rows.length).toBeGreaterThan(0)
    expect(state.entries.length).toBeGreaterThan(0)
  })

  it('remontar o provider equivale a recriar o estado inicial das fixtures', () => {
    const changed = financeDemoReducer(createInitialFinanceDemoState(), {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: CATEGORY_LEISURE, limitAmount: parseMoney('999.00') },
    })
    const remounted = createInitialFinanceDemoState()

    expect(planningFrom(remounted)).not.toEqual(planningFrom(changed))
    expect(remounted.categoryBudgets.some((budget) => budget.categoryId === CATEGORY_LEISURE)).toBe(false)
  })
})
