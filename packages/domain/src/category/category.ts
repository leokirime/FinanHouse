export const CATEGORY_ENTRY_TYPES = ['income', 'expense'] as const
export type CategoryEntryType = (typeof CATEGORY_ENTRY_TYPES)[number]

export const CATEGORY_STATUSES = ['active', 'inactive'] as const
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number]

export interface Category {
  id: number
  householdId: number
  name: string
  entryType: CategoryEntryType
  status: CategoryStatus
}
