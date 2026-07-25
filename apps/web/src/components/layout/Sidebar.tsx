import { Brand } from '../brand/Brand.tsx'
import './Sidebar.css'

interface SidebarNavItem {
  key: string
  label: string
  available: boolean
}

const NAV_ITEMS: SidebarNavItem[] = [
  { key: 'overview', label: 'Visão geral', available: true },
  { key: 'entries', label: 'Movimentações', available: false },
  { key: 'comparison', label: 'Comparativo', available: false },
  { key: 'planning', label: 'Planejamento', available: false },
  { key: 'history', label: 'Histórico', available: false },
  { key: 'settings', label: 'Configurações', available: false },
]

export function Sidebar() {
  return (
    <aside className="fh-sidebar" aria-label="Barra lateral">
      <div className="fh-sidebar__brand">
        <Brand />
      </div>
      <nav className="fh-sidebar__nav" aria-label="Áreas do Finanhouse">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                className="fh-sidebar__nav-item"
                aria-current={item.available ? 'page' : undefined}
                disabled={!item.available}
              >
                <span>{item.label}</span>
                {!item.available && <span className="fh-badge fh-sidebar__soon">em breve</span>}
              </button>
            </li>
          ))}
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
