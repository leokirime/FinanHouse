import type { InstallmentTransactionContext, InstallmentTransactionRunner } from '../../../application/ports/installment-transaction-runner.js'
import { DrizzleCategoryRepository } from './drizzle-category-repository.js'
import { DrizzleFinancialEntryRepository } from './drizzle-financial-entry-repository.js'
import { DrizzleInstallmentPlanRepository } from './drizzle-installment-plan-repository.js'
import { DrizzleMonthlyPeriodRepository } from './drizzle-monthly-period-repository.js'
import type { DrizzleDb } from './types.js'

/**
 * Implementação real da unidade de trabalho de parcelamento (Sessão 12,
 * Bloco 04) — usa `db.transaction()` nativo do MySQL (via Drizzle), já usado
 * em produção pelos scripts de bootstrap/smoke (`db-bootstrap-household.ts`,
 * `db-smoke-*.ts`) e documentado como compatível desde `create-drizzle-repositories.ts`/
 * `types.ts` (Bloco 14): tanto a instância `MySql2Database` quanto o `tx`
 * recebido dentro de `db.transaction()` satisfazem `DrizzleDb`. Nenhuma
 * lógica de rollback própria — é inteiramente responsabilidade do MySQL:
 * qualquer exceção lançada dentro do callback aborta a transação e desfaz
 * todas as escritas feitas através de `tx`.
 *
 * Recebe a instância REAL de banco (nunca um `tx`, para não aninhar
 * transações sem necessidade) — quem monta a aplicação (`http/server.ts`)
 * decide o ciclo de vida dessa instância.
 */
export class DrizzleInstallmentTransactionRunner implements InstallmentTransactionRunner {
  constructor(private readonly db: DrizzleDb) {}

  async run<T>(work: (context: InstallmentTransactionContext) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      const context: InstallmentTransactionContext = {
        installmentPlans: new DrizzleInstallmentPlanRepository(tx),
        entries: new DrizzleFinancialEntryRepository(tx),
        periods: new DrizzleMonthlyPeriodRepository(tx),
        categories: new DrizzleCategoryRepository(tx),
      }
      return work(context)
    })
  }
}
