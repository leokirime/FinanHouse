import { DomainError, type FinancialEntry, type HouseholdMember } from '@finanhouse/domain'
import { useCallback, useEffect, useReducer, useRef, type ReactNode } from 'react'
import {
  cancelEntry,
  createEntry,
  ensurePeriod,
  listCategories,
  listEntries,
  listMembers,
  listPeriods,
  markEntryPending,
  reactivateEntry,
  realizeEntry,
  revertEntryRealization,
  updateEntry,
} from '../api/financial-api.ts'
import { ApiError } from '../api/api-errors.ts'
import { resolveApiConfig } from '../api/api-config.ts'
import { getCurrentReferenceMonth, getPreviousReferenceMonth } from '../utils/reference-month.ts'
import { FinanceContext } from './finance-context.ts'
import type { FinanceAction, FinanceState } from './finance-types.ts'

export interface FinanceProviderProps {
  children: ReactNode
}

type InternalEvent =
  | { kind: 'LOAD_START' }
  | { kind: 'LOAD_SUCCESS'; payload: Omit<Extract<FinanceState, { status: 'ready' }>, 'status' | 'actionError' | 'lastActionMessage' | 'pendingAction'> }
  | { kind: 'LOAD_FAILURE'; error: ApiError }
  | { kind: 'MUTATION_START' }
  | { kind: 'MUTATION_SUCCESS'; entries: FinancialEntry[]; message: string }
  | { kind: 'MUTATION_FAILURE'; message: string }
  | { kind: 'CLEAR_ERROR' }
  | { kind: 'CLEAR_MESSAGE' }

function internalReducer(state: FinanceState, event: InternalEvent): FinanceState {
  switch (event.kind) {
    case 'LOAD_START':
      return { status: 'loading' }
    case 'LOAD_SUCCESS':
      return { status: 'ready', ...event.payload, actionError: null, lastActionMessage: null, pendingAction: false }
    case 'LOAD_FAILURE':
      return { status: 'error', error: event.error }
    case 'MUTATION_START':
      return state.status === 'ready' ? { ...state, pendingAction: true, actionError: null } : state
    case 'MUTATION_SUCCESS':
      return state.status === 'ready'
        ? { ...state, entries: event.entries, pendingAction: false, actionError: null, lastActionMessage: event.message }
        : state
    case 'MUTATION_FAILURE':
      return state.status === 'ready' ? { ...state, pendingAction: false, actionError: event.message, lastActionMessage: null } : state
    case 'CLEAR_ERROR':
      return state.status === 'ready' ? { ...state, actionError: null } : state
    case 'CLEAR_MESSAGE':
      return state.status === 'ready' ? { ...state, lastActionMessage: null } : state
    default:
      return state
  }
}

function resolveCreatedByUserId(members: HouseholdMember[]): number {
  const owner = members.find((member) => member.role === 'owner') ?? members[0]
  if (!owner) {
    throw new ApiError('unexpected_response', 'Nenhum membro do household está disponível para registrar a movimentação.')
  }
  return owner.userId
}

function safeActionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof DomainError) return error.message
  return 'Não foi possível concluir esta operação.'
}

/**
 * Fonte única do estado financeiro real — carrega e mantém sincronizado com
 * a API HTTP local (`Docs/03_contracts/contrato_api_http.md`). Nunca usa
 * `localStorage`/fixtures/dados fictícios em runtime; falha de API vira
 * `status: 'error'` explícito, nunca um fallback silencioso (DT-12).
 */
