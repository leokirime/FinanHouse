import { DomainError, type InstallmentPlan, type Money } from '@finanhouse/domain'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { createInstallmentPurchase, listInstallmentPlans, type InstallmentPurchaseResult } from '../api/financial-api.ts'
import { ApiError } from '../api/api-errors.ts'
import { resolveApiConfig } from '../api/api-config.ts'
import { useAuthenticated } from './use-auth.ts'

export type InstallmentPlansStatus = 'loading' | 'ready' | 'error'

export interface CreateInstallmentPlanInput {
  description: string
  categoryId: number
  totalAmount: Money
  installmentCount: number
  firstReferenceMonth: string
  dueDay: number
}

interface State {
  status: InstallmentPlansStatus
  plans: InstallmentPlan[]
  error: ApiError | null
  pendingAction: boolean
  actionError: string | null
  /** Incrementada a cada mutação concluída (sucesso ou falha) — mesmo padrão de `usePeriodBudgets`, permite que o formulário feche de forma confiável sem depender de campos que podem repetir valor entre mutações. */
  mutationVersion: number
  /** Resultado real da última criação bem-sucedida (plano + parcelas retornados pela API) — usado para exibir o parcelamento recém-criado sem inventar dados. `null` após qualquer nova tentativa de mutação. */
  lastCreated: InstallmentPurchaseResult | null
}

type Event =
  | { kind: 'LOAD_START' }
  | { kind: 'LOAD_SUCCESS'; plans: InstallmentPlan[] }
  | { kind: 'LOAD_FAILURE'; error: ApiError }
  | { kind: 'MUTATION_START' }
  | { kind: 'MUTATION_SUCCESS'; plans: InstallmentPlan[]; created: InstallmentPurchaseResult }
  | { kind: 'MUTATION_FAILURE'; message: string }
  | { kind: 'CLEAR_ACTION_ERROR' }

const INITIAL_STATE: State = { status: 'loading', plans: [], error: null, pendingAction: false, actionError: null, mutationVersion: 0, lastCreated: null }

function reducer(state: State, event: Event): State {
  switch (event.kind) {
    case 'LOAD_START':
      return { ...INITIAL_STATE, status: 'loading' }
    case 'LOAD_SUCCESS':
      return { ...state, status: 'ready', plans: event.plans, error: null, pendingAction: false, actionError: null }
    case 'LOAD_FAILURE':
      return { ...state, status: 'error', error: event.error }
    case 'MUTATION_START':
      return { ...state, pendingAction: true, actionError: null }
    case 'MUTATION_SUCCESS':
      return { ...state, plans: event.plans, pendingAction: false, actionError: null, mutationVersion: state.mutationVersion + 1, lastCreated: event.created }
    case 'MUTATION_FAILURE':
      return { ...state, pendingAction: false, actionError: event.message, mutationVersion: state.mutationVersion + 1, lastCreated: null }
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

export interface UseInstallmentPlansResult {
  status: InstallmentPlansStatus
  plans: InstallmentPlan[]
  error: ApiError | null
  pendingAction: boolean
  actionError: string | null
  mutationVersion: number
  lastCreated: InstallmentPurchaseResult | null
  retry: () => void
  create: (input: CreateInstallmentPlanInput) => void
  clearActionError: () => void
}

/**
 * Estado dos parcelamentos do household — escopo deliberadamente local à
 * área de Movimentações › Parcelamentos (Sessão 12, Bloco 05), mesmo padrão
 * de `usePeriodBudgets` (carga própria + mutação própria, independente do
 * `FinanceProvider` global). Parcelamentos não são período-escopados
 * (diferente de limites mensais) — carregados uma vez por household, como
 * categorias/membros/competências, mas mantidos fora do reducer global para
 * não acoplar toda página que usa `FinanceProvider` a mais uma chamada de
 * rede a cada carga/mutação. Nunca mantém parcelamento só em memória: toda
 * leitura/escrita passa pela API real.
 */
export function useInstallmentPlans(): UseInstallmentPlansResult {
  const { state: authState, notifyUnauthenticated } = useAuthenticated()
  const householdId = authState.householdId
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [loadAttempt, requestLoad] = useReducer((attempt: number) => attempt + 1, 0)
  const requestIdRef = useRef(0)
  const pendingActionRef = useRef(false)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    const controller = new AbortController()
    let active = true

    dispatch({ kind: 'LOAD_START' })

    async function load() {
      try {
        const config = resolveApiConfig(householdId)
        const plans = await listInstallmentPlans(config, controller.signal)
        if (!active || requestIdRef.current !== requestId) return
        dispatch({ kind: 'LOAD_SUCCESS', plans })
      } catch (error) {
        if (!active || requestIdRef.current !== requestId) return
        if (error instanceof ApiError && error.kind === 'cancelled') return
        if (error instanceof ApiError && error.kind === 'unauthenticated') {
          notifyUnauthenticated()
          return
        }
        const apiError = error instanceof ApiError ? error : new ApiError('unexpected_response', 'Falha inesperada ao carregar os parcelamentos.')
        dispatch({ kind: 'LOAD_FAILURE', error: apiError })
      }
    }

    void load()

    return () => {
      active = false
      controller.abort()
    }
  }, [loadAttempt, householdId, notifyUnauthenticated])

  const create = useCallback(
    (input: CreateInstallmentPlanInput) => {
      if (state.status !== 'ready' || pendingActionRef.current) return
      const config = resolveApiConfig(householdId)
      pendingActionRef.current = true
      dispatch({ kind: 'MUTATION_START' })
      void (async () => {
        try {
          const created = await createInstallmentPurchase(config, input)
          const plans = await listInstallmentPlans(config)
          pendingActionRef.current = false
          dispatch({ kind: 'MUTATION_SUCCESS', plans, created })
        } catch (error) {
          pendingActionRef.current = false
          if (error instanceof ApiError && error.kind === 'unauthenticated') {
            notifyUnauthenticated()
            return
          }
          dispatch({ kind: 'MUTATION_FAILURE', message: safeMessage(error) })
        }
      })()
    },
    [state.status, householdId, notifyUnauthenticated],
  )

  return {
    status: state.status,
    plans: state.plans,
    error: state.error,
    pendingAction: state.pendingAction,
    actionError: state.actionError,
    mutationVersion: state.mutationVersion,
    lastCreated: state.lastCreated,
    retry: () => requestLoad(),
    create,
    clearActionError: () => dispatch({ kind: 'CLEAR_ACTION_ERROR' }),
  }
}
