import { apiRequest } from './api-client.ts'
import type { ApiBaseConfig } from './api-config.ts'

export interface AuthUser {
  id: number
  displayName: string
  email: string
}

export interface AuthSession {
  user: AuthUser
  householdId: number
}

/**
 * Cliente HTTP de autenticação (Bloco 19, DT-14) — nunca lida com token
 * bruto (fica exclusivamente no cookie `HttpOnly`, gerido pelo navegador) e
 * nunca com senha em texto puro fora do momento do próprio `login()`.
 */
export async function login(config: ApiBaseConfig, email: string, password: string, signal?: AbortSignal): Promise<AuthSession> {
  return apiRequest<AuthSession>(config, '/api/v1/auth/login', { method: 'POST', body: { email, password }, signal })
}

export async function getSession(config: ApiBaseConfig, signal?: AbortSignal): Promise<AuthSession> {
  return apiRequest<AuthSession>(config, '/api/v1/auth/session', { signal })
}

export async function logout(config: ApiBaseConfig, signal?: AbortSignal): Promise<void> {
  await apiRequest<void>(config, '/api/v1/auth/logout', { method: 'POST', signal })
}
