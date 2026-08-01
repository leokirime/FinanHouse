import { useMemo, useState } from 'react'
import { FinancialEntryForm } from '../components/financial-entries/FinancialEntryForm.tsx'
import { CategoryDistributionList } from '../components/planning/CategoryDistributionList.tsx'
import { PlanningEmptyState } from '../components/planning/PlanningEmptyState.tsx'
import { PlanningEntries } from '../components/planning/PlanningEntries.tsx'
import { PlanningRealSummary } from '../components/planning/PlanningRealSummary.tsx'
import './PlanningPage.css'
import { useReadyFinance } from '../hooks/use-finance.ts'
import { buildEntryRows, buildPlanningPeriodOptions, buildPlanningRealSummary, buildPlanningViewModel } from '../view-models/planning-view-model.ts'

export function PlanningPage() {
  const { state, dispatch } = useReadyFinance()
  const periodOptions = useMemo(() => buildPlanningPeriodOptions(state.periods), [state.periods])
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(state.currentPeriodId)
  const [creatingEntry, setCreatingEntry] = useState(false)

  const effectiveSelectedPeriodId =
    selectedPeriodId !== null && periodOptions.some((option) => option.id === selectedPeriodId) ? selectedPeriodId : (periodOptions[0]?.id ?? null)

  const viewModel = useMemo(
    () =>
      buildPlanningViewModel({
        periods: state.periods,
        selectedPeriodId: effectiveSelectedPeriodId,
        categories: state.categories,
        entries: state.entries,
        // Limites por categoria ainda não têm persistência própria (DT-12) — a distribuição
        // reflete somente a soma de movimentações reais, nunca um `CategoryBudget` fictício.
        budgets: [],
      }),
    [state.periods, effectiveSelectedPeriodId, state.categories, state.entries],
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
          <p className="fh-text-secondary">Contas previstas da competência — receitas e despesas planejadas ou pendentes.</p>
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

      {viewModel.isEmpty ? (
        <PlanningEmptyState
          title={viewModel.emptyTitle ?? 'Planejamento indisponível'}
          description={viewModel.emptyDescription ?? 'Não há dados suficientes para montar o planejamento.'}
        />
      ) : (
        <>
          <p className="fh-visually-hidden">{viewModel.accessibleSummary}</p>

          {realSummary && <PlanningRealSummary summary={realSummary} />}

          <CategoryDistributionList rows={viewModel.rows} />

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
    </div>
  )
}
