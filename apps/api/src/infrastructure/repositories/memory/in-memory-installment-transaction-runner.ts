import type { InstallmentTransactionContext, InstallmentTransactionRunner } from '../../../application/ports/installment-transaction-runner.js'
import type { InMemoryCategoryRepository } from './in-memory-category-repository.js'
import type { InMemoryFinancialEntryRepository } from './in-memory-financial-entry-repository.js'
import type { InMemoryInstallmentPlanRepository } from './in-memory-installment-plan-repository.js'
import type { InMemoryMonthlyPeriodRepository } from './in-memory-monthly-period-repository.js'

/**
 * Implementação em memória da unidade de trabalho de parcelamento (Sessão
 * 12, Bloco 04) — exclusiva para testes, nunca usada em produção. Reproduz
 * atomicidade real (não apenas nominal): tira um snapshot de
 * `installmentPlans`/`entries`/`periods` antes de `work`, e restaura esse
 * snapshot se `work` lançar — nenhuma escrita parcial sobrevive a um erro,
 * mesmo que várias parcelas já tenham sido criadas antes da falha.
 * `categories` nunca é escrito por esta operação (plano imutável não altera
 * categorias) — não precisa de snapshot/restore.
 */
export class InMemoryInstallmentTransactionRunner implements InstallmentTransactionRunner {
  constructor(
    private readonly installmentPlans: InMemoryInstallmentPlanRepository,
    private readonly entries: InMemoryFinancialEntryRepository,
    private readonly periods: InMemoryMonthlyPeriodRepository,
    private readonly categories: InMemoryCategoryRepository,
  ) {}

  async run<T>(work: (context: InstallmentTransactionContext) => Promise<T>): Promise<T> {
    const plansSnapshot = this.installmentPlans.snapshot()
    const entriesSnapshot = this.entries.snapshot()
    const periodsSnapshot = this.periods.snapshot()

    try {
      return await work({
        installmentPlans: this.installmentPlans,
        entries: this.entries,
        periods: this.periods,
        categories: this.categories,
      })
    } catch (error) {
      this.installmentPlans.restore(plansSnapshot)
      this.entries.restore(entriesSnapshot)
      this.periods.restore(periodsSnapshot)
      throw error
    }
  }
}
