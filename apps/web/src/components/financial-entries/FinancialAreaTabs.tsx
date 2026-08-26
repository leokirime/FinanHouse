import { NavLink } from 'react-router'
import './FinancialAreaTabs.css'

/**
 * Sub-navegação dentro da área "Movimentações" (Sessão 12, Bloco 05) — não é
 * um item novo na navegação global (`Sidebar.tsx` continua com só 5 itens);
 * parcelamentos é alcançado a partir de Movimentações, como uma extensão da
 * mesma área, não uma área principal nova. `NavLink` de "Movimentações" na
 * sidebar não usa `end`, então continua "ativo" tanto em `/movimentacoes`
 * quanto em `/movimentacoes/parcelamentos`.
 */
export function FinancialAreaTabs() {
  return (
    <nav className="fh-area-tabs" aria-label="Áreas de Movimentações">
      <NavLink to="/movimentacoes" end className="fh-area-tabs__tab">
        Lançamentos
      </NavLink>
      <NavLink to="/movimentacoes/parcelamentos" className="fh-area-tabs__tab">
        Parcelamentos
      </NavLink>
    </nav>
  )
}
