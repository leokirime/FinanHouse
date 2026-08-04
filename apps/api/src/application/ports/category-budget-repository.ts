import type { CategoryBudget } from '@finanhouse/domain'

export interface CategoryBudgetRepository {
  findById(id: number): Promise<CategoryBudget | null>
  findByHouseholdAndPeriod(householdId: number, periodId: number): Promise<CategoryBudget[]>
  findByHouseholdPeriodAndCategory(householdId: number, periodId: number, categoryId: number): Promise<CategoryBudget | null>
  save(budget: CategoryBudget): Promise<CategoryBudget>
  remove(id: number): Promise<void>
  nextId(): Promise<number>
}
