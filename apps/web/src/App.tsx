import { Navigate, Route, Routes } from 'react-router'
import { RootLayout } from './components/layout/RootLayout.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { FinancialEntriesPage } from './pages/FinancialEntriesPage.tsx'

function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="movimentacoes" element={<FinancialEntriesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
