import type { Category } from '../category/category.js'
import {
  CategoryEntryTypeMismatchError,
  DuplicateCategoryBudgetError,
  HouseholdMismatchError,
  InactiveCategoryError,
} from '../errors/domain-errors.js'
import { assertPeriodAllowsEntryChanges } from '../financial-entry/financial-entry-rules.js'
import { assertPositiveMoney, type Money } from '../money/money.js'
import type { MonthlyPeriod } from '../monthly-period/monthly-period.js'
import type { CategoryBudget } from './category-budget.js'

/**
 * Contexto de entidades relacionadas necessário para criar um limite de
 * orçamento — quem chama a regra é responsável por buscá-las no estado antes.
 */
export interface CategoryBudgetContext {
  period: MonthlyPeriod
  category: Category
}

function assertHouseholdConsistency(householdId: number, context: CategoryBudgetContext): void {
  if (context.period.householdId !== householdId) {
    throw new HouseholdMismatchError('O período informado não pertence ao mesmo household do limite de orçamento.')
  }
  if (context.category.householdId !== householdId) {
    throw new HouseholdMismatchError('A categoria informada não pertence ao mesmo household do limite de orçamento.')
  }
}

function assertBudgetCategoryUsable(category: Category): void {
  if (category.status !== 'active') {
    throw new InactiveCategoryError(`Categoria "${category.name}" está inativa e não pode receber um limite de orçamento.`)
  }
  if (category.entryType !== 'expense') {
    throw new CategoryEntryTypeMismatchError(
      `Categoria "${category.name}" é do tipo "${category.entryType}" — limites de orçamento só podem ser definidos para categorias de despesa.`,
    )
  }
}

/**
 * Uma competência mensal permite criar/editar/remover limites de orçamento
 * enquanto estiver "open" ou "review" — diferente das movimentações comuns
 * (que bloqueiam "review" por padrão), definir/ajustar um planejamento é
 * considerado um ajuste de revisão explícito. "closed" sempre bloqueia.
 */
export function assertPeriodAllowsBudgetChanges(period: MonthlyPeriod): void {
  assertPeriodAllowsEntryChanges(period, { allowReviewAdjustment: true })
}

export interface CreateCategoryBudgetInput {
  id: number
  householdId: number
  periodId: number
  categoryId: number
  limitAmount: Money
}

/** Cria um novo limite de orçamento. No máximo um por categoria/competência — ver `existingBudgets`. */
export function createCategoryBudget(
  input: CreateCategoryBudgetInput,
  context: CategoryBudgetContext,
  existingBudgets: CategoryBudget[],
): CategoryBudget {
  assertPeriodAllowsBudgetChanges(context.period)
  assertHouseholdConsistency(input.householdId, context)
  assertBudgetCategoryUsable(context.category)
  assertPositiveMoney(input.limitAmount, 'limit_amount')

  const duplicate = existingBudgets.some(
    (budget) => budget.periodId === input.periodId && budget.categoryId === input.categoryId,
  )
  if (duplicate) {
    throw new DuplicateCategoryBudgetError(
      `Já existe um limite de orçamento para a categoria "${context.category.name}" nesta competência.`,
    )
  }

  return {
    id: input.id,
    householdId: input.householdId,
    periodId: input.periodId,
    categoryId: input.categoryId,
    limitAmount: input.limitAmount,
  }
}

export interface UpdateCategoryBudgetChanges {
  limitAmount: Money
}

/** Atualiza apenas `limitAmount` — categoria/competência de um limite existente não são alteráveis (crie um novo, se necessário). */
export function updateCategoryBudget(
  budget: CategoryBudget,
  changes: UpdateCategoryBudgetChanges,
  period: MonthlyPeriod,
): CategoryBudget {
  assertPeriodAllowsBudgetChanges(period)
  assertPositiveMoney(changes.limitAmount, 'limit_amount')
  return { ...budget, limitAmount: changes.limitAmount }
}

/** Valida que a remoção é permitida (competência não fechada) — quem chama remove o limite do próprio estado. */
export function assertCategoryBudgetRemovable(period: MonthlyPeriod): void {
  assertPeriodAllowsBudgetChanges(period)
}
