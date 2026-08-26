import type { FinancialEntry, InstallmentPlan } from '@finanhouse/domain'
import { useEffect, useReducer, useRef } from 'react'
import { getInstallmentPlanDetail } from '../api/financial-api.ts'
import { ApiError } from '../api/api-errors.ts'
import { resolveApiConfig } from '../api/api-config.ts'
import { useAuthenticated } from './use-auth.ts'

export type InstallmentPlanDetailStatus = 'idle' | 'loading' | 'ready' | 'error'

interface State {
  status: InstallmentPlanDetailStatus
  plan: InstallmentPlan | null
  installments: FinancialEntry[]
  error: ApiError | null
}

type Event =
  | { kind: 'RESET' }
  | { kind: 'LOAD_START' }
  | { kind: 'LOAD_SUCCESS'; plan: InstallmentPlan; installments: FinancialEntry[] }
  | { kind: 'LOAD_FAILURE'; error: ApiError }

const IDLE_STATE: State = { status: 'idle', plan: null, installments: [], error: null }

function reducer(state: State, event: Event): State {
  switch (event.kind) {
    case 'RESET':
      return IDLE_STATE
    case 'LOAD_START':
      return { status: 'loading', plan: null, installments: [], error: null }
    case 'LOAD_SUCCESS':
      return { status: 'ready', plan: event.plan, installments: event.installments, error: null }
    case 'LOAD_FAILURE':
      return { status: 'error', plan: null, installments: [], error: event.error }
    default:
      return state
  }
}

export interface UseInstallmentPlanDetailResult {
  status: InstallmentPlanDetailStatus
  plan: InstallmentPlan | null
  installments: FinancialEntry[]
  error: ApiError | null
  retry: () => void
}

/**
 * Detalhe de UM parcelamento (plano + suas parcelas reais) via
 * `GET .../installment-plans/:installmentPlanId` — busca de novo sempre que
 * `installmentPlanId` muda, mesmo padrão de `usePeriodBudgets(referenceMonth)`.
 * `installmentPlanId: null` significa "nenhum parcelamento selecionado" —
 * estado `idle`, nenhuma requisição disparada.
 */
export function useInstallmentPlanDetail(installmentPlanId: number | null): UseInstallmentPlanDetailResult {
  const { state: authState, notifyUnauthenticated } = useAuthenticated()
  const householdId = authState.householdId
  const [state, dispatch] = useReducer(reducer, IDLE_STATE)
  const [loadAttempt, requestLoad] = useReducer((attempt: number) => attempt + 1, 0)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (installmentPlanId === null) {
      dispatch({ kind: 'RESET' })
      return
    }

    const requestId = ++requestIdRef.current
    const controller = new AbortController()
    let active = true

    dispatch({ kind: 'LOAD_START' })

    async function load() {
      try {
        const config = resolveApiConfig(householdId)
        const { plan, installments } = await getInstallmentPlanDetail(config, installmentPlanId as number, controller.signal)
        if (!active || requestIdRef.current !== requestId) return
        dispatch({ kind: 'LOAD_SUCCESS', plan, installments })
      } catch (error) {
        if (!active || requestIdRef.current !== requestId) return
        if (error instanceof ApiError && error.kind === 'cancelled') return
        if (error instanceof ApiError && error.kind === 'unauthenticated') {
          notifyUnauthenticated()
          return
        }
        const apiError = error instanceof ApiError ? error : new ApiError('unexpected_response', 'Falha inesperada ao carregar o parcelamento.')
        dispatch({ kind: 'LOAD_FAILURE', error: apiError })
      }
    }

    void load()

    return () => {
      active = false
      controller.abort()
    }
  }, [installmentPlanId, loadAttempt, householdId, notifyUnauthenticated])

  return { status: state.status, plan: state.plan, installments: state.installments, error: state.error, retry: () => requestLoad() }
}
