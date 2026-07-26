import { useMemo, useState } from 'react'
import { HistoryEmptyState } from '../components/history/HistoryEmptyState.tsx'
import { HistoryFilters } from '../components/history/HistoryFilters.tsx'
import { HistoricalEntries } from '../components/history/HistoricalEntries.tsx'
import { HistoricalPeriodSummary } from '../components/history/HistoricalPeriodSummary.tsx'
import { HistoricalStatusBreakdown } from '../components/history/HistoricalStatusBreakdown.tsx'
import { PeriodHistoryList } from '../components/history/PeriodHistoryList.tsx'
import { useFinanceDemo } from '../hooks/use-finance-demo.ts'
import { buildHistoryViewModel, DEFAULT_HISTORY_FILTERS, type HistoryFilters as HistoryFiltersState } from '../view-models/history-view-model.ts'
import './HistoryPage.css'

export function HistoryPage() {
  const { state } = useFinanceDemo()
  const [filters, setFilters] = useState<HistoryFiltersState>(DEFAULT_HISTORY_FILTERS)
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(state.currentPeriodId)

  const viewModel = useMemo(
    () =>
      buildHistoryViewModel({
        periods: state.periods,
        entries: state.entries,
        categories: state.categories,
        selectedPeriodId,
        filters,
      }),
    [state.periods, state.entries, state.categories, selectedPeriodId, filters],
  )

  return (
    <div className="fh-history-page">
      <div className="fh-card fh-card--elevated fh-history-page__intro">
        <div>
          <h2>Histórico</h2>
          <p className="fh-text-secondary">
            <span aria-hidden="true">●</span> Modo demonstrativo: consulta somente leitura das competências e movimentações desta sessão.
          </p>
        </div>
      </div>

      <HistoryFilters
        filters={filters}
        availableYears={viewModel.availableYears}
        periodStatusOptions={viewModel.periodStatusOptions}
        entryStatusOptions={viewModel.entryStatusOptions}
        onChange={setFilters}
      />

      {viewModel.isEmpty ? (
        <HistoryEmptyState
          title={viewModel.emptyTitle ?? 'Histórico indisponível'}
          description={viewModel.emptyDescription ?? 'Não há dados suficientes para montar o histórico.'}
        />
      ) : (
        <>
          <p className="fh-visually-hidden">{viewModel.accessibleSummary}</p>

          <div className="fh-history-layout">
            <PeriodHistoryList periods={viewModel.periods} selectedPeriodId={viewModel.selectedPeriod?.id ?? null} onSelect={setSelectedPeriodId} />

            <div className="fh-history-content">
              {viewModel.summary && <HistoricalPeriodSummary summary={viewModel.summary} />}
              {viewModel.statusCounts && <HistoricalStatusBreakdown counts={viewModel.statusCounts} />}
              <HistoricalEntries entries={viewModel.entries} emptyMessage={viewModel.entriesEmptyMessage} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
