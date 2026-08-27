import App from './App.tsx'
import { FinanceStatusScreen } from './components/layout/FinanceStatusScreen.tsx'
import { useAuth } from './hooks/use-auth.ts'
import { LoginPage } from './pages/LoginPage.tsx'
import { FinanceProvider } from './state/FinanceProvider.tsx'

/**
 * Fronteira de autenticação (Bloco 19, DT-14) — nunca monta `FinanceProvider`
 * (que exige sessão via `useAuthenticated()`) antes de `AuthProvider`
 * confirmar `status: 'authenticated'`. Mantém `App.tsx` livre de qualquer
 * conhecimento sobre autenticação, exatamente como antes do Bloco 19 (só
 * `useFinance()`), para que o gate de sessão e o gate de carregamento
 * financeiro continuem sendo responsabilidades separadas e testáveis
 * isoladamente.
 */
export function AppRoot() {
  const { state: authState, retry } = useAuth()

  if (authState.status === 'loading') {
    return <FinanceStatusScreen kind="loading" title="Verificando sua sessão" description="Confirmando se você já está autenticado no HouseManager." />
  }

  if (authState.status === 'error') {
    return <FinanceStatusScreen kind="error" error={authState.error} onRetry={retry} />
  }

  if (authState.status === 'unauthenticated') {
    return <LoginPage />
  }

  return (
    <FinanceProvider>
      <App />
    </FinanceProvider>
  )
}
