import type { FinancialEntry } from '@finanhouse/domain'
import type { FinancialEntryRepository } from '../../../application/ports/financial-entry-repository.js'

/**
 * Implementação em memória, exclusiva para testes e desenvolvimento —
 * nunca usada em produção. Determinística e resetável entre testes via
 * `reset()`. Não usa banco de dados nem arquivos.
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

  async save(entry: FinancialEntry): Promise<FinancialEntry> {
    this.entries.set(entry.id, entry)
    return entry
  }

  async nextId(): Promise<number> {
    return this.idCounter++
  }

  /** Remove permanentemente — nunca remove um registro de outro household mesmo que `id` colida. */
  async remove(id: number, householdId: number): Promise<void> {
    const entry = this.entries.get(id)
    if (entry && entry.householdId === householdId) this.entries.delete(id)
  }

  /** Limpa todos os dados — usar entre testes para garantir isolamento. */
  reset(): void {
    this.entries.clear()
    this.idCounter = 1
  }
}
