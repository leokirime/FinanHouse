import { useReducer, type ReactNode } from 'react'
import { FinanceDemoContext } from './finance-demo-context.ts'
import { createInitialFinanceDemoState } from './finance-demo-initial-state.ts'
import { financeDemoReducer } from './finance-demo-reducer.ts'

export interface FinanceDemoProviderProps {
  children: ReactNode
}

/**
 * Fonte única do estado financeiro do modo demonstrativo. Vive só em memória
 * do navegador (React Context) — nunca em `localStorage`/`IndexedDB`/cookie.
 * Ao recarregar a página, este provider é remontado e o estado volta ao
 * ponto de partida das fixtures (`createInitialFinanceDemoState`).
 */
export function FinanceDemoProvider({ children }: FinanceDemoProviderProps) {
  const [state, dispatch] = useReducer(financeDemoReducer, undefined, createInitialFinanceDemoState)

  return <FinanceDemoContext.Provider value={{ state, dispatch }}>{children}</FinanceDemoContext.Provider>
}
