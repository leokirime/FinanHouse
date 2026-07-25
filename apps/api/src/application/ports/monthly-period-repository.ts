import type { MonthlyPeriod } from '@finanhouse/domain'

export interface MonthlyPeriodRepository {
  findById(id: number): Promise<MonthlyPeriod | null>
  findByHouseholdAndReferenceMonth(householdId: number, referenceMonth: string): Promise<MonthlyPeriod | null>
  findByHousehold(householdId: number): Promise<MonthlyPeriod[]>
  save(period: MonthlyPeriod): Promise<MonthlyPeriod>
  nextId(): Promise<number>
}
