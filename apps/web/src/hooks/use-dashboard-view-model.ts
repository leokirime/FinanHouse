import { useMemo } from 'react'
import { buildDashboardViewModel, type DashboardViewModel } from '../view-models/dashboard-view-model.ts'
import { useReadyFinance } from './use-finance.ts'

/** Sentinela: nenhuma movimentação real jamais tem esse `periodId` — representa "sem competência anterior" sem tornar o parâmetro do view-model nulo. */
const NO_PREVIOUS_PERIOD_SENTINEL = -1

/** Deriva o view-model do dashboard a partir do estado compartilhado — nunca lê fixtures diretamente. */
export function useDashboardViewModel(): DashboardViewModel {
  const { state } = useReadyFinance()

  return useMemo(
    () =>
      buildDashboardViewModel({
        entries: state.entries,
        categories: state.categories,
        periods: state.periods,
        currentPeriodId: state.currentPeriodId,
        previousPeriodId: state.previousPeriodId ?? NO_PREVIOUS_PERIOD_SENTINEL,
      }),
    [state.entries, state.categories, state.periods, state.currentPeriodId, state.previousPeriodId],
  )
}
