import { formatMoney, parseMoney, type CategoryBudget } from '@finanhouse/domain'
import type { CategoryBudget as CategoryBudgetRow, NewCategoryBudget } from '../../../../db/types.js'

export function toDomainCategoryBudget(row: CategoryBudgetRow): CategoryBudget {
  return {
    id: row.id,
    householdId: row.householdId,
    periodId: row.periodId,
    categoryId: row.categoryId,
    limitAmount: parseMoney(row.limitAmount),
  }
}

export function toPersistenceCategoryBudget(budget: CategoryBudget): NewCategoryBudget {
  return {
    id: budget.id,
    ...toPersistenceNewCategoryBudget(budget),
  }
}

/** Domínio → valores de inserção Drizzle, sem `id` — gerado pelo `AUTO_INCREMENT` nativo em `create()` (DT-15). */
export function toPersistenceNewCategoryBudget(budget: Omit<CategoryBudget, 'id'>): Omit<NewCategoryBudget, 'id'> {
  return {
    householdId: budget.householdId,
    periodId: budget.periodId,
    categoryId: budget.categoryId,
    limitAmount: formatMoney(budget.limitAmount),
  }
}
