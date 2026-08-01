import { useReducer, type ReactNode } from 'react'
import { FinanceContext } from '../finance-context.ts'
import type { FinanceState } from '../finance-types.ts'
import { createTestFinanceState } from './finance-test-fixtures.ts'
import { financeTestReducer } from './finance-test-reducer.ts'

export interface FinanceTestProviderProps {
  children: ReactNode
  initialState?: FinanceState
}

/** Provider de teste — nunca usado pelo app real (ver `finance-test-reducer.ts`). */
export function FinanceTestProvider({ children, initialState }: FinanceTestProviderProps) {
  const [state, dispatch] = useReducer(financeTestReducer, initialState ?? createTestFinanceState())
  return <FinanceContext.Provider value={{ state, dispatch }}>{children}</FinanceContext.Provider>
}
