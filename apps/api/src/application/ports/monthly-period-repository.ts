import type { MonthlyPeriod } from '@finanhouse/domain'

/**
 * `create()`/`update()` são deliberadamente métodos separados — mesmo padrão
 * de `AuthSessionRepository` (DT-15) e `InstallmentPlanRepository` (Sessão
 * 12, Bloco 03). Resolve a dívida técnica P2 registrada em DT-15 para este
 * repositório (rodada de correção/hardening pré-Bloco 04).
 */
export interface MonthlyPeriodRepository {
  findById(id: number): Promise<MonthlyPeriod | null>
  findByHouseholdAndReferenceMonth(householdId: number, referenceMonth: string): Promise<MonthlyPeriod | null>
  findByHousehold(householdId: number): Promise<MonthlyPeriod[]>
  /** Sempre insere uma linha nova — `id` gerado pelo `AUTO_INCREMENT` nativo do banco, nunca calculado em código; nunca aceita `id` do chamador. */
  create(period: Omit<MonthlyPeriod, 'id'>): Promise<MonthlyPeriod>
  /** Só atualiza uma competência já existente — nunca cria implicitamente; o household de um registro existente nunca pode ser alterado por esta operação. */
  update(period: MonthlyPeriod): Promise<MonthlyPeriod>
}
