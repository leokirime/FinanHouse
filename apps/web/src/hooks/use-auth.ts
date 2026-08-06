import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../state/auth-context.ts'
import type { AuthState } from '../state/auth-types.ts'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth() só pode ser usado dentro de <AuthProvider>.')
  }
  return context
}

export interface AuthenticatedContextValue extends Omit<AuthContextValue, 'state'> {
  state: Extract<AuthState, { status: 'authenticated' }>
}

/** Variante usada por componentes que só montam quando a sessão já está autenticada (gateado em `App.tsx`) — evita checar `state.status` em todo componente. */
export function useAuthenticated(): AuthenticatedContextValue {
  const context = useAuth()
  if (context.state.status !== 'authenticated') {
    throw new Error('useAuthenticated() só pode ser usado quando a sessão está autenticada (status "authenticated").')
  }
  return context as AuthenticatedContextValue
}
