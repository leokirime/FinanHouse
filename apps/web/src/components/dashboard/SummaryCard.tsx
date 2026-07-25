import type { IndicatorCardViewModel } from '../../view-models/dashboard-view-model.ts'
import './SummaryCard.css'

export interface SummaryCardProps {
  indicator: IndicatorCardViewModel
}

const ICON_BY_KEY: Record<IndicatorCardViewModel['key'], string> = {
  realizedIncome: '↑',
  realizedExpense: '↓',
  realizedBalance: '±',
  projectedBalance: '→',
}

export function SummaryCard({ indicator }: SummaryCardProps) {
  return (
    <article className="fh-card fh-summary-card" data-tone={indicator.tone}>
      <div className="fh-summary-card__header">
        <span className="fh-summary-card__icon" aria-hidden="true">
          {ICON_BY_KEY[indicator.key]}
        </span>
        <h3>{indicator.title}</h3>
      </div>
      <p className="fh-summary-card__value">{indicator.value}</p>
      <p className="fh-summary-card__secondary fh-text-secondary">{indicator.secondaryText}</p>
    </article>
  )
}
