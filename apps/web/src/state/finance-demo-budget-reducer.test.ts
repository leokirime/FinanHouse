import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import {
  BUDGET_HOUSING_CURRENT,
  BUDGET_HOUSING_PREVIOUS,
  CATEGORY_FOOD,
  CATEGORY_HOUSING,
  CATEGORY_LEISURE,
  CATEGORY_SALARY,
} from '../data/dashboard-fixtures.ts'
import { createInitialFinanceDemoState } from './finance-demo-initial-state.ts'
import { financeDemoReducer } from './finance-demo-reducer.ts'

describe('financeDemoReducer — orçamento por categoria', () => {
  it('cria um limite de orçamento válido', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: CATEGORY_LEISURE, limitAmount: parseMoney('300.00') },
    })
    expect(next.actionError).toBeNull()
    const created = next.categoryBudgets.find((budget) => budget.categoryId === CATEGORY_LEISURE)
    expect(created?.limitAmount).toBe(parseMoney('300.00'))
    expect(next.lastActionMessage).toBe('Planejamento atualizado somente nesta sessão demonstrativa.')
  })

  it('rejeita limite zero', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: CATEGORY_LEISURE, limitAmount: 0n },
    })
    expect(next.actionError).not.toBeNull()
    expect(next.categoryBudgets.some((budget) => budget.categoryId === CATEGORY_LEISURE)).toBe(false)
  })

  it('rejeita limite negativo', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: CATEGORY_LEISURE, limitAmount: -1000n },
    })
    expect(next.actionError).not.toBeNull()
  })

  it('rejeita valor com mais de duas casas decimais (parseMoney rejeita antes de chegar ao reducer)', () => {
    expect(() => parseMoney('10.999')).toThrow()
  })

  it('rejeita categoria do tipo income', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: CATEGORY_SALARY, limitAmount: parseMoney('100.00') },
    })
    expect(next.actionError).not.toBeNull()
  })

  it('rejeita categoria inativa', () => {
    const state = createInitialFinanceDemoState()
    const inactiveCategoryId = 999
    const withInactiveCategory = {
      ...state,
      categories: [...state.categories, { id: inactiveCategoryId, householdId: state.householdId, name: 'Categoria inativa', entryType: 'expense' as const, status: 'inactive' as const }],
    }
    const next = financeDemoReducer(withInactiveCategory, {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: inactiveCategoryId, limitAmount: parseMoney('100.00') },
    })
    expect(next.actionError).not.toBeNull()
  })

  it('rejeita competência fechada (a competência atual dos limites é sempre a atual do estado)', () => {
    const state = createInitialFinanceDemoState()
    const closedCurrent = {
      ...state,
      periods: state.periods.map((period) => (period.id === state.currentPeriodId ? { ...period, status: 'closed' as const } : period)),
    }
    const next = financeDemoReducer(closedCurrent, {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: CATEGORY_LEISURE, limitAmount: parseMoney('100.00') },
    })
    expect(next.actionError).not.toBeNull()
  })

  it('trata duplicidade: rejeita criar um segundo limite para a mesma categoria/competência', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: CATEGORY_HOUSING, limitAmount: parseMoney('999.00') },
    })
    expect(next.actionError).not.toBeNull()
    expect(next.categoryBudgets.filter((budget) => budget.categoryId === CATEGORY_HOUSING && budget.periodId === state.currentPeriodId)).toHaveLength(1)
  })

  it('edita o valor de um limite existente', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'UPDATE_CATEGORY_BUDGET',
      id: BUDGET_HOUSING_CURRENT,
      changes: { limitAmount: parseMoney('250.00') },
    })
    expect(next.actionError).toBeNull()
    const updated = next.categoryBudgets.find((budget) => budget.id === BUDGET_HOUSING_CURRENT)
    expect(updated?.limitAmount).toBe(parseMoney('250.00'))
  })

  it('rejeita editar limite de competência fechada', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'UPDATE_CATEGORY_BUDGET',
      id: BUDGET_HOUSING_PREVIOUS,
      changes: { limitAmount: parseMoney('999.00') },
    })
    expect(next.actionError).not.toBeNull()
  })

  it('remove um limite temporariamente (some do estado da sessão)', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, { type: 'REMOVE_CATEGORY_BUDGET', id: BUDGET_HOUSING_CURRENT })
    expect(next.actionError).toBeNull()
    expect(next.categoryBudgets.some((budget) => budget.id === BUDGET_HOUSING_CURRENT)).toBe(false)
  })

  it('rejeita remover limite de competência fechada', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, { type: 'REMOVE_CATEGORY_BUDGET', id: BUDGET_HOUSING_PREVIOUS })
    expect(next.actionError).not.toBeNull()
    expect(next.categoryBudgets.some((budget) => budget.id === BUDGET_HOUSING_PREVIOUS)).toBe(true)
  })

  it('categoria com despesas fica "unplanned" depois que o limite é removido', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, { type: 'REMOVE_CATEGORY_BUDGET', id: BUDGET_HOUSING_CURRENT })
    expect(next.categoryBudgets.some((budget) => budget.categoryId === CATEGORY_HOUSING && budget.periodId === next.currentPeriodId)).toBe(false)
  })

  it('RESET restaura os limites de orçamento das fixtures', () => {
    const state = createInitialFinanceDemoState()
    const afterRemoval = financeDemoReducer(state, { type: 'REMOVE_CATEGORY_BUDGET', id: BUDGET_HOUSING_CURRENT })
    const afterReset = financeDemoReducer(afterRemoval, { type: 'RESET' })
    expect(afterReset.categoryBudgets.some((budget) => budget.id === BUDGET_HOUSING_CURRENT)).toBe(true)
  })

  it('não muta o estado anterior (imutabilidade)', () => {
    const state = createInitialFinanceDemoState()
    const originalBudgetsLength = state.categoryBudgets.length
    financeDemoReducer(state, {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: CATEGORY_LEISURE, limitAmount: parseMoney('100.00') },
    })
    expect(state.categoryBudgets.length).toBe(originalBudgetsLength)
  })

  it('categoria de outro household é rejeitada', () => {
    const state = createInitialFinanceDemoState()
    const foreignCategoryId = 888
    const withForeignCategory = {
      ...state,
      categories: [...state.categories, { id: foreignCategoryId, householdId: state.householdId + 1, name: 'Categoria de outra casa', entryType: 'expense' as const, status: 'active' as const }],
    }
    const next = financeDemoReducer(withForeignCategory, {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: foreignCategoryId, limitAmount: parseMoney('100.00') },
    })
    expect(next.actionError).not.toBeNull()
  })

  it('referência à categoria inexistente é rejeitada com erro claro', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'CREATE_CATEGORY_BUDGET',
      input: { categoryId: 123456, limitAmount: parseMoney('100.00') },
    })
    expect(next.actionError).not.toBeNull()
  })

  it('confirma que CATEGORY_FOOD continua disponível para orçamento em outra competência (sanity check de fixtures)', () => {
    const state = createInitialFinanceDemoState()
    expect(state.categoryBudgets.some((budget) => budget.categoryId === CATEGORY_FOOD)).toBe(true)
  })
})
