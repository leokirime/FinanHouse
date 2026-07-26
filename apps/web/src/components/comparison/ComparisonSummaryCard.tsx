import type { ComparisonIndicatorViewModel } from '../../view-models/comparison-view-model.ts'
import './Comparison.css'

export interface ComparisonSummaryCardProps {
  indicator: ComparisonIndicatorViewModel
}

function costText(indicator: ComparisonIndicatorViewModel): string {
  if (indicator.key !== 'realizedExpense' && indicator.key !== 'expectedExpense') return indicator.change.directionLabel
  if (indicator.change.direction === 'increased') return 'aumento de custo'
  if (indicator.change.direction === 'decreased') return 'redução de custo'
  return indicator.change.directionLabel
}

export function ComparisonSummaryCard({ indicator }: ComparisonSummaryCardProps) {
  return (
    <article className="fh-card fh-comparison-summary-card" data-tone={indicator.tone}>
      <div className="fh-comparison-summary-card__header">
        <h3>{indicator.title}</h3>
        <span className="fh-badge">{costText(indicator)}</span>
      </div>
      <dl>
        <div>
          <dt>Base</dt>
          <dd>{indicator.base.label}</dd>
        </div>
        <div>
          <dt>Comparado</dt>
          <dd>{indicator.compared.label}</dd>
        </div>
      </dl>
      <p className="fh-comparison-summary-card__change">
        <span>{indicator.change.absoluteLabel}</span>
        <span>{indicator.change.percentLabel}</span>
      </p>
    </article>
  )
}
