import type { FinancialEntry } from '@finanhouse/domain'

/**
 * Porta (interface) de acesso a movimentações financeiras. Implementações
 * reais (ex.: Drizzle/MySQL) e em memória (`infrastructure/repositories/memory`)
 * vivem fora da camada de domínio — nada aqui importa `mysql2`/`drizzle-orm`.
 *
 * `create()`/`update()` são deliberadamente métodos separados (não um único
 * `save()` ambíguo que decide entre INSERT/UPDATE a partir de um `id`
 * calculado em código) — mesmo padrão de `AuthSessionRepository` (DT-15) e
 * `InstallmentPlanRepository` (Sessão 12, Bloco 03). Resolve a dívida
 * técnica P2 registrada em DT-15 para este repositório (rodada de
 * correção/hardening pré-Bloco 04).
 */
export interface FinancialEntryRepository {
  findById(id: number): Promise<FinancialEntry | null>
  findByPeriod(periodId: number): Promise<FinancialEntry[]>
  findByHousehold(householdId: number): Promise<FinancialEntry[]>
  /** Sempre insere uma linha nova — `id` gerado pelo `AUTO_INCREMENT` nativo do banco, nunca calculado em código; nunca aceita `id` do chamador. */
  create(entry: Omit<FinancialEntry, 'id'>): Promise<FinancialEntry>
  /** Só atualiza uma movimentação já existente — nunca cria implicitamente; o household de um registro existente nunca pode ser alterado por esta operação. */
  update(entry: FinancialEntry): Promise<FinancialEntry>
  /** Remove permanentemente — nunca soft delete. `householdId` sempre no filtro: nunca remove um registro de outro household, mesmo que `id` colida. */
  remove(id: number, householdId: number): Promise<void>
}
