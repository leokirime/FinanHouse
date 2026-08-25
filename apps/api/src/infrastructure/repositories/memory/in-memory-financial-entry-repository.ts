import type { FinancialEntry } from '@finanhouse/domain'
import type { FinancialEntryRepository } from '../../../application/ports/financial-entry-repository.js'

/**
 * Implementação em memória, exclusiva para testes e desenvolvimento —
 * nunca usada em produção. Determinística e resetável entre testes via
 * `reset()`. Não usa banco de dados nem arquivos.
 *
 * `create()`/`update()` seguem o mesmo contrato da implementação Drizzle
 * (DT-15): `id` sempre gerado aqui, nunca fornecido pelo chamador
 * (equivalente ao `AUTO_INCREMENT` real); `update()` nunca cria
 * implicitamente uma entrada inexistente.
 */
export class InMemoryFinancialEntryRepository implements FinancialEntryRepository {
  private entries = new Map<number, FinancialEntry>()
  private idCounter = 1

  async findById(id: number): Promise<FinancialEntry | null> {
    return this.entries.get(id) ?? null
  }

  async findByPeriod(periodId: number): Promise<FinancialEntry[]> {
    return [...this.entries.values()].filter((entry) => entry.periodId === periodId)
  }

  async findByHousehold(householdId: number): Promise<FinancialEntry[]> {
    return [...this.entries.values()].filter((entry) => entry.householdId === householdId)
  }

  /** Sempre escopada por household — nunca consulta por plano sem essa dimensão (Sessão 12, Bloco 04). */
  async findByInstallmentPlan(householdId: number, installmentPlanId: number): Promise<FinancialEntry[]> {
    return [...this.entries.values()].filter(
      (entry) => entry.householdId === householdId && entry.installmentPlanId === installmentPlanId,
    )
  }

  async create(entry: Omit<FinancialEntry, 'id'>): Promise<FinancialEntry> {
    const id = this.idCounter
    this.idCounter += 1
    const created: FinancialEntry = { id, ...entry }
    this.entries.set(id, created)
    return created
  }

  /** Nunca cria: só atualiza uma movimentação já existente do mesmo household. */
  async update(entry: FinancialEntry): Promise<FinancialEntry> {
    const existing = this.entries.get(entry.id)
    if (!existing || existing.householdId !== entry.householdId) {
      throw new Error(`Movimentação ${entry.id} não existe ou pertence a outro household — atualização bloqueada.`)
    }
    this.entries.set(entry.id, entry)
    return entry
  }

  /** Remove permanentemente — nunca remove um registro de outro household mesmo que `id` colida. */
  async remove(id: number, householdId: number): Promise<void> {
    const entry = this.entries.get(id)
    if (entry && entry.householdId === householdId) this.entries.delete(id)
  }

  /** Popula o repositório para testes — não faz parte da interface do domínio; bypassa toda regra de negócio. */
  seed(entries: FinancialEntry[]): void {
    for (const entry of entries) this.entries.set(entry.id, entry)
  }

  /** Limpa todos os dados — usar entre testes para garantir isolamento. */
  reset(): void {
    this.entries.clear()
    this.idCounter = 1
  }

  /**
   * Estado interno para `InMemoryInstallmentTransactionRunner` (Sessão 12,
   * Bloco 04) — nunca usado fora dele. Deliberadamente NÃO inclui
   * `idCounter`: um `AUTO_INCREMENT` real do MySQL nunca é "devolvido" por um
   * `ROLLBACK" — o contador avança de forma monotônica e definitiva mesmo
   * quando o `INSERT` correspondente é desfeito (é exatamente por isso que
   * lacunas de id são normais e nunca um bug). Reverter o contador aqui
   * criaria um comportamento mais permissivo que o banco real, mascarando um
   * possível reaproveitamento de id que nunca aconteceria em produção.
   */
  snapshot(): { entries: Map<number, FinancialEntry> } {
    return { entries: new Map(this.entries) }
  }

  restore(snapshot: { entries: Map<number, FinancialEntry> }): void {
    this.entries = new Map(snapshot.entries)
  }
}
