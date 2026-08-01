import {
  FINANCIAL_ENTRY_STATUSES,
  FINANCIAL_ENTRY_TYPES,
  type FinancialEntry,
  formatMoney,
  parseMoney,
} from '@finanhouse/domain'
import type { FinancialEntry as FinancialEntryRow, NewFinancialEntry } from '../../../../db/types.js'
import { assertKnownValue } from './enum-guard.js'

/** Linha do MySQL/Drizzle → entidade de domínio. Nunca expõe `responsible_member_household_id`. */
export function toDomainFinancialEntry(row: FinancialEntryRow): FinancialEntry {
  return {
    id: row.id,
    householdId: row.householdId,
    periodId: row.periodId,
    categoryId: row.categoryId,
    responsibleMemberId: row.responsibleMemberId,
    createdByUserId: row.createdByUserId,
    entryType: assertKnownValue(row.entryType, FINANCIAL_ENTRY_TYPES, 'financial_entries.entry_type'),
    status: assertKnownValue(row.status, FINANCIAL_ENTRY_STATUSES, 'financial_entries.status'),
    description: row.description,
    expectedAmount: parseMoney(row.expectedAmount),
    actualAmount: row.actualAmount === null ? null : parseMoney(row.actualAmount),
    dueDate: row.dueDate,
    realizationDate: row.realizationDate,
    notes: row.notes,
  }
}

/**
 * Entidade de domínio → valores de inserção/atualização Drizzle. Deriva
 * `responsibleMemberHouseholdId` a partir de `householdId` (DT-09) — nunca
 * aceita esse campo auxiliar como entrada pública; ele não existe no tipo de
 * domínio `FinancialEntry` e é calculado exclusivamente aqui.
 */
export function toPersistenceFinancialEntry(entry: FinancialEntry): NewFinancialEntry {
  return {
    id: entry.id,
    householdId: entry.householdId,
    periodId: entry.periodId,
    categoryId: entry.categoryId,
    responsibleMemberId: entry.responsibleMemberId,
    responsibleMemberHouseholdId: entry.responsibleMemberId === null ? null : entry.householdId,
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
