import type { PeriodOverviewViewModel } from '../../view-models/dashboard-view-model.ts'
import './PeriodOverview.css'

export interface PeriodOverviewProps {
  overview: PeriodOverviewViewModel
}

export function PeriodOverview({ overview }: PeriodOverviewProps) {
  const heading = overview.referenceMonthLabel.charAt(0).toUpperCase() + overview.referenceMonthLabel.slice(1)

  return (
    <section className="fh-card fh-card--elevated fh-period-overview" aria-labelledby="period-overview-heading">
      <div>
        <h2 id="period-overview-heading">{heading}</h2>
        <p className="fh-text-secondary">{overview.contextText}</p>
      </div>
      <div className="fh-period-overview__status">
        <span className="fh-badge" data-tone={overview.status}>
          {overview.statusLabel}
        </span>
        <button type="button" className="fh-period-overview__review-cta" aria-disabled="true">
          Revisar mês
        </button>
      </div>
    </section>
  )
}
