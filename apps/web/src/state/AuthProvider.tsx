import { useCallback, useEffect, useReducer, useRef, type ReactNode } from 'react'
import { getSession, login as loginRequest, logout as logoutRequest, type AuthUser } from '../api/auth-api.ts'
import { ApiError } from '../api/api-errors.ts'
import { resolveApiBaseConfig } from '../api/api-config.ts'
import { AuthContext, type AuthContextValue } from './auth-context.ts'
import type { AuthState } from './auth-types.ts'

export interface AuthProviderProps {
  children: ReactNode
}

type InternalEvent =
  | { kind: 'LOAD_START' }
  | { kind: 'LOAD_AUTHENTICATED'; user: AuthUser; householdId: number }
  | { kind: 'LOAD_UNAUTHENTICATED' }
  | { kind: 'LOAD_FAILURE'; error: ApiError }
  | { kind: 'LOGIN_START' }
  | { kind: 'LOGIN_SUCCESS'; user: AuthUser; householdId: number }
  | { kind: 'LOGIN_FAILURE'; message: string }
  | { kind: 'CLEAR_LOGIN_ERROR' }
  | { kind: 'LOGOUT_START' }
  | { kind: 'LOGOUT_DONE' }

function reducer(state: AuthState, event: InternalEvent): AuthState {
  switch (event.kind) {
    case 'LOAD_START':
      return { status: 'loading' }
    case 'LOAD_AUTHENTICATED':
      return { status: 'authenticated', user: event.user, householdId: event.householdId, pendingLogout: false }
    case 'LOAD_UNAUTHENTICATED':
      return { status: 'unauthenticated', pendingLogin: false, loginError: null }
    case 'LOAD_FAILURE':
      return { status: 'error', error: event.error }
    case 'LOGIN_START':
      return state.status === 'unauthenticated' ? { ...state, pendingLogin: true, loginError: null } : state
    case 'LOGIN_SUCCESS':
      return { status: 'authenticated', user: event.user, householdId: event.householdId, pendingLogout: false }
    case 'LOGIN_FAILURE':
      return state.status === 'unauthenticated' ? { ...state, pendingLogin: false, loginError: event.message } : state
    case 'CLEAR_LOGIN_ERROR':
      return state.status === 'unauthenticated' ? { ...state, loginError: null } : state
    case 'LOGOUT_START':
      return state.status === 'authenticated' ? { ...state, pendingLogout: true } : state
    case 'LOGOUT_DONE':
      return { status: 'unauthenticated', pendingLogin: false, loginError: null }
    default:
      return state
  }
}

/**
 * Nunca expõe detalhe técnico do login — a API já devolve mensagem genérica
 * para credencial inválida (DT-14); aqui cobrimos as falhas do próprio
 * cliente (rede/timeout) e traduzimos a mensagem de rate limit do Fastify
 * (`@fastify/rate-limit`, em inglês) para um texto do produto.
 */
function safeLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return 'Não foi possível conectar ao HouseManager. Verifique se a API local está em execução.'
    if (error.kind === 'timeout') return 'A API não respondeu a tempo. Tente novamente.'
    if (error.kind === 'rate_limited') return 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.'
    return error.message
  }
  return 'Não foi possível entrar. Tente novamente.'
}

