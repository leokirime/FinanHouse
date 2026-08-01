import { createContext, type Dispatch } from 'react'
import type { FinanceAction, FinanceState } from './finance-types.ts'

export interface FinanceContextValue {
  state: FinanceState
  dispatch: Dispatch<FinanceAction>
}

export const FinanceContext = createContext<FinanceContextValue | null>(null)
