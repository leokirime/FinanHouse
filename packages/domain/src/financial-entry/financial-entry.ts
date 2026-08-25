import type { Money } from '../money/money.js'

export const FINANCIAL_ENTRY_TYPES = ['income', 'expense'] as const
export type FinancialEntryType = (typeof FINANCIAL_ENTRY_TYPES)[number]

export const FINANCIAL_ENTRY_STATUSES = ['planned', 'pending', 'realized', 'cancelled'] as const
export type FinancialEntryStatus = (typeof FINANCIAL_ENTRY_STATUSES)[number]

/**
 * Representação de domínio de uma movimentação. `expectedAmount`/`actualAmount`
 * usam `Money` (centavos, `bigint`) — a conversão para a string decimal
 * DECIMAL(13,2) usada pela persistência (`apps/api/src/db/schema`) acontece
 * apenas na fronteira do repositório (`parseMoney`/`formatMoney`).
 */
export interface FinancialEntry {
  id: number
  householdId: number
  periodId: number
  categoryId: number
  responsibleMemberId: number | null
  createdByUserId: number
  entryType: FinancialEntryType
  status: FinancialEntryStatus
  description: string
  expectedAmount: Money
  actualAmount: Money | null
  /** Data no formato YYYY-MM-DD. */
  dueDate: string | null
  /** Data em que a movimentação foi de fato recebida (receita) ou paga (despesa), YYYY-MM-DD. */
  realizationDate: string | null
  notes: string | null
  /**
   * Vínculo com um `InstallmentPlan` (Sessão 12, Bloco 04) — sempre ambos
   * `null` (lançamento avulso) ou ambos preenchidos (parcela), nunca um sem
   * o outro. `number | null` deliberadamente, nunca opcional (`?:`): toda
   * movimentação precisa declarar explicitamente se pertence ou não a um
   * plano, nunca deixar a relação ambígua por omissão.
   */
  installmentPlanId: number | null
  /** Posição da parcela dentro do plano (1..installmentCount) — sempre `null` junto com `installmentPlanId` null. */
  installmentNumber: number | null
}

export function isRealized(entry: Pick<FinancialEntry, 'status'>): boolean {
  return entry.status === 'realized'
}
