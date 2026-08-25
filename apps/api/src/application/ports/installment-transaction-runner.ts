import type { CategoryRepository } from './category-repository.js'
import type { FinancialEntryRepository } from './financial-entry-repository.js'
import type { InstallmentPlanRepository } from './installment-plan-repository.js'
import type { MonthlyPeriodRepository } from './monthly-period-repository.js'

/**
 * Repositórios expostos dentro de uma operação transacional de parcelamento
 * — todos ligados à MESMA transação/estado subjacente. `CreateInstallmentPurchaseService`
 * nunca importa `mysql2`/`drizzle-orm` diretamente; só enxerga esta interface.
 */
export interface InstallmentTransactionContext {
  installmentPlans: InstallmentPlanRepository
  entries: FinancialEntryRepository
  periods: MonthlyPeriodRepository
  categories: CategoryRepository
}

/**
 * Abstração de unidade de trabalho (Sessão 12, Bloco 04) — garante que a
 * criação de um `InstallmentPlan` + N `FinancialEntry` + eventuais
 * `MonthlyPeriod` novas seja uma única operação atômica: se qualquer escrita
 * dentro de `work` lançar, NENHUMA delas persiste (rollback total). A
 * implementação Drizzle usa `db.transaction()` (nativo do MySQL); a
 * implementação em memória reproduz o mesmo contrato via snapshot/restore
 * dos repositórios envolvidos — nunca deixa estado parcial em caso de erro.
 */
export interface InstallmentTransactionRunner {
  run<T>(work: (context: InstallmentTransactionContext) => Promise<T>): Promise<T>
}
