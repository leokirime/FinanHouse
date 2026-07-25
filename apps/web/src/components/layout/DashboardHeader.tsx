import './DashboardHeader.css'

export interface DashboardHeaderProps {
  areaTitle: string
  periodLabel: string
  statusLabel: string
}

export function DashboardHeader({ areaTitle, periodLabel, statusLabel }: DashboardHeaderProps) {
  return (
    <header className="fh-header">
      <div className="fh-header__title">
        <h1>{areaTitle}</h1>
        <p className="fh-header__period fh-text-secondary">
          <span>{periodLabel}</span>
          <span className="fh-badge">{statusLabel}</span>
        </p>
      </div>
      <div className="fh-header__actions">
        <span className="fh-header__profile fh-text-secondary" aria-label="Perfil doméstico ativo (apenas visual)">
          Casa Finanhouse
        </span>
        <button type="button" className="fh-header__cta" aria-disabled="true">
          Nova movimentação
        </button>
      </div>
    </header>
  )
}
