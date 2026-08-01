import { useEffect, useRef } from 'react'
import type { FinanceReadyState } from '../state/finance-types.ts'

export interface UseMutationDialogOptions {
  state: FinanceReadyState
  onSuccess: () => void
}

export interface UseMutationDialogResult {
  /** Chame no início do `handleSubmit`, antes de despachar a ação. */
  markSubmitted: () => void
}

/**
 * Fecha o diálogo quando a mutação que ELE iniciou termina sem erro.
 * Depende do objeto `state` inteiro (não de campos individuais como
 * `pendingAction`/`actionError`) porque tanto o reducer síncrono de teste
 * (`FinanceTestProvider`, onde `pendingAction` nunca muda de `false`) quanto
 * o provider real (`FinanceProvider`, onde `pendingAction` alterna
 * `true`→`false`) sempre retornam uma referência NOVA de estado a cada
 * `dispatch` — depender de campos derivados faria o efeito não disparar de
 * novo quando nenhum deles muda de valor (ex.: uma mutação bem-sucedida sem
 * erro anterior, no reducer síncrono).
 */
export function useMutationDialog({ state, onSuccess }: UseMutationDialogOptions): UseMutationDialogResult {
  const submittedRef = useRef(false)

  useEffect(() => {
    if (!submittedRef.current || state.pendingAction) return
    submittedRef.current = false
    if (state.actionError === null) onSuccess()
  }, [state, onSuccess])

  return {
    markSubmitted: () => {
      submittedRef.current = true
    },
  }
}
