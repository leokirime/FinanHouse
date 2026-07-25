import type { Category } from '@finanhouse/domain'

export interface CategoryRepository {
  findById(id: number): Promise<Category | null>
  findByHousehold(householdId: number): Promise<Category[]>
}
