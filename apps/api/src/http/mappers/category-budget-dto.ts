import { formatMoney, type CategoryBudget } from '@finanhouse/domain'

export interface CategoryBudgetDto {
  id: number
  householdId: number
  periodId: number
  categoryId: number
  limitAmount: string
}

export function toCategoryBudgetDto(budget: CategoryBudget): CategoryBudgetDto {
  return {
    id: budget.id,
    householdId: budget.householdId,
    periodId: budget.periodId,
    categoryId: budget.categoryId,
    limitAmount: formatMoney(budget.limitAmount),
  }
}
