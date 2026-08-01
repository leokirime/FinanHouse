import { useContext } from 'react'
import { FinanceContext, type FinanceContextValue } from '../state/finance-context.ts'
import type { FinanceAction, FinanceReadyState } from '../state/finance-types.ts'

export function useFinance(): FinanceContextValue {
  const context = useContext(FinanceContext)
  if (!context) {
    throw new Error('useFinance() só pode ser usado dentro de <FinanceProvider>.')
  }
  return context
}

export interface ReadyFinanceContextValue {
  state: FinanceReadyState
  dispatch: (action: FinanceAction) => void
}

/**
 * Variante usada pelas páginas/componentes que só são montados quando
 * `<FinanceProvider>` já está com `status: 'ready'` (o roteamento gateia
 * isso em `App.tsx`) — evita checar `state.status` em todo componente.
 */
export function useReadyFinance(): ReadyFinanceContextValue {
  const { state, dispatch } = useFinance()
  if (state.status !== 'ready') {
    throw new Error('useReadyFinance() só pode ser usado quando o estado financeiro está pronto (status "ready").')
  }
  return { state, dispatch }
}
