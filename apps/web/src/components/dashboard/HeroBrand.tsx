import housemanagerLogo from '../../../../../assets/images/HouseManager.png'
import type { PeriodOverviewViewModel } from '../../view-models/dashboard-view-model.ts'
import './HeroBrand.css'

export interface HeroBrandProps {
  overview: PeriodOverviewViewModel
}

export function HeroBrand({ overview }: HeroBrandProps) {
  const heading = overview.referenceMonthLabel.charAt(0).toUpperCase() + overview.referenceMonthLabel.slice(1)

  return (
    <section className="fh-card fh-card--elevated fh-hero" aria-labelledby="hero-heading">
      <img
        src={housemanagerLogo}
        alt="HouseManager — Casa, evolução e equilíbrio"
        className="fh-hero__logo"
      />

      <div className="fh-hero__info">
        <div>
          <h2 id="hero-heading">{heading}</h2>
          <p className="fh-text-secondary">{overview.contextText}</p>
        </div>
        <div className="fh-hero__status">
          <span className="fh-badge" data-tone={overview.status}>
            {overview.statusLabel}
          </span>
          <button type="button" className="fh-hero__review-cta" disabled>
            Revisar mês
          </button>
        </div>
      </div>
    </section>
  )
}
