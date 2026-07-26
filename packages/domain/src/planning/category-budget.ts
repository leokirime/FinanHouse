import type { Money } from '../money/money.js'

/**
 * Limite de orçamento de uma categoria de despesa em uma competência
 * específica. No máximo um por (periodId, categoryId) — ver
 * `createCategoryBudget`. A ausência de um `CategoryBudget` para uma
 * categoria/competência nunca deve ser tratada como limite zero — significa
 * "sem limite definido" (ver `category-budget-calculations.ts`).
 */
export interface CategoryBudget {
  id: number
  householdId: number
  periodId: number
  categoryId: number
  limitAmount: Money
}
