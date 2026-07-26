import { useMemo } from 'react'
import { buildDashboardViewModel, type DashboardViewModel } from '../view-models/dashboard-view-model.ts'
import { useFinanceDemo } from './use-finance-demo.ts'

/** Deriva o view-model do dashboard a partir do estado compartilhado — nunca lê fixtures diretamente. */
export function useDashboardViewModel(): DashboardViewModel {
  const { state } = useFinanceDemo()

  return useMemo(
    () =>
      buildDashboardViewModel({
        entries: state.entries,
        categories: state.categories,
        periods: state.periods,
        currentPeriodId: state.currentPeriodId,
        previousPeriodId: state.previousPeriodId,
      }),
    [state.entries, state.categories, state.periods, state.currentPeriodId, state.previousPeriodId],
  )
}
