import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import type { FinanceAction, FinanceReadyState, FinanceState } from '../finance-types.ts'
import { CATEGORY_FOOD, CATEGORY_SALARY, createTestFinanceState } from './finance-test-fixtures.ts'
import { financeTestReducer } from './finance-test-reducer.ts'

function asReady(state: FinanceState): FinanceReadyState {
  if (state.status !== 'ready') throw new Error('estado inesperado (não "ready") no teste')
  return state
}

function reduce(state: FinanceReadyState, action: FinanceAction): FinanceReadyState {
  return asReady(financeTestReducer(state, action))
}

function currentPlanned(state: FinanceReadyState) {
  return state.entries.find((entry) => entry.periodId === state.currentPeriodId && entry.status === 'planned')!
}

function currentPending(state: FinanceReadyState) {
  return state.entries.find((entry) => entry.periodId === state.currentPeriodId && entry.status === 'pending')!
}

function currentRealized(state: FinanceReadyState) {
  return state.entries.find((entry) => entry.periodId === state.currentPeriodId && entry.status === 'realized')!
}

function currentCancelled(state: FinanceReadyState) {
  return state.entries.find((entry) => entry.periodId === state.currentPeriodId && entry.status === 'cancelled')!
}

describe('financeTestReducer', () => {
  it('cria uma receita planned', () => {
    const state = createTestFinanceState()
    const next = reduce(state, {
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
  })

  it('cria uma despesa já como pending', () => {
    const state = createTestFinanceState()
    const next = reduce(state, {
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
    const state = createTestFinanceState()
    const next = reduce(state, {
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
    const state = createTestFinanceState()
    const next = reduce(state, {
      type: 'CREATE_ENTRY',
      input: {
        entryType: 'expense',
        description: 'Categoria incompatível',
        categoryId: CATEGORY_SALARY,
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
    const base = createTestFinanceState()
    const state: FinanceReadyState = { ...base, currentPeriodId: 1 }
    const next = reduce(state, {
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
    const state = createTestFinanceState()
    const planned = currentPlanned(state)
    const next = reduce(state, { type: 'UPDATE_ENTRY', id: planned.id, changes: { description: 'Viagem editada' } })
    expect(next.actionError).toBeNull()
    expect(next.entries.find((entry) => entry.id === planned.id)?.description).toBe('Viagem editada')
  })

  it('bloqueia edição direta de uma movimentação realized', () => {
    const state = createTestFinanceState()
    const realized = currentRealized(state)
    const next = reduce(state, { type: 'UPDATE_ENTRY', id: realized.id, changes: { description: 'Não deveria mudar' } })
    expect(next.actionError).toBeTruthy()
    expect(next.entries.find((entry) => entry.id === realized.id)?.description).not.toBe('Não deveria mudar')
  })

  it('marca planned como pending', () => {
    const state = createTestFinanceState()
    const planned = currentPlanned(state)
    const next = reduce(state, { type: 'MARK_PENDING', id: planned.id })
    expect(next.actionError).toBeNull()
    expect(next.entries.find((entry) => entry.id === planned.id)?.status).toBe('pending')
  })

  it('realiza uma movimentação pending com valor e data explícitos', () => {
    const state = createTestFinanceState()
    const pending = currentPending(state)
    const next = reduce(state, { type: 'REALIZE', id: pending.id, actualAmount: parseMoney('120.00'), realizationDate: '2026-07-20' })
    expect(next.actionError).toBeNull()
    const updated = next.entries.find((entry) => entry.id === pending.id)
    expect(updated?.status).toBe('realized')
    expect(updated?.actualAmount).toBe(12000n)
    expect(updated?.realizationDate).toBe('2026-07-20')
  })

  it('cancela uma movimentação planned', () => {
    const state = createTestFinanceState()
    const planned = currentPlanned(state)
    const next = reduce(state, { type: 'CANCEL', id: planned.id })
    expect(next.actionError).toBeNull()
    const updated = next.entries.find((entry) => entry.id === planned.id)
    expect(updated?.status).toBe('cancelled')
    expect(updated?.actualAmount).toBeNull()
  })

  it('reativa uma movimentação cancelled', () => {
    const state = createTestFinanceState()
    const cancelled = currentCancelled(state)
    const next = reduce(state, { type: 'REACTIVATE', id: cancelled.id })
    expect(next.actionError).toBeNull()
    expect(next.entries.find((entry) => entry.id === cancelled.id)?.status).toBe('planned')
  })

  it('impede cancelamento direto de uma movimentação realized', () => {
    const state = createTestFinanceState()
    const realized = currentRealized(state)
    const next = reduce(state, { type: 'CANCEL', id: realized.id })
    expect(next.actionError).toBeTruthy()
    expect(next.entries.find((entry) => entry.id === realized.id)?.status).toBe('realized')
  })

  it('estorna uma movimentação realized de volta para pending', () => {
    const state = createTestFinanceState()
    const realized = currentRealized(state)
    const next = reduce(state, { type: 'REVERT_REALIZATION', id: realized.id })
    expect(next.actionError).toBeNull()
    const updated = next.entries.find((entry) => entry.id === realized.id)
    expect(updated?.status).toBe('pending')
    expect(updated?.actualAmount).toBeNull()
  })

  it('CLEAR_ERROR limpa a mensagem de erro sem alterar as movimentações', () => {
    const state = createTestFinanceState()
    const failed = reduce(state, { type: 'CANCEL', id: currentRealized(state).id })
    expect(failed.actionError).toBeTruthy()
    const cleared = reduce(failed, { type: 'CLEAR_ERROR' })
    expect(cleared.actionError).toBeNull()
    expect(cleared.entries).toBe(failed.entries)
  })

  it('RETRY recria o estado inicial das fixtures', () => {
    const state = createTestFinanceState()
    const changed = reduce(state, { type: 'MARK_PENDING', id: currentPlanned(state).id })
    const retried = asReady(financeTestReducer(changed, { type: 'RETRY' }))
    expect(retried.entries).toEqual(createTestFinanceState().entries)
  })
})
