import { Navigate, Route, Routes } from 'react-router'
import { RootLayout } from './components/layout/RootLayout.tsx'
import { ComparisonPage } from './pages/ComparisonPage.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { FinancialEntriesPage } from './pages/FinancialEntriesPage.tsx'
import { HistoryPage } from './pages/HistoryPage.tsx'
import { PlanningPage } from './pages/PlanningPage.tsx'

function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="movimentacoes" element={<FinancialEntriesPage />} />
        <Route path="comparativo" element={<ComparisonPage />} />
        <Route path="planejamento" element={<PlanningPage />} />
        <Route path="historico" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