export function FinanceProvider({ children }: FinanceProviderProps) {
  const [state, dispatchInternal] = useReducer(internalReducer, { status: 'loading' })
  const requestIdRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  /**
   * Guarda síncrona contra duplo envio. `state.pendingAction` sozinho não
   * basta: dois `dispatch` chamados na mesma tick síncrona (antes do
   * re-render do React aplicar `MUTATION_START`) enxergam a mesma closure
   * de `state` com `pendingAction: false` — um `ref` muda imediatamente,
   * sem depender de re-render.
   */
  const pendingActionRef = useRef(false)

  useEffect(
    () => () => {
      mountedRef.current = false
      abortControllerRef.current?.abort()
    },
    [],
  )

  const loadAll = useCallback(async () => {
    const requestId = ++requestIdRef.current
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    dispatchInternal({ kind: 'LOAD_START' })

    try {
      const config = resolveApiConfig()
      const [categories, members, periods] = await Promise.all([
        listCategories(config, controller.signal),
        listMembers(config, controller.signal),
        listPeriods(config, controller.signal),
      ])

      const currentReferenceMonth = getCurrentReferenceMonth()
      let currentPeriod = periods.find((period) => period.referenceMonth === currentReferenceMonth) ?? null
      if (!currentPeriod) {
        currentPeriod = await ensurePeriod(config, currentReferenceMonth, controller.signal)
      }
      const allPeriods = periods.some((period) => period.id === currentPeriod!.id) ? periods : [...periods, currentPeriod]

      const previousReferenceMonth = getPreviousReferenceMonth(currentReferenceMonth)
      const previousPeriod = allPeriods.find((period) => period.referenceMonth === previousReferenceMonth) ?? null

      const entries = await listEntries(config, { signal: controller.signal })

      if (requestIdRef.current !== requestId || !mountedRef.current) return

      dispatchInternal({
        kind: 'LOAD_SUCCESS',
        payload: {
          categories,
          members,
          periods: allPeriods,
          entries,
          currentPeriodId: currentPeriod.id,
          previousPeriodId: previousPeriod?.id ?? null,
        },
      })
    } catch (error) {
      if (requestIdRef.current !== requestId || !mountedRef.current) return
      if (error instanceof ApiError && error.kind === 'cancelled') return
      const apiError = error instanceof ApiError ? error : new ApiError('unexpected_response', 'Falha inesperada ao carregar os dados.')
      dispatchInternal({ kind: 'LOAD_FAILURE', error: apiError })
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const dispatch = useCallback(
    (action: FinanceAction) => {
      if (action.type === 'CLEAR_ERROR') {
        dispatchInternal({ kind: 'CLEAR_ERROR' })
        return
      }
      if (action.type === 'CLEAR_MESSAGE') {
        dispatchInternal({ kind: 'CLEAR_MESSAGE' })
        return
      }
      if (action.type === 'RETRY') {
        loadAll()
        return
      }

      if (state.status !== 'ready' || pendingActionRef.current) {
        // Impede duplo envio e mutações antes da carga inicial concluir.
        return
      }

      const config = resolveApiConfig()
      pendingActionRef.current = true
      dispatchInternal({ kind: 'MUTATION_START' })

      void (async () => {
        try {
          switch (action.type) {
            case 'CREATE_ENTRY': {
              const createdByUserId = resolveCreatedByUserId(state.members)
              const created = await createEntry(config, {
                periodId: state.currentPeriodId,
                categoryId: action.input.categoryId,
                responsibleMemberId: action.input.responsibleMemberId,
                createdByUserId,
                entryType: action.input.entryType,
                description: action.input.description,
                expectedAmount: action.input.expectedAmount,
                dueDate: action.input.dueDate,
                notes: action.input.notes,
              })
              if (action.input.initialStatus === 'pending') {
                await markEntryPending(config, created.id)
              }
              break
            }
            case 'UPDATE_ENTRY':
              await updateEntry(config, action.id, action.changes)
              break
            case 'MARK_PENDING':
              await markEntryPending(config, action.id)
              break
            case 'REALIZE':
              await realizeEntry(config, action.id, action.actualAmount, action.realizationDate)
              break
            case 'CANCEL':
              await cancelEntry(config, action.id)
              break
            case 'REACTIVATE':
              await reactivateEntry(config, action.id)
              break
            case 'REVERT_REALIZATION':
              await revertEntryRealization(config, action.id)
              break
            default:
              break
          }

          const entries = await listEntries(config)
          pendingActionRef.current = false
          if (!mountedRef.current) return
          dispatchInternal({ kind: 'MUTATION_SUCCESS', entries, message: 'Movimentação atualizada na API real.' })
        } catch (error) {
          pendingActionRef.current = false
          if (!mountedRef.current) return
          dispatchInternal({ kind: 'MUTATION_FAILURE', message: safeActionErrorMessage(error) })
        }
      })()
    },
    [state, loadAll],
  )

  return <FinanceContext.Provider value={{ state, dispatch }}>{children}</FinanceContext.Provider>
}
