import {
  type Category,
  CategoryBudgetNotFoundError,
  CategoryNotFoundError,
  createCategoryBudget,
  type Money,
  type MonthlyPeriod,
  PeriodNotFoundError,
  updateCategoryBudget,
  assertCategoryBudgetRemovable,
} from '@finanhouse/domain'
import type { CategoryRepository } from '../ports/category-repository.js'
import type { CategoryBudgetRepository } from '../ports/category-budget-repository.js'
import type { MonthlyPeriodRepository } from '../ports/monthly-period-repository.js'

export interface CategoryBudgetServiceDependencies {
  budgets: CategoryBudgetRepository
  periods: MonthlyPeriodRepository
  categories: CategoryRepository
}

async function loadPeriod(deps: CategoryBudgetServiceDependencies, periodId: number): Promise<MonthlyPeriod> {
  const period = await deps.periods.findById(periodId)
  if (!period) throw new PeriodNotFoundError(`Competência ${periodId} não encontrada.`)
  return period
}

async function loadCategory(deps: CategoryBudgetServiceDependencies, categoryId: number): Promise<Category> {
  const category = await deps.categories.findById(categoryId)
  if (!category) throw new CategoryNotFoundError(`Categoria ${categoryId} não encontrada.`)
  return category
}

export class ListCategoryBudgetsService {
  constructor(private readonly deps: CategoryBudgetServiceDependencies) {}

  async execute(householdId: number, periodId: number) {
    return this.deps.budgets.findByHouseholdAndPeriod(householdId, periodId)
  }
}

export interface PutCategoryBudgetInput {
  householdId: number
  periodId: number
  categoryId: number
  limitAmount: Money
}

export interface PutCategoryBudgetResult {
  budget: Awaited<ReturnType<CategoryBudgetRepository['save']>>
  created: boolean
}

/** Cria (se ainda não existe) ou atualiza (se já existe) o limite — idempotente por (household, período, categoria), espelhando o `PUT` de competência (Bloco 16). */
export class PutCategoryBudgetService {
  constructor(private readonly deps: CategoryBudgetServiceDependencies) {}

  async execute(input: PutCategoryBudgetInput): Promise<PutCategoryBudgetResult> {
    const period = await loadPeriod(this.deps, input.periodId)
    const category = await loadCategory(this.deps, input.categoryId)

    const existing = await this.deps.budgets.findByHouseholdPeriodAndCategory(input.householdId, input.periodId, input.categoryId)

    if (existing) {
      const updated = updateCategoryBudget(existing, { limitAmount: input.limitAmount }, period)
      const saved = await this.deps.budgets.save(updated)
      return { budget: saved, created: false }
    }

    const id = await this.deps.budgets.nextId()
    const created = createCategoryBudget(
      { id, householdId: input.householdId, periodId: input.periodId, categoryId: input.categoryId, limitAmount: input.limitAmount },
      { period, category },
      [],
    )
    const saved = await this.deps.budgets.save(created)
    return { budget: saved, created: true }
  }
}

export interface DeleteCategoryBudgetInput {
  householdId: number
  periodId: number
  categoryId: number
}

export class DeleteCategoryBudgetService {
  constructor(private readonly deps: CategoryBudgetServiceDependencies) {}

  async execute(input: DeleteCategoryBudgetInput): Promise<void> {
    const period = await loadPeriod(this.deps, input.periodId)
    const existing = await this.deps.budgets.findByHouseholdPeriodAndCategory(input.householdId, input.periodId, input.categoryId)
    if (!existing) {
      throw new CategoryBudgetNotFoundError(`Limite de orçamento não encontrado para a categoria ${input.categoryId} nesta competência.`)
    }
    assertCategoryBudgetRemovable(period)
    await this.deps.budgets.remove(existing.id)
  }
}
