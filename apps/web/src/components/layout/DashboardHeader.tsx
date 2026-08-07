import { useAuthenticated } from '../../hooks/use-auth.ts'
import './DashboardHeader.css'

export interface DashboardHeaderProps {
  areaTitle: string
  periodLabel: string
  statusLabel: string
}

/** Presume sessão autenticada (`useAuthenticated()`) — só é montado dentro de `FinanceGatedRoutes`, sempre depois do gate de autenticação (`App.tsx`). */
export function DashboardHeader({ areaTitle, periodLabel, statusLabel }: DashboardHeaderProps) {
  const { state, logout } = useAuthenticated()

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
        <span className="fh-header__profile fh-text-secondary" aria-label="Usuária autenticada">
          {state.user.displayName}
        </span>
        <button type="button" className="fh-header__logout" onClick={logout} disabled={state.pendingLogout} aria-busy={state.pendingLogout}>
          {state.pendingLogout ? 'Saindo…' : 'Sair'}
        </button>
      </div>
    </header>
  )
}
