export const FINANCIAL_ENTRY_TYPES = ['income', 'expense'] as const
export type FinancialEntryType = (typeof FINANCIAL_ENTRY_TYPES)[number]

export const FINANCIAL_ENTRY_STATUSES = ['planned', 'pending', 'realized', 'cancelled'] as const
export type FinancialEntryStatus = (typeof FINANCIAL_ENTRY_STATUSES)[number]

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
  /** DECIMAL(13,2) como string — nunca number, para não perder precisão monetária. */
  expectedAmount: string
  actualAmount: string | null
  dueDate: string | null
  /** Data em que a movimentação foi de fato recebida (receita) ou paga (despesa). */
  realizationDate: string | null
  notes: string | null
}

export function isRealized(entry: Pick<FinancialEntry, 'status'>): boolean {
  return entry.status === 'realized'
}
