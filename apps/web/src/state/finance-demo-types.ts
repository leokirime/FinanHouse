import type { Category, CategoryBudget, FinancialEntry, FinancialEntryType, HouseholdMember, Money, MonthlyPeriod } from '@finanhouse/domain'

/**
 * Estado financeiro compartilhado do modo demonstrativo (Bloco 07). Vive
 * inteiramente em memória (React Context + `useReducer`) — nunca em
 * `localStorage`/`IndexedDB`/cookies. Ao recarregar a página, o app perde
 * este estado e reinicia a partir das fixtures (`data/dashboard-fixtures.ts`).
 */
export interface FinanceDemoState {
  householdId: number
  categories: Category[]
  members: HouseholdMember[]
  periods: MonthlyPeriod[]
  entries: FinancialEntry[]
  /** Limites de orçamento por categoria/competência (Bloco 09) — ausência de limite nunca é representada como zero. */
  categoryBudgets: CategoryBudget[]
  currentPeriodId: number
  previousPeriodId: number
  /** Próximo id a usar ao criar uma movimentação — nunca reaproveitado, mesmo após cancelamento. */
  nextEntryId: number
  /** Próximo id a usar ao criar um limite de orçamento — nunca reaproveitado, mesmo após remoção. */
  nextBudgetId: number
  /** Mensagem da última operação rejeitada pelo domínio (ex.: valor inválido, competência fechada). `null` quando não há erro pendente. */
  actionError: string | null
  /** Confirmação não invasiva da última operação bem-sucedida (ex.: "Movimentação adicionada à sessão demonstrativa."). Nunca afirma persistência real. */
  lastActionMessage: string | null
}

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

export interface CreateCategoryBudgetFormInput {
  categoryId: number
  limitAmount: Money
}

export interface UpdateCategoryBudgetFormInput {
  limitAmount: Money
}

export type FinanceDemoAction =
  | { type: 'CREATE_ENTRY'; input: CreateFinancialEntryFormInput }
  | { type: 'UPDATE_ENTRY'; id: number; changes: UpdateFinancialEntryFormInput }
  | { type: 'MARK_PENDING'; id: number }
  | { type: 'REALIZE'; id: number; actualAmount: Money; realizationDate: string }
  | { type: 'CANCEL'; id: number }
  | { type: 'REACTIVATE'; id: number }
  | { type: 'REVERT_REALIZATION'; id: number }
  | { type: 'CREATE_CATEGORY_BUDGET'; input: CreateCategoryBudgetFormInput }
  | { type: 'UPDATE_CATEGORY_BUDGET'; id: number; changes: UpdateCategoryBudgetFormInput }
  | { type: 'REMOVE_CATEGORY_BUDGET'; id: number }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_MESSAGE' }
  | { type: 'RESET' }
