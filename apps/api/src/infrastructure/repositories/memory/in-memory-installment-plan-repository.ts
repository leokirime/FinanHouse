import type { InstallmentPlan } from '@finanhouse/domain'
import type { InstallmentPlanRepository } from '../../../application/ports/installment-plan-repository.js'

/**
 * Implementação em memória, exclusiva para testes e desenvolvimento — nunca
 * usada em produção. Mesmo contrato `create()` da implementação Drizzle:
 * `id` sempre gerado aqui, nunca fornecido pelo chamador (equivalente ao
 * `AUTO_INCREMENT` real) — nenhum `nextId()`/`save()`.
 */
export class InMemoryInstallmentPlanRepository implements InstallmentPlanRepository {
  private plans = new Map<number, InstallmentPlan>()
  private nextIdCounter = 1

  async findById(id: number): Promise<InstallmentPlan | null> {
    return this.plans.get(id) ?? null
  }

  async findByHousehold(householdId: number): Promise<InstallmentPlan[]> {
    return [...this.plans.values()].filter((plan) => plan.householdId === householdId)
  }

  async create(plan: Omit<InstallmentPlan, 'id'>): Promise<InstallmentPlan> {
    const id = this.nextIdCounter
    this.nextIdCounter += 1
    const created: InstallmentPlan = { id, ...plan }
    this.plans.set(id, created)
    return created
  }

  /** Limpa todos os dados — usar entre testes para garantir isolamento. */
  reset(): void {
    this.plans.clear()
    this.nextIdCounter = 1
  }

  /**
   * Estado interno para `InMemoryInstallmentTransactionRunner` (Sessão 12,
   * Bloco 04) — nunca usado fora dele. Deliberadamente NÃO inclui
   * `nextIdCounter` — ver o comentário equivalente em
   * `InMemoryFinancialEntryRepository#snapshot` (mesmo raciocínio de
   * `AUTO_INCREMENT` real nunca ser revertido por `ROLLBACK`).
   */
  snapshot(): { plans: Map<number, InstallmentPlan> } {
    return { plans: new Map(this.plans) }
  }

  restore(snapshot: { plans: Map<number, InstallmentPlan> }): void {
    this.plans = new Map(snapshot.plans)
  }
}
