import type { CategoryBudget } from '@finanhouse/domain'
import type { CategoryBudgetRepository } from '../../../application/ports/category-budget-repository.js'

export class InMemoryCategoryBudgetRepository implements CategoryBudgetRepository {
  private budgets = new Map<number, CategoryBudget>()
  private idCounter = 1

  async findById(id: number): Promise<CategoryBudget | null> {
    return this.budgets.get(id) ?? null
  }

  async findByHouseholdAndPeriod(householdId: number, periodId: number): Promise<CategoryBudget[]> {
    return [...this.budgets.values()].filter((budget) => budget.householdId === householdId && budget.periodId === periodId)
  }

  async findByHouseholdPeriodAndCategory(householdId: number, periodId: number, categoryId: number): Promise<CategoryBudget | null> {
    for (const budget of this.budgets.values()) {
      if (budget.householdId === householdId && budget.periodId === periodId && budget.categoryId === categoryId) return budget
    }
    return null
  }

  async save(budget: CategoryBudget): Promise<CategoryBudget> {
    this.budgets.set(budget.id, budget)
    return budget
  }

  async remove(id: number): Promise<void> {
    this.budgets.delete(id)
  }

  async nextId(): Promise<number> {
    return this.idCounter++
  }

  reset(): void {
    this.budgets.clear()
    this.idCounter = 1
  }
}
