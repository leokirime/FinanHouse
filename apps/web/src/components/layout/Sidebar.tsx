import { Link, NavLink } from 'react-router'
import finanhouseLogoHero from '../../../../../assets/images/finanhouse-logo-hero.png'
import { Brand } from '../brand/Brand.tsx'
import './Sidebar.css'

interface AvailableNavItem {
  key: string
  label: string
  to: string
  available: true
}

interface UnavailableNavItem {
  key: string
  label: string
  available: false
}

type SidebarNavItem = AvailableNavItem | UnavailableNavItem

const NAV_ITEMS: SidebarNavItem[] = [
  { key: 'overview', label: 'Visão geral', to: '/', available: true },
  { key: 'entries', label: 'Movimentações', to: '/movimentacoes', available: true },
  { key: 'comparison', label: 'Comparativo', to: '/comparativo', available: true },
  { key: 'planning', label: 'Planejamento', to: '/planejamento', available: true },
  { key: 'history', label: 'Histórico', to: '/historico', available: true },
  { key: 'settings', label: 'Configurações', available: false },
]

export function Sidebar() {
  return (
    <aside className="fh-sidebar" aria-label="Barra lateral">
      <div className="fh-sidebar__brand">
        <Link to="/" className="fh-sidebar__brand-link" aria-label="Ir para a visão geral do FinanHouse">
          <Brand logoSrc={finanhouseLogoHero} size="sidebar" />
        </Link>
      </div>
      <nav className="fh-sidebar__nav" aria-label="Áreas do Finanhouse">
        <ul>
          {NAV_ITEMS.map((item) =>
            item.available ? (
              <li key={item.key}>
                <NavLink to={item.to} end={item.to === '/'} className="fh-sidebar__nav-item">
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ) : (
              <li key={item.key}>
                <button type="button" className="fh-sidebar__nav-item" disabled>
                  <span>{item.label}</span>
                  <span className="fh-badge fh-sidebar__soon">em breve</span>
                </button>
              </li>
            ),
          )}
        </ul>
      </nav>
      <div className="fh-sidebar__footer">
        <span className="fh-badge fh-sidebar__demo-badge">
          <span aria-hidden="true">●</span> Dados simulados
        </span>
      </div>
    </aside>
  )
}
