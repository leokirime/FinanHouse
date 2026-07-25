import type { MonthlyPeriod } from '@finanhouse/domain'
import type { MonthlyPeriodRepository } from '../../../application/ports/monthly-period-repository.js'

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

  async save(period: MonthlyPeriod): Promise<MonthlyPeriod> {
    this.periods.set(period.id, period)
    return period
  }

  async nextId(): Promise<number> {
    return this.idCounter++
  }

  reset(): void {
    this.periods.clear()
    this.idCounter = 1
  }
}
