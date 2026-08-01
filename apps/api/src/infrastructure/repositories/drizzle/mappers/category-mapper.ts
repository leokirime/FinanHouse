import { CATEGORY_ENTRY_TYPES, CATEGORY_STATUSES, type Category } from '@finanhouse/domain'
import type { Category as CategoryRow } from '../../../../db/types.js'
import { assertKnownValue } from './enum-guard.js'

/** Somente leitura: a porta `CategoryRepository` não define `save`/`nextId` (ver `application/ports/category-repository.ts`). */
export function toDomainCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    householdId: row.householdId,
    name: row.name,
    entryType: assertKnownValue(row.entryType, CATEGORY_ENTRY_TYPES, 'categories.entry_type'),
    status: assertKnownValue(row.status, CATEGORY_STATUSES, 'categories.status'),
  }
}
