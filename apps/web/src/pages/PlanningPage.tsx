import { useMemo, useState } from 'react'
import { CategoryBudgetForm } from '../components/planning/CategoryBudgetForm.tsx'
import { CategoryBudgetList } from '../components/planning/CategoryBudgetList.tsx'
import { PlanningChart } from '../components/planning/PlanningChart.tsx'
import { PlanningEmptyState } from '../components/planning/PlanningEmptyState.tsx'
import { PlanningEntries } from '../components/planning/PlanningEntries.tsx'
import { PlanningSummary } from '../components/planning/PlanningSummary.tsx'
import './PlanningPage.css'
import { useFinanceDemo } from '../hooks/use-finance-demo.ts'
import { buildPlanningPeriodOptions, buildPlanningViewModel, type CategoryBudgetRowViewModel } from '../view-models/planning-view-model.ts'

type DialogState = { kind: 'create'; categoryId?: number } | { kind: 'edit'; row: CategoryBudgetRowViewModel } | null

export function PlanningPage() {
  const { state, dispatch } = useFinanceDemo()
  const periodOptions = useMemo(() => buildPlanningPeriodOptions(state.periods), [state.periods])
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(state.currentPeriodId)
  const [dialog, setDialog] = useState<DialogState>(null)

  const effectiveSelectedPeriodId =
    selectedPeriodId !== null && periodOptions.some((option) => option.id === selectedPeriodId) ? selectedPeriodId : (periodOptions[0]?.id ?? null)

  const viewModel = useMemo(
    () =>
      buildPlanningViewModel({
        periods: state.periods,
        selectedPeriodId: effectiveSelectedPeriodId,
        categories: state.categories,
        entries: state.entries,
        budgets: state.categoryBudgets,
      }),
    [state.periods, effectiveSelectedPeriodId, state.categories, state.entries, state.categoryBudgets],
  )

  const canCreateBudget = effectiveSelectedPeriodId === state.currentPeriodId

  return (
    <div className="fh-planning-page">
      <div className="fh-card fh-card--elevated fh-planning-page__intro">
        <div>
          <h2>Planejamento</h2>
          <p className="fh-text-secondary">
            <span aria-hidden="true">●</span> Modo demonstrativo: limites válidos somente durante esta sessão.
          </p>
        </div>

        <label className="fh-planning-page__period-select">
          <span>Competência</span>
          <select
            value={effectiveSelectedPeriodId ?? ''}
            onChange={(event) => setSelectedPeriodId(Number(event.target.value))}
            disabled={periodOptions.length === 0}
          >
            {periodOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="fh-planning-page__new"
          onClick={() => setDialog({ kind: 'create' })}
          disabled={!canCreateBudget}
          title={canCreateBudget ? undefined : 'Novos limites só podem ser criados na competência atual.'}
        >
          Definir limite
        </button>
      </div>

      {state.lastActionMessage && (
        <div className="fh-planning-page__toast" role="status">
          <span>{state.lastActionMessage}</span>
          <button type="button" onClick={() => dispatch({ type: 'CLEAR_MESSAGE' })} aria-label="Dispensar aviso">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      {viewModel.isEmpty ? (
        <PlanningEmptyState
          title={viewModel.emptyTitle ?? 'Planejamento indisponível'}
          description={viewModel.emptyDescription ?? 'Não há dados suficientes para montar o planejamento.'}
        />
      ) : (
        <>
          <p className="fh-visually-hidden">{viewModel.accessibleSummary}</p>

          {viewModel.summary && <PlanningSummary summary={viewModel.summary} />}

          <CategoryBudgetList
            rows={viewModel.rows}
            onEditLimit={(row) => setDialog({ kind: 'edit', row })}
            onDefineLimit={(row) => canCreateBudget && setDialog({ kind: 'create', categoryId: row.categoryId })}
          />

          <PlanningChart chart={viewModel.chart} />

          <PlanningEntries plannedEntries={viewModel.plannedEntries} pendingEntries={viewModel.pendingEntries} />
        </>
      )}

      {dialog?.kind === 'create' && (
        <CategoryBudgetForm mode="create" initialCategoryId={dialog.categoryId} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'edit' && dialog.row.budgetId !== null && (
        <CategoryBudgetForm
          mode="edit"
          budgetId={dialog.row.budgetId}
          initialCategoryId={dialog.row.categoryId}
          initialLimitAmountCents={dialog.row.limit?.raw}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
