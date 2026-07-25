export const MONTHLY_PERIOD_STATUSES = ['open', 'review', 'closed'] as const
export type MonthlyPeriodStatus = (typeof MONTHLY_PERIOD_STATUSES)[number]

export interface MonthlyPeriod {
  id: number
  householdId: number
  /** Sempre o primeiro dia do mês de competência, formato YYYY-MM-DD. */
  referenceMonth: string
  status: MonthlyPeriodStatus
  closedAt: string | null
  closedByUserId: number | null
}

export function isPeriodClosed(period: Pick<MonthlyPeriod, 'status'>): boolean {
  return period.status === 'closed'
}
