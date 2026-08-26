import type { FinancialEntry } from '@finanhouse/domain'
import { useMemo, useState } from 'react'
import { DeleteEntryDialog } from '../components/financial-entries/DeleteEntryDialog.tsx'
import { FinancialAreaTabs } from '../components/financial-entries/FinancialAreaTabs.tsx'
import { FinancialEntryEmptyState } from '../components/financial-entries/FinancialEntryEmptyState.tsx'
import { FinancialEntryFilters } from '../components/financial-entries/FinancialEntryFilters.tsx'
import { FinancialEntryForm } from '../components/financial-entries/FinancialEntryForm.tsx'
import { FinancialEntryList } from '../components/financial-entries/FinancialEntryList.tsx'
import { RealizeEntryDialog } from '../components/financial-entries/RealizeEntryDialog.tsx'
import { useReadyFinance } from '../hooks/use-finance.ts'
import { DEFAULT_FINANCIAL_ENTRIES_FILTERS, filterFinancialEntries, type FinancialEntriesFilters } from '../view-models/financial-entries-view-model.ts'
import './FinancialEntriesPage.css'

type DialogState = { kind: 'create' } | { kind: 'edit'; entry: FinancialEntry } | { kind: 'realize'; entry: FinancialEntry } | { kind: 'delete'; entry: FinancialEntry } | null

export function FinancialEntriesPage() {
  const { state, dispatch } = useReadyFinance()
  const [filters, setFilters] = useState<FinancialEntriesFilters>(DEFAULT_FINANCIAL_ENTRIES_FILTERS)
  const [dialog, setDialog] = useState<DialogState>(null)

  const filteredEntries = useMemo(
    () => filterFinancialEntries(state.entries, state.categories, state.currentPeriodId, filters),
    [state.entries, state.categories, state.currentPeriodId, filters],
  )

  const totalInPeriod = state.entries.filter((entry) => entry.periodId === state.currentPeriodId).length
  const hasActiveFilters =
    filters.type !== 'all' || filters.status !== 'all' || filters.categoryId !== 'all' || filters.search.trim() !== ''

  return (
    <div className="fh-financial-entries-page">
      <FinancialAreaTabs />

      <div className="fh-card fh-card--elevated fh-financial-entries-page__intro">
        <div>
          <h2>Movimentações</h2>
        </div>
        <button type="button" className="fh-financial-entries-page__new" onClick={() => setDialog({ kind: 'create' })}>
          Nova movimentação
        </button>
      </div>

      {state.lastActionMessage && (
        <div className="fh-financial-entries-page__toast" role="status">
          <span>{state.lastActionMessage}</span>
          <button type="button" onClick={() => dispatch({ type: 'CLEAR_MESSAGE' })} aria-label="Dispensar aviso">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      <FinancialEntryFilters filters={filters} categories={state.categories} onChange={setFilters} />

      <p className="fh-text-secondary fh-financial-entries-page__summary">
        {hasActiveFilters
          ? `Mostrando ${filteredEntries.length} de ${totalInPeriod} movimentações da competência.`
          : `${totalInPeriod} movimentações nesta competência.`}
      </p>

      {filteredEntries.length === 0 ? (
        <FinancialEntryEmptyState hasActiveFilters={hasActiveFilters} />
      ) : (
        <FinancialEntryList
          entries={filteredEntries}
          categories={state.categories}
          onEdit={(entry) => setDialog({ kind: 'edit', entry })}
          onRealize={(entry) => setDialog({ kind: 'realize', entry })}
          onDelete={(entry) => setDialog({ kind: 'delete', entry })}
        />
      )}

      {dialog?.kind === 'create' && <FinancialEntryForm mode="create" onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <FinancialEntryForm mode="edit" entry={dialog.entry} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'realize' && <RealizeEntryDialog entry={dialog.entry} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteEntryDialog entry={dialog.entry} onClose={() => setDialog(null)} />}
    </div>
  )
}
