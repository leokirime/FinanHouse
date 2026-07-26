import {
  cancelFinancialEntry,
  CategoryNotFoundError,
  createFinancialEntry,
  DomainError,
  type FinancialEntry,
  type FinancialEntryContext,
  FinancialEntryNotFoundError,
  HouseholdMemberNotFoundError,
  markFinancialEntryAsPending,
  type MonthlyPeriod,
  PeriodNotFoundError,
  reactivateFinancialEntry,
  realizeFinancialEntry,
  revertFinancialEntryRealization,
  updateFinancialEntry,
} from '@finanhouse/domain'
import { createInitialFinanceDemoState } from './finance-demo-initial-state.ts'
import type { FinanceDemoAction, FinanceDemoState } from './finance-demo-types.ts'

/** Autor fictício de todas as movimentações do modo demonstrativo — não corresponde a um usuário real/autenticado. */
const DEMO_CREATED_BY_USER_ID = 1

function findEntryOrThrow(state: FinanceDemoState, id: number): FinancialEntry {
  const entry = state.entries.find((candidate) => candidate.id === id)
  if (!entry) {
    throw new FinancialEntryNotFoundError(`Movimentação #${id} não encontrada no estado da sessão.`)
  }
  return entry
}

function findPeriodOrThrow(state: FinanceDemoState, periodId: number): MonthlyPeriod {
  const period = state.periods.find((candidate) => candidate.id === periodId)
  if (!period) {
    throw new PeriodNotFoundError(`Competência #${periodId} não encontrada no estado da sessão.`)
  }
  return period
}

function buildContext(state: FinanceDemoState, periodId: number, categoryId: number, memberId: number | null): FinancialEntryContext {
  const period = findPeriodOrThrow(state, periodId)
  const category = state.categories.find((candidate) => candidate.id === categoryId)
  if (!category) {
    throw new CategoryNotFoundError(`Categoria #${categoryId} não encontrada no estado da sessão.`)
  }
  let member = null
  if (memberId !== null) {
    member = state.members.find((candidate) => candidate.id === memberId) ?? null
    if (!member) {
      throw new HouseholdMemberNotFoundError(`Membro #${memberId} não encontrado no estado da sessão.`)
    }
  }
  return { period, category, member }
}

function replaceEntry(state: FinanceDemoState, updated: FinancialEntry): FinanceDemoState {
  return {
    ...state,
    entries: state.entries.map((entry) => (entry.id === updated.id ? updated : entry)),
    actionError: null,
    lastActionMessage: null,
  }
}

/**
 * Reducer puro do estado demonstrativo. Nenhuma regra financeira é
 * reimplementada aqui — cada `case` só localiza as entidades relacionadas no
 * estado e delega a validação/transição para `@finanhouse/domain`. Erros de
 * domínio (`DomainError`) são capturados e viram `state.actionError`, para
 * que a UI possa exibi-los sem que o reducer lance uma exceção durante o
 * render do React.
 */
export function financeDemoReducer(state: FinanceDemoState, action: FinanceDemoAction): FinanceDemoState {
  try {
    switch (action.type) {
      case 'CREATE_ENTRY': {
        const context = buildContext(state, state.currentPeriodId, action.input.categoryId, action.input.responsibleMemberId)
        const created = createFinancialEntry(
          {
            id: state.nextEntryId,
            householdId: state.householdId,
            periodId: state.currentPeriodId,
            categoryId: action.input.categoryId,
            responsibleMemberId: action.input.responsibleMemberId,
            createdByUserId: DEMO_CREATED_BY_USER_ID,
            entryType: action.input.entryType,
            description: action.input.description,
            expectedAmount: action.input.expectedAmount,
            dueDate: action.input.dueDate,
            notes: action.input.notes,
          },
          context,
        )
        const entry = action.input.initialStatus === 'pending' ? markFinancialEntryAsPending(created, context.period) : created
        return {
          ...state,
          entries: [...state.entries, entry],
          nextEntryId: state.nextEntryId + 1,
          actionError: null,
          lastActionMessage: 'Movimentação adicionada à sessão demonstrativa.',
        }
      }

      case 'UPDATE_ENTRY': {
        const existing = findEntryOrThrow(state, action.id)
        const categoryId = action.changes.categoryId ?? existing.categoryId
        const memberId = action.changes.responsibleMemberId !== undefined ? action.changes.responsibleMemberId : existing.responsibleMemberId
        const context = buildContext(state, existing.periodId, categoryId, memberId)
        const updated = updateFinancialEntry(existing, action.changes, context)
        return replaceEntry(state, updated)
      }

      case 'MARK_PENDING': {
        const existing = findEntryOrThrow(state, action.id)
        const period = findPeriodOrThrow(state, existing.periodId)
        return replaceEntry(state, markFinancialEntryAsPending(existing, period))
      }

      case 'REALIZE': {
        const existing = findEntryOrThrow(state, action.id)
        const period = findPeriodOrThrow(state, existing.periodId)
        return replaceEntry(
          state,
          realizeFinancialEntry(existing, period, {
            actualAmount: action.actualAmount,
            realizationDate: action.realizationDate,
          }),
        )
      }

      case 'CANCEL': {
        const existing = findEntryOrThrow(state, action.id)
        const period = findPeriodOrThrow(state, existing.periodId)
        return replaceEntry(state, cancelFinancialEntry(existing, period))
      }

      case 'REACTIVATE': {
        const existing = findEntryOrThrow(state, action.id)
        const period = findPeriodOrThrow(state, existing.periodId)
        return replaceEntry(state, reactivateFinancialEntry(existing, period))
      }

      case 'REVERT_REALIZATION': {
        const existing = findEntryOrThrow(state, action.id)
        const period = findPeriodOrThrow(state, existing.periodId)
        return replaceEntry(state, revertFinancialEntryRealization(existing, period))
      }

      case 'CLEAR_ERROR':
        return { ...state, actionError: null }

      case 'CLEAR_MESSAGE':
        return { ...state, lastActionMessage: null }

      case 'RESET':
        return createInitialFinanceDemoState()

      default:
        return state
    }
  } catch (error) {
    const message = error instanceof DomainError ? error.message : 'Não foi possível concluir esta operação.'
    return { ...state, actionError: message, lastActionMessage: null }
  }
}
