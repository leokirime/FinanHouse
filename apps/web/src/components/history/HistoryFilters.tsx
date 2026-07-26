import type { HistoryFilters as HistoryFiltersState, HistoryViewModel } from '../../view-models/history-view-model.ts'
import { DEFAULT_HISTORY_FILTERS } from '../../view-models/history-view-model.ts'
import './History.css'

export interface HistoryFiltersProps {
  filters: HistoryFiltersState
  availableYears: number[]
  periodStatusOptions: HistoryViewModel['periodStatusOptions']
  entryStatusOptions: HistoryViewModel['entryStatusOptions']
  onChange: (filters: HistoryFiltersState) => void
}

function isDefaultFilters(filters: HistoryFiltersState): boolean {
  return filters.year === 'all' && filters.periodStatus === 'all' && filters.entryStatus === 'all'
}

export function HistoryFilters({ filters, availableYears, periodStatusOptions, entryStatusOptions, onChange }: HistoryFiltersProps) {
  function update(partial: Partial<HistoryFiltersState>) {
    onChange({ ...filters, ...partial })
  }

  return (
    <div className="fh-card fh-history-filters">
      <label className="fh-history-filters__field">
        <span>Ano</span>
        <select
          value={filters.year}
          onChange={(event) => update({ year: event.target.value === 'all' ? 'all' : Number(event.target.value) })}
        >
          <option value="all">Todos os anos</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <label className="fh-history-filters__field">
        <span>Status da competência</span>
        <select value={filters.periodStatus} onChange={(event) => update({ periodStatus: event.target.value as HistoryFiltersState['periodStatus'] })}>
          {periodStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="fh-history-filters__field">
        <span>Status da movimentação</span>
        <select value={filters.entryStatus} onChange={(event) => update({ entryStatus: event.target.value as HistoryFiltersState['entryStatus'] })}>
          {entryStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="fh-history-filters__clear" onClick={() => onChange(DEFAULT_HISTORY_FILTERS)} disabled={isDefaultFilters(filters)}>
        Limpar filtros
      </button>
    </div>
  )
}
