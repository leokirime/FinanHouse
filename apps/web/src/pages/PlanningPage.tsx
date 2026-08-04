import { useMemo, useState } from 'react'
import { FinancialEntryForm } from '../components/financial-entries/FinancialEntryForm.tsx'
import { BudgetFormDialog } from '../components/planning/BudgetFormDialog.tsx'
import { BudgetSummaryCards } from '../components/planning/BudgetSummaryCards.tsx'
import { CategoryBudgetList } from '../components/planning/CategoryBudgetList.tsx'
import { PlanningEmptyState } from '../components/planning/PlanningEmptyState.tsx'
import { PlanningEntries } from '../components/planning/PlanningEntries.tsx'
import { PlanningRealSummary } from '../components/planning/PlanningRealSummary.tsx'
import './PlanningPage.css'
import { useReadyFinance } from '../hooks/use-finance.ts'
import { usePeriodBudgets } from '../hooks/use-period-budgets.ts'
import {
  buildEntryRows,
  buildPlanningPeriodOptions,
  buildPlanningRealSummary,
  buildPlanningViewModel,
  type CategoryBudgetRowViewModel,
} from '../view-models/planning-view-model.ts'

type BudgetDialogState = { kind: 'create'; row: CategoryBudgetRowViewModel } | { kind: 'edit'; row: CategoryBudgetRowViewModel } | null

export function PlanningPage() {
  const { state, dispatch } = useReadyFinance()
  const periodOptions = useMemo(() => buildPlanningPeriodOptions(state.periods), [state.periods])
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(state.currentPeriodId)
  const [creatingEntry, setCreatingEntry] = useState(false)
  const [budgetDialog, setBudgetDialog] = useState<BudgetDialogState>(null)

  const effectiveSelectedPeriodId =
    selectedPeriodId !== null && periodOptions.some((option) => option.id === selectedPeriodId) ? selectedPeriodId : (periodOptions[0]?.id ?? null)

  const selectedPeriod = state.periods.find((period) => period.id === effectiveSelectedPeriodId) ?? null
  const canManageLimits = selectedPeriod !== null && selectedPeriod.status !== 'closed'

  const periodBudgets = usePeriodBudgets(selectedPeriod?.referenceMonth ?? null)

  const viewModel = useMemo(
    () =>
      buildPlanningViewModel({
        periods: state.periods,
        selectedPeriodId: effectiveSelectedPeriodId,
        categories: state.categories,
        entries: state.entries,
        budgets: periodBudgets.status === 'ready' ? periodBudgets.budgets : [],
      }),
    [state.periods, effectiveSelectedPeriodId, state.categories, state.entries, periodBudgets.status, periodBudgets.budgets],
  )

  const realSummary = useMemo(
    () => (viewModel.summary && effectiveSelectedPeriodId !== null ? buildPlanningRealSummary(state.entries, effectiveSelectedPeriodId, viewModel.summary) : null),
    [state.entries, effectiveSelectedPeriodId, viewModel.summary],
  )

  const incomePlannedEntries = useMemo(
    () => (effectiveSelectedPeriodId !== null ? buildEntryRows(state.entries, state.categories, effectiveSelectedPeriodId, 'planned', 'income') : []),
    [state.entries, state.categories, effectiveSelectedPeriodId],
  )
  const incomePendingEntries = useMemo(
    () => (effectiveSelectedPeriodId !== null ? buildEntryRows(state.entries, state.categories, effectiveSelectedPeriodId, 'pending', 'income') : []),
    [state.entries, state.categories, effectiveSelectedPeriodId],
  )

  const canCreateEntry = effectiveSelectedPeriodId === state.currentPeriodId

  return (
    <div className="fh-planning-page">
      <div className="fh-card fh-card--elevated fh-planning-page__intro">
        <div>
          <h2>Planejamento</h2>
          <p className="fh-text-secondary">Contas previstas e limites mensais por categoria da competência.</p>
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
          onClick={() => setCreatingEntry(true)}
          disabled={!canCreateEntry}
          title={canCreateEntry ? undefined : 'Novas contas previstas só podem ser criadas na competência atual.'}
        >
          Adicionar conta prevista
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

      {periodBudgets.status === 'error' && (
        <div className="fh-planning-page__toast" role="alert">
          <span>Não foi possível carregar os limites por categoria: {periodBudgets.error?.message}</span>
          <button type="button" onClick={periodBudgets.retry}>
            Tentar novamente
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

          {realSummary && <PlanningRealSummary summary={realSummary} />}

          {viewModel.summary && <BudgetSummaryCards summary={viewModel.summary} />}

          <CategoryBudgetList
            rows={viewModel.rows}
            canManageLimits={canManageLimits}
            pendingAction={periodBudgets.pendingAction}
            onDefineLimit={(row) => setBudgetDialog({ kind: 'create', row })}
            onEditLimit={(row) => setBudgetDialog({ kind: 'edit', row })}
            onRemoveLimit={(row) => periodBudgets.remove(row.categoryId)}
          />

          <PlanningEntries
            title="Receitas previstas"
            headingId="planning-income-entries-heading"
            plannedEntries={incomePlannedEntries}
            pendingEntries={incomePendingEntries}
            plannedEmptyText="Nenhuma receita planejada nesta competência."
            pendingEmptyText="Nenhuma receita pendente nesta competência."
          />

          <PlanningEntries
            title="Despesas previstas"
            headingId="planning-expense-entries-heading"
            plannedEntries={viewModel.plannedEntries}
            pendingEntries={viewModel.pendingEntries}
            plannedEmptyText="Nenhuma despesa planejada nesta competência."
            pendingEmptyText="Nenhuma despesa pendente nesta competência."
          />
        </>
      )}

      {creatingEntry && <FinancialEntryForm mode="create" onClose={() => setCreatingEntry(false)} />}

      {budgetDialog && (
        <BudgetFormDialog
          mode={budgetDialog.kind}
          periodBudgets={periodBudgets}
          categoryId={budgetDialog.row.categoryId}
          categoryName={budgetDialog.row.categoryName}
          initialLimitAmount={budgetDialog.row.limit?.raw}
          onClose={() => setBudgetDialog(null)}
        />
      )}
    </div>
  )
}
