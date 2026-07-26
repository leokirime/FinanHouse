import { useEffect, useMemo, useState } from 'react'
import { CategoryComparison } from '../components/comparison/CategoryComparison.tsx'
import { ComparisonChart } from '../components/comparison/ComparisonChart.tsx'
import { ComparisonEmptyState } from '../components/comparison/ComparisonEmptyState.tsx'
import { ComparisonSummaryCard } from '../components/comparison/ComparisonSummaryCard.tsx'
import { NewAndEndedExpenses } from '../components/comparison/NewAndEndedExpenses.tsx'
import { PeriodComparisonSelector } from '../components/comparison/PeriodComparisonSelector.tsx'
import { PlannedVsRealized } from '../components/comparison/PlannedVsRealized.tsx'
import { useFinanceDemo } from '../hooks/use-finance-demo.ts'
import { buildComparisonPeriodOptions, buildComparisonViewModel } from '../view-models/comparison-view-model.ts'
import './ComparisonPage.css'

function nextDifferentPeriodId(ids: number[], selectedId: number | null): number | null {
  return ids.find((id) => id !== selectedId) ?? null
}

export function ComparisonPage() {
  const { state } = useFinanceDemo()
  const periodOptions = useMemo(() => buildComparisonPeriodOptions(state.periods), [state.periods])
  const periodIds = useMemo(() => periodOptions.map((option) => option.id), [periodOptions])
  const [basePeriodId, setBasePeriodId] = useState<number | null>(state.currentPeriodId)
  const [comparedPeriodId, setComparedPeriodId] = useState<number | null>(state.previousPeriodId)

  useEffect(() => {
    if (periodIds.length < 2) {
      setBasePeriodId(null)
      setComparedPeriodId(null)
      return
    }

    setBasePeriodId((current) => (current !== null && periodIds.includes(current) ? current : (state.currentPeriodId ?? periodIds[0] ?? null)))
    setComparedPeriodId((current) => {
      const base = basePeriodId !== null && periodIds.includes(basePeriodId) ? basePeriodId : (state.currentPeriodId ?? periodIds[0] ?? null)
      if (current !== null && periodIds.includes(current) && current !== base) return current
      const preferred = state.previousPeriodId !== base && periodIds.includes(state.previousPeriodId) ? state.previousPeriodId : null
      return preferred ?? nextDifferentPeriodId(periodIds, base)
    })
  }, [basePeriodId, periodIds, state.currentPeriodId, state.previousPeriodId])

  function handleBasePeriodChange(periodId: number) {
    setBasePeriodId(periodId)
    setComparedPeriodId((current) => (current === periodId ? nextDifferentPeriodId(periodIds, periodId) : current))
  }

  function handleComparedPeriodChange(periodId: number) {
    setComparedPeriodId(periodId)
    setBasePeriodId((current) => (current === periodId ? nextDifferentPeriodId(periodIds, periodId) : current))
  }

  const viewModel = useMemo(
    () =>
      buildComparisonViewModel({
        periods: state.periods,
        entries: state.entries,
        categories: state.categories,
        basePeriodId,
        comparedPeriodId,
      }),
    [basePeriodId, comparedPeriodId, state.categories, state.entries, state.periods],
  )

  return (
    <div className="fh-comparison-page">
      <PeriodComparisonSelector
        options={periodOptions}
        basePeriodId={basePeriodId}
        comparedPeriodId={comparedPeriodId}
        onBasePeriodChange={handleBasePeriodChange}
        onComparedPeriodChange={handleComparedPeriodChange}
      />

      {viewModel.isEmpty ? (
        <ComparisonEmptyState
          title={viewModel.emptyTitle ?? 'Comparativo indisponível'}
          description={viewModel.emptyDescription ?? 'Não há dados suficientes para comparar competências.'}
        />
      ) : (
        <>
          <p className="fh-visually-hidden">{viewModel.accessibleSummary}</p>
          <div className="fh-grid fh-comparison-page__indicators">
            {viewModel.indicators.map((indicator) => (
              <ComparisonSummaryCard key={indicator.key} indicator={indicator} />
            ))}
          </div>
          <div className="fh-grid fh-comparison-page__insights">
            <CategoryComparison
              rows={viewModel.categoryComparisons}
              biggestIncrease={viewModel.biggestIncrease}
              biggestReduction={viewModel.biggestReduction}
            />
            <ComparisonChart title={viewModel.chart.title} summary={viewModel.chart.summary} metrics={viewModel.chart.metrics} />
          </div>
          <NewAndEndedExpenses newExpenses={viewModel.newExpenses} endedExpenses={viewModel.endedExpenses} />
          <PlannedVsRealized periods={viewModel.plannedVsRealized} />
        </>
      )}
    </div>
  )
}
