import { formatMoney, parseMoney, type InstallmentPlan } from '@finanhouse/domain'
import type { InstallmentPlan as InstallmentPlanRow } from '../../../../db/types.js'

/**
 * `created_at` é `timestamp()` no schema (modo `Date` do Drizzle), enquanto
 * o domínio espera `string` (ISO 8601) — mesma fronteira de conversão já
 * usada por `toDomainMonthlyPeriod`/`closedAt`.
 */
export function toDomainInstallmentPlan(row: InstallmentPlanRow): InstallmentPlan {
  return {
    id: row.id,
    householdId: row.householdId,
    description: row.description,
    categoryId: row.categoryId,
    totalAmount: parseMoney(row.totalAmount),
    installmentCount: row.installmentCount,
    firstReferenceMonth: row.firstReferenceMonth,
    dueDay: row.dueDay,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
  }
}

/** Domínio → valores de inserção Drizzle (sem `id` — gerado pelo `AUTO_INCREMENT` nativo em `create()`). */
export function toPersistenceNewInstallmentPlan(plan: Omit<InstallmentPlan, 'id'>) {
  return {
    householdId: plan.householdId,
    description: plan.description,
    categoryId: plan.categoryId,
    totalAmount: formatMoney(plan.totalAmount),
    installmentCount: plan.installmentCount,
    firstReferenceMonth: plan.firstReferenceMonth,
    dueDay: plan.dueDay,
    createdByUserId: plan.createdByUserId,
    createdAt: new Date(plan.createdAt),
  }
}
