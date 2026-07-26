import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import { CATEGORY_FOOD, CATEGORY_SALARY } from '../data/dashboard-fixtures.ts'
import { createInitialFinanceDemoState } from './finance-demo-initial-state.ts'
import { financeDemoReducer } from './finance-demo-reducer.ts'
import type { FinanceDemoState } from './finance-demo-types.ts'

function currentPlanned(state: FinanceDemoState) {
  return state.entries.find((entry) => entry.periodId === state.currentPeriodId && entry.status === 'planned')!
}

function currentPending(state: FinanceDemoState) {
  return state.entries.find((entry) => entry.periodId === state.currentPeriodId && entry.status === 'pending')!
}

function currentRealized(state: FinanceDemoState) {
  return state.entries.find((entry) => entry.periodId === state.currentPeriodId && entry.status === 'realized')!
}

function currentCancelled(state: FinanceDemoState) {
  return state.entries.find((entry) => entry.periodId === state.currentPeriodId && entry.status === 'cancelled')!
}

describe('financeDemoReducer', () => {
  it('cria uma receita planned', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'CREATE_ENTRY',
      input: {
        entryType: 'income',
        description: 'Bônus fictício',
        categoryId: CATEGORY_SALARY,
        expectedAmount: parseMoney('500.00'),
        initialStatus: 'planned',
        dueDate: null,
        responsibleMemberId: null,
        notes: null,
      },
    })
    expect(next.actionError).toBeNull()
    const created = next.entries.find((entry) => entry.description === 'Bônus fictício')
    expect(created?.status).toBe('planned')
    expect(created?.entryType).toBe('income')
    expect(next.lastActionMessage).toBe('Movimentação adicionada à sessão demonstrativa.')
  })

  it('cria uma despesa já como pending', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'CREATE_ENTRY',
      input: {
        entryType: 'expense',
        description: 'Conta fictícia',
        categoryId: CATEGORY_FOOD,
        expectedAmount: parseMoney('80.00'),
        initialStatus: 'pending',
        dueDate: null,
        responsibleMemberId: null,
        notes: null,
      },
    })
    expect(next.actionError).toBeNull()
    const created = next.entries.find((entry) => entry.description === 'Conta fictícia')
    expect(created?.status).toBe('pending')
  })

  it('rejeita valor inválido (zero) ao criar', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'CREATE_ENTRY',
      input: {
        entryType: 'expense',
        description: 'Valor inválido',
        categoryId: CATEGORY_FOOD,
        expectedAmount: parseMoney('0.00'),
        initialStatus: 'planned',
        dueDate: null,
        responsibleMemberId: null,
        notes: null,
      },
    })
    expect(next.actionError).toBeTruthy()
    expect(next.entries).toHaveLength(state.entries.length)
  })

  it('rejeita categoria com entryType incompatível', () => {
    const state = createInitialFinanceDemoState()
    const next = financeDemoReducer(state, {
      type: 'CREATE_ENTRY',
      input: {
        entryType: 'expense',
        description: 'Categoria incompatível',
        categoryId: CATEGORY_SALARY, // categoria de receita usada numa despesa
        expectedAmount: parseMoney('100.00'),
        initialStatus: 'planned',
        dueDate: null,
        responsibleMemberId: null,
        notes: null,
      },
    })
    expect(next.actionError).toBeTruthy()
    expect(next.entries).toHaveLength(state.entries.length)
  })

  it('rejeita criação numa competência fechada', () => {
    const base = createInitialFinanceDemoState()
    const state: FinanceDemoState = { ...base, currentPeriodId: 1 } // janeiro/2026, fechada
    const next = financeDemoReducer(state, {
      type: 'CREATE_ENTRY',
      input: {
        entryType: 'expense',
        description: 'Não deveria entrar',
        categoryId: CATEGORY_FOOD,
        expectedAmount: parseMoney('50.00'),
        initialStatus: 'planned',
        dueDate: null,
        responsibleMemberId: null,
        notes: null,
      },
    })
    expect(next.actionError).toBeTruthy()
    expect(next.entries).toHaveLength(state.entries.length)
  })

  it('edita uma movimentação planned', () => {
    const state = createInitialFinanceDemoState()
    const planned = currentPlanned(state)
    const next = financeDemoReducer(state, { type: 'UPDATE_ENTRY', id: planned.id, changes: { description: 'Viagem editada' } })
    expect(next.actionError).toBeNull()
    expect(next.entries.find((entry) => entry.id === planned.id)?.description).toBe('Viagem editada')
  })

  it('edita uma movimentação pending', () => {
    const state = createInitialFinanceDemoState()
    const pending = currentPending(state)
    const next = financeDemoReducer(state, { type: 'UPDATE_ENTRY', id: pending.id, changes: { description: 'Pendente editada' } })
    expect(next.actionError).toBeNull()
    expect(next.entries.find((entry) => entry.id === pending.id)?.description).toBe('Pendente editada')
  })

  it('bloqueia edição direta de uma movimentação realized', () => {
    const state = createInitialFinanceDemoState()
    const realized = currentRealized(state)
    const next = financeDemoReducer(state, { type: 'UPDATE_ENTRY', id: realized.id, changes: { description: 'Não deveria mudar' } })
    expect(next.actionError).toBeTruthy()
    expect(next.entries.find((entry) => entry.id === realized.id)?.description).not.toBe('Não deveria mudar')
  })

  it('marca planned como pending', () => {
    const state = createInitialFinanceDemoState()
    const planned = currentPlanned(state)
    const next = financeDemoReducer(state, { type: 'MARK_PENDING', id: planned.id })
    expect(next.actionError).toBeNull()
    expect(next.entries.find((entry) => entry.id === planned.id)?.status).toBe('pending')
  })

  it('realiza uma movimentação pending com valor e data explícitos', () => {
    const state = createInitialFinanceDemoState()
    const pending = currentPending(state)
    const next = financeDemoReducer(state, {
      type: 'REALIZE',
      id: pending.id,
      actualAmount: parseMoney('120.00'),
      realizationDate: '2026-07-20',
    })
    expect(next.actionError).toBeNull()
    const updated = next.entries.find((entry) => entry.id === pending.id)
    expect(updated?.status).toBe('realized')
    expect(updated?.actualAmount).toBe(12000n)
    expect(updated?.realizationDate).toBe('2026-07-20')
  })

  it('cancela uma movimentação planned', () => {
    const state = createInitialFinanceDemoState()
    const planned = currentPlanned(state)
    const next = financeDemoReducer(state, { type: 'CANCEL', id: planned.id })
    expect(next.actionError).toBeNull()
    const updated = next.entries.find((entry) => entry.id === planned.id)
    expect(updated?.status).toBe('cancelled')
    expect(updated?.actualAmount).toBeNull()
    expect(updated?.realizationDate).toBeNull()
  })

  it('cancela uma movimentação pending', () => {
    const state = createInitialFinanceDemoState()
    const pending = currentPending(state)
    const next = financeDemoReducer(state, { type: 'CANCEL', id: pending.id })
    expect(next.actionError).toBeNull()
    expect(next.entries.find((entry) => entry.id === pending.id)?.status).toBe('cancelled')
  })

  it('reativa uma movimentação cancelled', () => {
    const state = createInitialFinanceDemoState()
    const cancelled = currentCancelled(state)
    const next = financeDemoReducer(state, { type: 'REACTIVATE', id: cancelled.id })
    expect(next.actionError).toBeNull()
    expect(next.entries.find((entry) => entry.id === cancelled.id)?.status).toBe('planned')
  })

  it('impede cancelamento direto de uma movimentação realized', () => {
    const state = createInitialFinanceDemoState()
    const realized = currentRealized(state)
    const next = financeDemoReducer(state, { type: 'CANCEL', id: realized.id })
    expect(next.actionError).toBeTruthy()
    expect(next.entries.find((entry) => entry.id === realized.id)?.status).toBe('realized')
  })

  it('estorna uma movimentação realized de volta para pending (ajuste explícito já suportado pelo domínio)', () => {
    const state = createInitialFinanceDemoState()
    const realized = currentRealized(state)
    const next = financeDemoReducer(state, { type: 'REVERT_REALIZATION', id: realized.id })
    expect(next.actionError).toBeNull()
    const updated = next.entries.find((entry) => entry.id === realized.id)
    expect(updated?.status).toBe('pending')
    expect(updated?.actualAmount).toBeNull()
  })

  it('CLEAR_ERROR limpa a mensagem de erro sem alterar as movimentações', () => {
    const state = createInitialFinanceDemoState()
    const failed = financeDemoReducer(state, { type: 'CANCEL', id: currentRealized(state).id })
    expect(failed.actionError).toBeTruthy()
    const cleared = financeDemoReducer(failed, { type: 'CLEAR_ERROR' })
    expect(cleared.actionError).toBeNull()
    expect(cleared.entries).toBe(failed.entries)
  })

  it('RESET volta ao estado inicial das fixtures', () => {
    const state = createInitialFinanceDemoState()
    const changed = financeDemoReducer(state, { type: 'MARK_PENDING', id: currentPlanned(state).id })
    const reset = financeDemoReducer(changed, { type: 'RESET' })
    expect(reset.entries).toEqual(createInitialFinanceDemoState().entries)
  })
})
