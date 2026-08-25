import type { CategoryBudget } from '@finanhouse/domain'
import type { CategoryBudgetRepository } from '../../../application/ports/category-budget-repository.js'

/**
 * `create()`/`update()` seguem o mesmo contrato da implementação Drizzle
 * (DT-15): `id` sempre gerado aqui, nunca fornecido pelo chamador;
 * `update()` nunca cria implicitamente um limite inexistente.
 */
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

  async create(budget: Omit<CategoryBudget, 'id'>): Promise<CategoryBudget> {
    const id = this.idCounter
    this.idCounter += 1
    const created: CategoryBudget = { id, ...budget }
    this.budgets.set(id, created)
    return created
  }

  /** Nunca cria: só atualiza um limite já existente do mesmo household. */
  async update(budget: CategoryBudget): Promise<CategoryBudget> {
    const existing = this.budgets.get(budget.id)
    if (!existing || existing.householdId !== budget.householdId) {
      throw new Error(`Limite de orçamento ${budget.id} não existe ou pertence a outro household — atualização bloqueada.`)
    }
    this.budgets.set(budget.id, budget)
    return budget
  }

  async remove(id: number): Promise<void> {
    this.budgets.delete(id)
  }

  /** Popula o repositório para testes — não faz parte da interface do domínio; bypassa toda regra de negócio. */
  seed(budgets: CategoryBudget[]): void {
    for (const budget of budgets) this.budgets.set(budget.id, budget)
  }

  reset(): void {
    this.budgets.clear()
    this.idCounter = 1
  }
}
