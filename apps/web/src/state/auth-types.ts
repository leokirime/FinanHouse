import type { ApiError } from '../api/api-errors.ts'
import type { AuthUser } from '../api/auth-api.ts'

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser; householdId: number; pendingLogout: boolean }
  | { status: 'unauthenticated'; pendingLogin: boolean; loginError: string | null }
  | { status: 'error'; error: ApiError }
