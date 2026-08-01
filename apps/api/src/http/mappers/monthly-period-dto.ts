import type { MonthlyPeriod } from '@finanhouse/domain'

export interface MonthlyPeriodDto {
  id: number
  householdId: number
  referenceMonth: string
  status: string
  closedAt: string | null
  closedByUserId: number | null
}

export function toMonthlyPeriodDto(period: MonthlyPeriod): MonthlyPeriodDto {
  return {
    id: period.id,
    householdId: period.householdId,
    referenceMonth: period.referenceMonth,
    status: period.status,
    closedAt: period.closedAt,
    closedByUserId: period.closedByUserId,
  }
}
