import type { InstallmentPlan } from '@finanhouse/domain'

/**
 * `id` sempre gerado pelo `AUTO_INCREMENT` nativo do MySQL, nunca calculado
 * em código (`create()` retorna a entidade já com o `id` real, lido de
 * `ResultSetHeader.insertId`) — mesmo padrão de `AuthSessionRepository`
 * (DT-15), nunca o padrão `nextId()`/`save()` ainda em uso por
 * `FinancialEntryRepository`/`MonthlyPeriodRepository`/`CategoryBudgetRepository`
 * (dívida técnica formal registrada em DT-15, não corrigida neste bloco).
 *
 * `InstallmentPlan` é imutável como contrato nesta versão (Sessão 12, Bloco
 * 01) — a porta deliberadamente não expõe nenhuma operação de atualização
 * estrutural nem de remoção. Não existe exclusão global de um plano nesta
 * primeira versão.
 */
export interface InstallmentPlanRepository {
  findById(id: number): Promise<InstallmentPlan | null>
  findByHousehold(householdId: number): Promise<InstallmentPlan[]>
  create(plan: Omit<InstallmentPlan, 'id'>): Promise<InstallmentPlan>
}
