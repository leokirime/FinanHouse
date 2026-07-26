import { createContext, type Dispatch } from 'react'
import type { FinanceDemoAction, FinanceDemoState } from './finance-demo-types.ts'

export interface FinanceDemoContextValue {
  state: FinanceDemoState
  dispatch: Dispatch<FinanceDemoAction>
}

export const FinanceDemoContext = createContext<FinanceDemoContextValue | null>(null)
