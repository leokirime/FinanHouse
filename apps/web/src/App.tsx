import { Navigate, Route, Routes } from 'react-router'
import { FinanceStatusScreen } from './components/layout/FinanceStatusScreen.tsx'
import { RootLayout } from './components/layout/RootLayout.tsx'
import { useFinance } from './hooks/use-finance.ts'
import { ComparisonPage } from './pages/ComparisonPage.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { FinancialEntriesPage } from './pages/FinancialEntriesPage.tsx'
import { HistoryPage } from './pages/HistoryPage.tsx'
import { InstallmentPlansPage } from './pages/InstallmentPlansPage.tsx'
import { PlanningPage } from './pages/PlanningPage.tsx'

/**
 * Gateia toda a árvore de rotas até o carregamento inicial da API terminar
 * — `RootLayout`/páginas presumem `status: 'ready'` (nunca leem fixtures
 * como alternativa a uma API indisponível, DT-12). Presume `FinanceProvider`
 * já montado por quem renderiza `<App/>` (`AppRoot.tsx`) — só acontece
 * depois que a sessão está autenticada (Bloco 19, DT-14).
 */
function App() {
  const { state, dispatch } = useFinance()

  if (state.status === 'loading') {
    return <FinanceStatusScreen kind="loading" />
  }

  if (state.status === 'error') {
    return <FinanceStatusScreen kind="error" error={state.error} onRetry={() => dispatch({ type: 'RETRY' })} />
  }

  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="movimentacoes" element={<FinancialEntriesPage />} />
        <Route path="movimentacoes/parcelamentos" element={<InstallmentPlansPage />} />
        <Route path="comparativo" element={<ComparisonPage />} />
        <Route path="planejamento" element={<PlanningPage />} />
        <Route path="historico" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
