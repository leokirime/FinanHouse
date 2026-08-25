import type { MonthlyPeriod } from '@finanhouse/domain'
import type { MonthlyPeriodRepository } from '../../../application/ports/monthly-period-repository.js'

/**
 * `create()`/`update()` seguem o mesmo contrato da implementação Drizzle
 * (DT-15): `id` sempre gerado aqui, nunca fornecido pelo chamador;
 * `update()` nunca cria implicitamente uma competência inexistente.
 */
export class InMemoryMonthlyPeriodRepository implements MonthlyPeriodRepository {
  private periods = new Map<number, MonthlyPeriod>()
  private idCounter = 1

  async findById(id: number): Promise<MonthlyPeriod | null> {
    return this.periods.get(id) ?? null
  }

  async findByHouseholdAndReferenceMonth(householdId: number, referenceMonth: string): Promise<MonthlyPeriod | null> {
    for (const period of this.periods.values()) {
      if (period.householdId === householdId && period.referenceMonth === referenceMonth) return period
    }
    return null
  }

  async findByHousehold(householdId: number): Promise<MonthlyPeriod[]> {
    return [...this.periods.values()].filter((period) => period.householdId === householdId)
  }

  async create(period: Omit<MonthlyPeriod, 'id'>): Promise<MonthlyPeriod> {
    const id = this.idCounter
    this.idCounter += 1
    const created: MonthlyPeriod = { id, ...period }
    this.periods.set(id, created)
    return created
  }

  /** Nunca cria: só atualiza uma competência já existente do mesmo household. */
  async update(period: MonthlyPeriod): Promise<MonthlyPeriod> {
    const existing = this.periods.get(period.id)
    if (!existing || existing.householdId !== period.householdId) {
      throw new Error(`Competência ${period.id} não existe ou pertence a outro household — atualização bloqueada.`)
    }
    this.periods.set(period.id, period)
    return period
  }

  /** Popula o repositório para testes — não faz parte da interface do domínio; bypassa toda regra de negócio. */
  seed(periods: MonthlyPeriod[]): void {
    for (const period of periods) this.periods.set(period.id, period)
  }

  reset(): void {
    this.periods.clear()
    this.idCounter = 1
  }

  /**
   * Estado interno para `InMemoryInstallmentTransactionRunner` (Sessão 12,
   * Bloco 04) — nunca usado fora dele. Deliberadamente NÃO inclui
   * `idCounter` — ver o comentário equivalente em
   * `InMemoryFinancialEntryRepository#snapshot` (mesmo raciocínio de
   * `AUTO_INCREMENT` real nunca ser revertido por `ROLLBACK`).
   */
  snapshot(): { periods: Map<number, MonthlyPeriod> } {
    return { periods: new Map(this.periods) }
  }

  restore(snapshot: { periods: Map<number, MonthlyPeriod> }): void {
    this.periods = new Map(snapshot.periods)
  }
}
