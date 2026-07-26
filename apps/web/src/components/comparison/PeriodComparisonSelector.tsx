import type { PeriodOptionViewModel } from '../../view-models/comparison-view-model.ts'
import './Comparison.css'

export interface PeriodComparisonSelectorProps {
  options: PeriodOptionViewModel[]
  basePeriodId: number | null
  comparedPeriodId: number | null
  onBasePeriodChange: (periodId: number) => void
  onComparedPeriodChange: (periodId: number) => void
}

export function PeriodComparisonSelector({
  options,
  basePeriodId,
  comparedPeriodId,
  onBasePeriodChange,
  onComparedPeriodChange,
}: PeriodComparisonSelectorProps) {
  return (
    <section className="fh-card fh-comparison-selector" aria-label="Seleção de competências">
      <label>
        <span>Período base</span>
        <select
          value={basePeriodId ?? ''}
          onChange={(event) => onBasePeriodChange(Number(event.target.value))}
          disabled={options.length < 2}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id} disabled={option.id === comparedPeriodId}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Período comparado</span>
        <select
          value={comparedPeriodId ?? ''}
          onChange={(event) => onComparedPeriodChange(Number(event.target.value))}
          disabled={options.length < 2}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id} disabled={option.id === basePeriodId}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
