import { formatMoney, type FinancialEntry } from '@finanhouse/domain'

/**
 * DTO público de movimentação. Nunca inclui `responsible_member_household_id`
 * (coluna auxiliar de persistência, DT-09/DT-10) — só existe nas camadas
 * internas de banco, nunca chega até aqui porque `FinancialEntry` (o tipo de
 * domínio, que é a entrada deste mapper) já não a possui.
 */
export interface FinancialEntryDto {
  id: number
  householdId: number
  periodId: number
  categoryId: number
  responsibleMemberId: number | null
  createdByUserId: number
  entryType: string
  status: string
  description: string
  expectedAmount: string
  actualAmount: string | null
  dueDate: string | null
  realizationDate: string | null
  notes: string | null
}

export function toFinancialEntryDto(entry: FinancialEntry): FinancialEntryDto {
  return {
    id: entry.id,
    householdId: entry.householdId,
    periodId: entry.periodId,
    categoryId: entry.categoryId,
    responsibleMemberId: entry.responsibleMemberId,
    createdByUserId: entry.createdByUserId,
    entryType: entry.entryType,
    status: entry.status,
    description: entry.description,
    expectedAmount: formatMoney(entry.expectedAmount),
    actualAmount: entry.actualAmount === null ? null : formatMoney(entry.actualAmount),
    dueDate: entry.dueDate,
    realizationDate: entry.realizationDate,
    notes: entry.notes,
  }
}
