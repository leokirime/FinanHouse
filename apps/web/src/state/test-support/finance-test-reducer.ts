import {
  cancelFinancialEntry,
  createFinancialEntry,
  DomainError,
  type FinancialEntry,
  type FinancialEntryContext,
  FinancialEntryNotFoundError,
  CategoryNotFoundError,
  HouseholdMemberNotFoundError,
  markFinancialEntryAsPending,
  type MonthlyPeriod,
  PeriodNotFoundError,
  reactivateFinancialEntry,
  realizeFinancialEntry,
  revertFinancialEntryRealization,
  updateFinancialEntry,
} from '@finanhouse/domain'
import type { FinanceAction, FinanceReadyState, FinanceState } from '../finance-types.ts'
import { createTestFinanceState, FIXTURE_HOUSEHOLD_ID } from './finance-test-fixtures.ts'

/** Autor fictício das movimentações criadas em teste — não corresponde a um usuário real/autenticado. */
const TEST_CREATED_BY_USER_ID = 1

function findEntryOrThrow(state: FinanceReadyState, id: number): FinancialEntry {
  const entry = state.entries.find((candidate) => candidate.id === id)
  if (!entry) throw new FinancialEntryNotFoundError(`Movimentação #${id} não encontrada no estado de teste.`)
  return entry
}

function findPeriodOrThrow(state: FinanceReadyState, periodId: number): MonthlyPeriod {
  const period = state.periods.find((candidate) => candidate.id === periodId)
  if (!period) throw new PeriodNotFoundError(`Competência #${periodId} não encontrada no estado de teste.`)
  return period
}

function buildContext(state: FinanceReadyState, periodId: number, categoryId: number, memberId: number | null): FinancialEntryContext {
  const period = findPeriodOrThrow(state, periodId)
  const category = state.categories.find((candidate) => candidate.id === categoryId)
  if (!category) throw new CategoryNotFoundError(`Categoria #${categoryId} não encontrada no estado de teste.`)
  let member = null
  if (memberId !== null) {
    member = state.members.find((candidate) => candidate.id === memberId) ?? null
    if (!member) throw new HouseholdMemberNotFoundError(`Membro #${memberId} não encontrado no estado de teste.`)
  }
  return { period, category, member }
}

function nextEntryId(state: FinanceReadyState): number {
  return state.entries.reduce((max, entry) => Math.max(max, entry.id), 0) + 1
}

function replaceEntry(state: FinanceReadyState, updated: FinancialEntry): FinanceReadyState {
  return { ...state, entries: state.entries.map((entry) => (entry.id === updated.id ? updated : entry)), actionError: null, lastActionMessage: null }
}

/**
 * Reducer síncrono usado **apenas por `test-utils.tsx`** para simular a API
 * real em testes de componente/página, sem depender de rede/`fetch`. Nenhuma
 * regra financeira é reimplementada aqui — delega para `@finanhouse/domain`,
 * igual ao antigo `finance-demo-reducer.ts` (removido junto do modo
 * demonstrativo). Nunca usado pelo app real (`main.tsx` usa `FinanceProvider`).
 */
export function financeTestReducer(state: FinanceState, action: FinanceAction): FinanceState {
  if (action.type === 'CLEAR_ERROR') return state.status === 'ready' ? { ...state, actionError: null } : state
  if (action.type === 'CLEAR_MESSAGE') return state.status === 'ready' ? { ...state, lastActionMessage: null } : state
  if (action.type === 'RETRY') return createTestFinanceState()
  if (state.status !== 'ready') return state

  try {
    switch (action.type) {
      case 'CREATE_ENTRY': {
        const context = buildContext(state, state.currentPeriodId, action.input.categoryId, action.input.responsibleMemberId)
        const created = createFinancialEntry(
          {
            id: nextEntryId(state),
            householdId: FIXTURE_HOUSEHOLD_ID,
            periodId: state.currentPeriodId,
            categoryId: action.input.categoryId,
            responsibleMemberId: action.input.responsibleMemberId,
            createdByUserId: TEST_CREATED_BY_USER_ID,
            entryType: action.input.entryType,
            description: action.input.description,
            expectedAmount: action.input.expectedAmount,
            dueDate: action.input.dueDate,
            notes: action.input.notes,
          },
          context,
        )
        const entry = action.input.initialStatus === 'pending' ? markFinancialEntryAsPending(created, context.period) : created
        return { ...state, entries: [...state.entries, entry], actionError: null, lastActionMessage: 'Movimentação criada.' }
      }

      case 'UPDATE_ENTRY': {
        const existing = findEntryOrThrow(state, action.id)
        const categoryId = action.changes.categoryId ?? existing.categoryId
        const memberId = action.changes.responsibleMemberId !== undefined ? action.changes.responsibleMemberId : existing.responsibleMemberId
        const context = buildContext(state, existing.periodId, categoryId, memberId)
        return replaceEntry(state, updateFinancialEntry(existing, action.changes, context))
      }

      case 'MARK_PENDING': {
        const existing = findEntryOrThrow(state, action.id)
        return replaceEntry(state, markFinancialEntryAsPending(existing, findPeriodOrThrow(state, existing.periodId)))
      }

      case 'REALIZE': {
        const existing = findEntryOrThrow(state, action.id)
        const period = findPeriodOrThrow(state, existing.periodId)
        return replaceEntry(state, realizeFinancialEntry(existing, period, { actualAmount: action.actualAmount, realizationDate: action.realizationDate }))
      }

      case 'CANCEL': {
        const existing = findEntryOrThrow(state, action.id)
        return replaceEntry(state, cancelFinancialEntry(existing, findPeriodOrThrow(state, existing.periodId)))
      }

      case 'REACTIVATE': {
        const existing = findEntryOrThrow(state, action.id)
        return replaceEntry(state, reactivateFinancialEntry(existing, findPeriodOrThrow(state, existing.periodId)))
      }

      case 'REVERT_REALIZATION': {
        const existing = findEntryOrThrow(state, action.id)
        return replaceEntry(state, revertFinancialEntryRealization(existing, findPeriodOrThrow(state, existing.periodId)))
      }

      default:
        return state
    }
  } catch (error) {
    const message = error instanceof DomainError ? error.message : 'Não foi possível concluir esta operação.'
    return { ...state, actionError: message, lastActionMessage: null }
  }
}
