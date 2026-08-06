import { createContext } from 'react'
import type { AuthState } from './auth-types.ts'

export interface AuthContextValue {
  state: AuthState
  login: (email: string, password: string) => void
  logout: () => void
  clearLoginError: () => void
  /** Refaz a carga da sessão do zero — usado pela tela de erro quando `status: 'error'`. */
  retry: () => void
  /** Chamada por outros providers (ex.: `FinanceProvider`) ao receberem 401 no meio da sessão — nunca chamada diretamente pela UI. */
  notifyUnauthenticated: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
