import type { Category } from '../category/category.js'
import type { FinancialEntry } from '../financial-entry/financial-entry.js'
import { addMoney, type Money, subtractMoney, ZERO_MONEY } from '../money/money.js'
import type { CategoryBudget } from './category-budget.js'

export const CATEGORY_BUDGET_STATUSES = ['healthy', 'attention', 'exceeded', 'unplanned'] as const
export type CategoryBudgetStatus = (typeof CATEGORY_BUDGET_STATUSES)[number]

/** Projeção atinge este percentual (ou mais) do limite, sem excedê-lo: "attention". */
const ATTENTION_THRESHOLD_PERCENT = 80

export interface CategoryBudgetSummary {
  categoryId: number
  /** `null` quando não há limite definido para esta categoria/competência — nunca zero inventado. */
  limitAmount: Money | null
  realizedAmount: Money
  pendingAmount: Money
  plannedAmount: Money
  /** Soma de realizado + pendente + planejado — mesma definição de "projetado" usada em `calculateMonthlySummary`. */
  projectedAmount: Money
  /** `limitAmount - projectedAmount` (pode ser negativo); `null` sem limite. */
  remainingAmount: Money | null
  /** `max(projectedAmount - limitAmount, 0)`; `null` sem limite. */
  exceededAmount: Money | null
  /** `(projectedAmount / limitAmount) * 100`, arredondado a 2 casas; `null` sem limite (nunca divide por zero). */
  percentConsumed: number | null
  status: CategoryBudgetStatus
}

function nonCancelledExpenseTotalsByStatus(
  entries: FinancialEntry[],
  periodId: number,
  categoryId: number,
): { realized: Money; pending: Money; planned: Money } {
  let realized = ZERO_MONEY
  let pending = ZERO_MONEY
  let planned = ZERO_MONEY

  for (const entry of entries) {
    if (entry.periodId !== periodId) continue
    if (entry.categoryId !== categoryId) continue
    if (entry.entryType !== 'expense') continue

    if (entry.status === 'realized') {
      realized = addMoney(realized, entry.actualAmount ?? ZERO_MONEY)
    } else if (entry.status === 'pending') {
      pending = addMoney(pending, entry.expectedAmount)
    } else if (entry.status === 'planned') {
      planned = addMoney(planned, entry.expectedAmount)
    }
    // 'cancelled' nunca compõe nenhum total — omitido intencionalmente.
  }

  return { realized, pending, planned }
}

function percentOf(projected: Money, limit: Money): number | null {
  if (limit <= ZERO_MONEY) return null
  const percent = (Number(projected) / Number(limit)) * 100
  return Math.round(percent * 100) / 100
}

/** Resume o orçamento de uma única categoria em uma competência. Categoria sem limite e sem despesas não é um caso de erro — recebe `status: 'unplanned'` apenas se houver despesa; caso contrário, cabe a quem chama decidir se a omite (ver `buildCategoryBudgetSummaries`). */
export function summarizeCategoryBudget(
  categoryId: number,
  periodId: number,
  entries: FinancialEntry[],
  budgets: CategoryBudget[],
): CategoryBudgetSummary {
  const budget = budgets.find((candidate) => candidate.periodId === periodId && candidate.categoryId === categoryId) ?? null
  const { realized, pending, planned } = nonCancelledExpenseTotalsByStatus(entries, periodId, categoryId)
  const projectedAmount = addMoney(addMoney(realized, pending), planned)

  if (!budget) {
    return {
      categoryId,
      limitAmount: null,
      realizedAmount: realized,
      pendingAmount: pending,
      plannedAmount: planned,
      projectedAmount,
      remainingAmount: null,
      exceededAmount: null,
      percentConsumed: null,
      status: 'unplanned',
    }
  }

  const remainingAmount = subtractMoney(budget.limitAmount, projectedAmount)
  const exceededAmount = projectedAmount > budget.limitAmount ? subtractMoney(projectedAmount, budget.limitAmount) : ZERO_MONEY
  const percentConsumed = percentOf(projectedAmount, budget.limitAmount)

  const status: CategoryBudgetStatus =
    projectedAmount > budget.limitAmount
      ? 'exceeded'
      : percentConsumed !== null && percentConsumed >= ATTENTION_THRESHOLD_PERCENT
        ? 'attention'
        : 'healthy'

  return {
    categoryId,
    limitAmount: budget.limitAmount,
    realizedAmount: realized,
    pendingAmount: pending,
    plannedAmount: planned,
    projectedAmount,
    remainingAmount,
    exceededAmount,
    percentConsumed,
    status,
  }
}

/**
 * Resume o orçamento de todas as categorias de despesa relevantes de uma
 * competência: categorias com limite definido, OU com despesas não
 * canceladas (mesmo sem limite — vira `unplanned`). Categorias de despesa
 * sem limite e sem nenhuma despesa não aparecem no resultado — não há nada
 * de orçamento a mostrar para elas (decisão documentada em
 * `Docs/02_architecture/estado_temporario_frontend.md`).
 */
export function buildCategoryBudgetSummaries(
  periodId: number,
  entries: FinancialEntry[],
  categories: Category[],
  budgets: CategoryBudget[],
): CategoryBudgetSummary[] {
  const expenseCategories = categories.filter((category) => category.entryType === 'expense')

  return expenseCategories
    .map((category) => summarizeCategoryBudget(category.id, periodId, entries, budgets))
    .filter((summary) => summary.limitAmount !== null || summary.projectedAmount > ZERO_MONEY)
}
