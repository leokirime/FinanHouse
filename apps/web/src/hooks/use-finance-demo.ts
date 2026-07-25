import { useContext } from 'react'
import { FinanceDemoContext, type FinanceDemoContextValue } from '../state/finance-demo-context.ts'

export function useFinanceDemo(): FinanceDemoContextValue {
  const context = useContext(FinanceDemoContext)
  if (!context) {
    throw new Error('useFinanceDemo() só pode ser usado dentro de <FinanceDemoProvider>.')
  }
  return context
}
