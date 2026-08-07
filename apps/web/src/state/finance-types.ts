import type { Category, FinancialEntry, FinancialEntryType, HouseholdMember, Money, MonthlyPeriod } from '@finanhouse/domain'
import type { ApiError } from '../api/api-errors.ts'

export interface CreateFinancialEntryFormInput {
  entryType: FinancialEntryType
  description: string
  categoryId: number
  expectedAmount: Money
  /** O formulário nunca permite criar já como "realized" — apenas planned/pending. */
  initialStatus: 'planned' | 'pending'
  dueDate: string | null
  responsibleMemberId: number | null
  notes: string | null
}

export interface UpdateFinancialEntryFormInput {
  description?: string
  categoryId?: number
  expectedAmount?: Money
  dueDate?: string | null
  responsibleMemberId?: number | null
  notes?: string | null
}

export type FinanceAction =
  | { type: 'CREATE_ENTRY'; input: CreateFinancialEntryFormInput }
  | { type: 'UPDATE_ENTRY'; id: number; changes: UpdateFinancialEntryFormInput }
  | { type: 'MARK_PENDING'; id: number }
  | { type: 'REALIZE'; id: number; actualAmount: Money; realizationDate: string }
  | { type: 'CANCEL'; id: number }
  | { type: 'DELETE_ENTRY'; id: number }
  | { type: 'REACTIVATE'; id: number }
  | { type: 'REVERT_REALIZATION'; id: number }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_MESSAGE' }
  | { type: 'RETRY' }

/** Estado enquanto a carga inicial (categorias/membros/competências/movimentações) está em curso. */
export interface FinanceLoadingState {
  status: 'loading'
}

/** Estado quando a carga inicial ou um retry falharam — nenhum dado real disponível ainda. */
export interface FinanceErrorState {
  status: 'error'
  error: ApiError
}

/**
 * Estado pronto: fonte de verdade sempre a API (nunca fixtures/`localStorage`).
 * `currentPeriodId` é garantido não-nulo aqui — a competência atual é criada
 * (via `PUT` idempotente) antes do estado se tornar "ready".
 */
export interface FinanceReadyState {
  status: 'ready'
  categories: Category[]
  members: HouseholdMember[]
  periods: MonthlyPeriod[]
  entries: FinancialEntry[]
  currentPeriodId: number
  previousPeriodId: number | null
  /** Mensagem de uma operação rejeitada pela API (erro sanitizado do servidor, ou de rede/timeout). `null` quando não há erro pendente. */
  actionError: string | null
  /** Confirmação não invasiva da última operação bem-sucedida. */
  lastActionMessage: string | null
  /** Mutação em andamento — usado para impedir duplo envio e mostrar estado de processamento. */
  pendingAction: boolean
}

export type FinanceState = FinanceLoadingState | FinanceErrorState | FinanceReadyState
