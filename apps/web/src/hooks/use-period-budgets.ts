import { DomainError, type CategoryBudget, type Money } from '@finanhouse/domain'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { deleteBudget, listBudgets, putBudget } from '../api/financial-api.ts'
import { ApiError } from '../api/api-errors.ts'
import { resolveApiConfig } from '../api/api-config.ts'

export type PeriodBudgetsStatus = 'loading' | 'ready' | 'error'

interface State {
  status: PeriodBudgetsStatus
  budgets: CategoryBudget[]
  error: ApiError | null
  pendingAction: boolean
  actionError: string | null
  /** Incrementada a cada mutação concluída (sucesso ou falha) — permite que quem consome feche um diálogo de forma confiável, sem depender de `pendingAction`/`actionError` mudarem de valor (podem repetir entre mutações). */
  mutationVersion: number
}

type Event =
  | { kind: 'LOAD_START' }
  | { kind: 'LOAD_SUCCESS'; budgets: CategoryBudget[] }
  | { kind: 'LOAD_FAILURE'; error: ApiError }
  | { kind: 'MUTATION_START' }
  | { kind: 'MUTATION_SUCCESS'; budgets: CategoryBudget[] }
  | { kind: 'MUTATION_FAILURE'; message: string }
  | { kind: 'CLEAR_ACTION_ERROR' }

const INITIAL_STATE: State = { status: 'loading', budgets: [], error: null, pendingAction: false, actionError: null, mutationVersion: 0 }

function reducer(state: State, event: Event): State {
  switch (event.kind) {
    case 'LOAD_START':
      return { ...INITIAL_STATE, status: 'loading' }
    case 'LOAD_SUCCESS':
      return { status: 'ready', budgets: event.budgets, error: null, pendingAction: false, actionError: null, mutationVersion: state.mutationVersion }
    case 'LOAD_FAILURE':
      return { ...state, status: 'error', error: event.error }
    case 'MUTATION_START':
      return { ...state, pendingAction: true, actionError: null }
    case 'MUTATION_SUCCESS':
      return { ...state, budgets: event.budgets, pendingAction: false, actionError: null, mutationVersion: state.mutationVersion + 1 }
    case 'MUTATION_FAILURE':
      return { ...state, pendingAction: false, actionError: event.message, mutationVersion: state.mutationVersion + 1 }
    case 'CLEAR_ACTION_ERROR':
      return { ...state, actionError: null }
    default:
      return state
  }
}

function safeMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof DomainError) return error.message
  return 'Não foi possível concluir esta operação.'
}

export interface UsePeriodBudgetsResult {
  status: PeriodBudgetsStatus
  budgets: CategoryBudget[]
  error: ApiError | null
  pendingAction: boolean
  actionError: string | null
  mutationVersion: number
  retry: () => void
  createOrUpdate: (categoryId: number, limitAmount: Money) => void
  remove: (categoryId: number) => void
  clearActionError: () => void
}

/**
 * Estado dos limites mensais por categoria de UMA competência — escopo
 * deliberadamente local a `PlanningPage` (só ela consome limites), ao
 * contrário de categorias/membros/movimentações (`FinanceProvider`, usados
 * por várias páginas). Mesmo padrão de carga/mutação/cancelamento do
 * `FinanceProvider` (`active` local + `AbortController` por execução do
 * efeito — nunca um `ref` compartilhado entre execuções, ver DT-12/correção
 * pós-Bloco 17 do `FinanceProvider`). Nunca mantém limite só em memória:
 * toda leitura/escrita passa pela API real.
 */
export function usePeriodBudgets(referenceMonth: string | null): UsePeriodBudgetsResult {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [loadAttempt, requestLoad] = useReducer((attempt: number) => attempt + 1, 0)
  const requestIdRef = useRef(0)
  const pendingActionRef = useRef(false)

  useEffect(() => {
    if (referenceMonth === null) return

    const requestId = ++requestIdRef.current
    const controller = new AbortController()
    let active = true

    dispatch({ kind: 'LOAD_START' })

    async function load() {
      try {
        const config = resolveApiConfig()
        const budgets = await listBudgets(config, referenceMonth as string, controller.signal)
        if (!active || requestIdRef.current !== requestId) return
        dispatch({ kind: 'LOAD_SUCCESS', budgets })
      } catch (error) {
        if (!active || requestIdRef.current !== requestId) return
        if (error instanceof ApiError && error.kind === 'cancelled') return
        const apiError = error instanceof ApiError ? error : new ApiError('unexpected_response', 'Falha inesperada ao carregar os limites.')
        dispatch({ kind: 'LOAD_FAILURE', error: apiError })
      }
    }

    void load()

    return () => {
      active = false
      controller.abort()
    }
  }, [referenceMonth, loadAttempt])

  const runMutation = useCallback(
    (task: (config: ReturnType<typeof resolveApiConfig>) => Promise<CategoryBudget[]>) => {
      if (referenceMonth === null || state.status !== 'ready' || pendingActionRef.current) return
      const config = resolveApiConfig()
      pendingActionRef.current = true
      dispatch({ kind: 'MUTATION_START' })
      void (async () => {
        try {
          const budgets = await task(config)
          pendingActionRef.current = false
          dispatch({ kind: 'MUTATION_SUCCESS', budgets })
        } catch (error) {
          pendingActionRef.current = false
          dispatch({ kind: 'MUTATION_FAILURE', message: safeMessage(error) })
        }
      })()
    },
    [referenceMonth, state.status],
  )

  const createOrUpdate = useCallback(
    (categoryId: number, limitAmount: Money) => {
      runMutation(async (config) => {
        await putBudget(config, referenceMonth as string, categoryId, limitAmount)
        return listBudgets(config, referenceMonth as string)
      })
    },
    [runMutation, referenceMonth],
  )

  const remove = useCallback(
    (categoryId: number) => {
      runMutation(async (config) => {
        await deleteBudget(config, referenceMonth as string, categoryId)
        return listBudgets(config, referenceMonth as string)
      })
    },
    [runMutation, referenceMonth],
  )

  return {
    status: state.status,
    budgets: state.budgets,
    error: state.error,
    pendingAction: state.pendingAction,
    actionError: state.actionError,
    mutationVersion: state.mutationVersion,
    retry: () => requestLoad(),
    createOrUpdate,
    remove,
    clearActionError: () => dispatch({ kind: 'CLEAR_ACTION_ERROR' }),
  }
}
