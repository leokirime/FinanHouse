import type { HistoryPeriodOptionViewModel } from '../../view-models/history-view-model.ts'
import './History.css'

export interface PeriodHistoryListProps {
  periods: HistoryPeriodOptionViewModel[]
  selectedPeriodId: number | null
  onSelect: (periodId: number) => void
}

/** Lista cronológica de competências — somente consulta: selecionar aqui nunca cria, edita nem exclui nada. */
export function PeriodHistoryList({ periods, selectedPeriodId, onSelect }: PeriodHistoryListProps) {
  return (
    <nav className="fh-card fh-history-period-list" aria-label="Competências do histórico">
      <ul>
        {periods.map((period) => {
          const isSelected = period.id === selectedPeriodId
          return (
            <li key={period.id}>
              <button
                type="button"
                className="fh-history-period-list__item"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => onSelect(period.id)}
              >
                <span>{period.label}</span>
                <span className="fh-badge" data-tone={period.status}>
                  {period.statusLabel}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
