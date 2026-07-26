import { Outlet, useLocation } from 'react-router'
import { useDashboardViewModel } from '../../hooks/use-dashboard-view-model.ts'
import { AppShell } from './AppShell.tsx'
import { DashboardHeader } from './DashboardHeader.tsx'

const AREA_TITLE_BY_PATH: Record<string, string> = {
  '/': 'Visão geral',
  '/movimentacoes': 'Movimentações',
  '/comparativo': 'Comparativo',
}

/**
 * Layout raiz das rotas funcionais: monta `AppShell`/`DashboardHeader` uma
 * única vez e renderiza a página ativa via `<Outlet />`. O título da área e
 * a competência/status vêm do mesmo view-model do dashboard — nenhuma rota
 * lê a competência atual por conta própria.
 */
export function RootLayout() {
  const location = useLocation()
  const { periodOverview } = useDashboardViewModel()
  const areaTitle = AREA_TITLE_BY_PATH[location.pathname] ?? 'Visão geral'

  return (
    <AppShell
      header={
        <DashboardHeader
          areaTitle={areaTitle}
          periodLabel={periodOverview.referenceMonthLabel}
          statusLabel={periodOverview.statusLabel}
        />
      }
    >
      <Outlet />
    </AppShell>
  )
}
