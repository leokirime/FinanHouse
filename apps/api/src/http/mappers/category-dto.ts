import type { Category } from '@finanhouse/domain'

export interface CategoryDto {
  id: number
  householdId: number
  name: string
  entryType: string
  status: string
}

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    householdId: category.householdId,
    name: category.name,
    entryType: category.entryType,
    status: category.status,
  }
}
