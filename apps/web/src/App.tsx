import { AppShell } from './components/layout/AppShell.tsx'
import { DashboardHeader } from './components/layout/DashboardHeader.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { buildDashboardViewModel } from './view-models/dashboard-view-model.ts'

function App() {
  const { periodOverview } = buildDashboardViewModel()

  return (
    <AppShell
      header={
        <DashboardHeader
          areaTitle="Visão geral"
          periodLabel={periodOverview.referenceMonthLabel}
          statusLabel={periodOverview.statusLabel}
        />
      }
    >
      <DashboardPage />
    </AppShell>
  )
}

export default App