/**
 * Fonte única do estado de autenticação — sessão real por cookie `HttpOnly`
 * (Bloco 19, DT-14). Nunca guarda token/senha; `FinanceProvider` só monta
 * depois que este provider chega a `status: 'authenticated'` (`App.tsx`).
 * Mesmo padrão de carga StrictMode-safe do `FinanceProvider` (`active` local
 * + `AbortController` por execução do efeito, `requestId` contra execução
 * obsoleta).
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatchInternal] = useReducer(reducer, { status: 'loading' })
  const [loadAttempt, requestReload] = useReducer((attempt: number) => attempt + 1, 0)
  /**
   * Geração compartilhada entre carga inicial, login e logout — não só entre execuções da carga
   * inicial. Sem isto, uma verificação de sessão lenta iniciada antes do login (`GET /auth/session`,
   * ainda em voo) podia resolver DEPOIS de um `LOGIN_SUCCESS` e sobrescrever o estado autenticado com
   * `unauthenticated` (401 obsoleto). Cada operação captura sua própria geração ao começar e só
   * despacha se ainda for a mais recente quando termina.
   */
  const requestIdRef = useRef(0)
  const loadControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const pendingActionRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const requestId = ++requestIdRef.current
    const controller = new AbortController()
    loadControllerRef.current = controller
    let active = true

    dispatchInternal({ kind: 'LOAD_START' })

    async function loadSession() {
      try {
        const config = resolveApiBaseConfig()
        const session = await getSession(config, controller.signal)
        if (!active || requestIdRef.current !== requestId) return
        dispatchInternal({ kind: 'LOAD_AUTHENTICATED', user: session.user, householdId: session.householdId })
      } catch (error) {
        if (!active || requestIdRef.current !== requestId) return
        if (error instanceof ApiError && error.kind === 'cancelled') return
        if (error instanceof ApiError && error.kind === 'unauthenticated') {
          dispatchInternal({ kind: 'LOAD_UNAUTHENTICATED' })
          return
        }
        const apiError = error instanceof ApiError ? error : new ApiError('unexpected_response', 'Falha inesperada ao carregar a sessão.')
        dispatchInternal({ kind: 'LOAD_FAILURE', error: apiError })
      }
    }

    void loadSession()

    return () => {
      active = false
      controller.abort()
    }
  }, [loadAttempt])

  const login = useCallback((email: string, password: string) => {
    if (pendingActionRef.current) return
    pendingActionRef.current = true
    // Invalida qualquer carga inicial ainda em voo — nem sua resposta (guardada pelo requestId) nem
    // sua promise pendente (abortada aqui) podem mais sobrescrever o resultado deste login.
    const requestId = ++requestIdRef.current
    loadControllerRef.current?.abort()
    dispatchInternal({ kind: 'LOGIN_START' })

    void (async () => {
      try {
        const config = resolveApiBaseConfig()
        const session = await loginRequest(config, email, password)
        pendingActionRef.current = false
        if (!mountedRef.current || requestIdRef.current !== requestId) return
        dispatchInternal({ kind: 'LOGIN_SUCCESS', user: session.user, householdId: session.householdId })
      } catch (error) {
        pendingActionRef.current = false
        if (!mountedRef.current || requestIdRef.current !== requestId) return
        dispatchInternal({ kind: 'LOGIN_FAILURE', message: safeLoginErrorMessage(error) })
      }
    })()
  }, [])

  const logout = useCallback(() => {
    const requestId = ++requestIdRef.current
    loadControllerRef.current?.abort()
    dispatchInternal({ kind: 'LOGOUT_START' })
    void (async () => {
      try {
        const config = resolveApiBaseConfig()
        await logoutRequest(config)
      } catch {
        // Logout é idempotente do lado do servidor — mesmo se a chamada falhar (ex.: rede),
        // o cookie local perde validade ao limparmos o estado local abaixo.
      } finally {
        if (mountedRef.current && requestIdRef.current === requestId) dispatchInternal({ kind: 'LOGOUT_DONE' })
      }
    })()
  }, [])

  const clearLoginError = useCallback(() => dispatchInternal({ kind: 'CLEAR_LOGIN_ERROR' }), [])

  /** `FinanceProvider`/`usePeriodBudgets` chamam isto ao receber 401 no meio da sessão (expiração/revogação) — nunca a UI diretamente. */
  const notifyUnauthenticated = useCallback(() => {
    dispatchInternal({ kind: 'LOAD_UNAUTHENTICATED' })
  }, [])

  const retry = useCallback(() => requestReload(), [])

  const value: AuthContextValue = { state, login, logout, clearLoginError, retry, notifyUnauthenticated }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
