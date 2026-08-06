import type { ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '../auth-context.ts'
import type { AuthState } from '../auth-types.ts'

export interface AuthTestProviderProps {
  children: ReactNode
  state?: AuthState
  notifyUnauthenticated?: () => void
}

/** Provider de teste — nunca usado pelo app real (ver `AuthProvider.tsx`). Autenticado por padrão (household 1), como a maioria dos testes espera. */
export function AuthTestProvider({ children, state, notifyUnauthenticated }: AuthTestProviderProps) {
  const value: AuthContextValue = {
    state: state ?? { status: 'authenticated', user: { id: 100, displayName: 'Usuária de Teste', email: 'teste@finanhouse.invalid' }, householdId: 1, pendingLogout: false },
    login: () => {},
    logout: () => {},
    clearLoginError: () => {},
    retry: () => {},
    notifyUnauthenticated: notifyUnauthenticated ?? (() => {}),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
