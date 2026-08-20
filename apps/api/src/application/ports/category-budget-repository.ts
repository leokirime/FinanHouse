import type { CategoryBudget } from '@finanhouse/domain'

/**
 * `create()`/`update()` são deliberadamente métodos separados — mesmo padrão
 * de `AuthSessionRepository` (DT-15) e `InstallmentPlanRepository` (Sessão
 * 12, Bloco 03). Resolve a dívida técnica P2 registrada em DT-15 para este
 * repositório (rodada de correção/hardening pré-Bloco 04).
 */
export interface CategoryBudgetRepository {
  findById(id: number): Promise<CategoryBudget | null>
  findByHouseholdAndPeriod(householdId: number, periodId: number): Promise<CategoryBudget[]>
  findByHouseholdPeriodAndCategory(householdId: number, periodId: number, categoryId: number): Promise<CategoryBudget | null>
  /** Sempre insere uma linha nova — `id` gerado pelo `AUTO_INCREMENT` nativo do banco, nunca calculado em código; nunca aceita `id` do chamador. */
  create(budget: Omit<CategoryBudget, 'id'>): Promise<CategoryBudget>
  /** Só atualiza um limite já existente — nunca cria implicitamente; o household de um registro existente nunca pode ser alterado por esta operação. */
  update(budget: CategoryBudget): Promise<CategoryBudget>
  remove(id: number): Promise<void>
}
