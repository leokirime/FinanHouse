import { MONTHLY_PERIOD_STATUSES, type MonthlyPeriod } from '@finanhouse/domain'
import type { MonthlyPeriod as MonthlyPeriodRow, NewMonthlyPeriod } from '../../../../db/types.js'
import { assertKnownValue } from './enum-guard.js'

/**
 * `closed_at` é `timestamp()` no schema (modo `Date` do Drizzle), enquanto o
 * domínio espera `string` (ISO 8601) — a conversão acontece só nesta
 * fronteira, nos dois sentidos.
 */
export function toDomainMonthlyPeriod(row: MonthlyPeriodRow): MonthlyPeriod {
  return {
    id: row.id,
    householdId: row.householdId,
    referenceMonth: row.referenceMonth,
    status: assertKnownValue(row.status, MONTHLY_PERIOD_STATUSES, 'monthly_periods.status'),
    closedAt: row.closedAt === null ? null : row.closedAt.toISOString(),
    closedByUserId: row.closedByUserId,
  }
}

export function toPersistenceMonthlyPeriod(period: MonthlyPeriod): NewMonthlyPeriod {
  return {
    id: period.id,
    ...toPersistenceNewMonthlyPeriod(period),
  }
}

/** Domínio → valores de inserção Drizzle, sem `id` — gerado pelo `AUTO_INCREMENT` nativo em `create()` (DT-15). */
export function toPersistenceNewMonthlyPeriod(period: Omit<MonthlyPeriod, 'id'>): Omit<NewMonthlyPeriod, 'id'> {
  return {
    householdId: period.householdId,
    referenceMonth: period.referenceMonth,
    status: period.status,
    closedAt: period.closedAt === null ? null : new Date(period.closedAt),
    closedByUserId: period.closedByUserId,
  }
}
