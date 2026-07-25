import { sql } from 'drizzle-orm'
import { bigint, check, date, mysqlTable, timestamp, unique, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { households } from './households.js'
import { users } from './users.js'

export const MONTHLY_PERIOD_STATUSES = ['open', 'review', 'closed'] as const
export type MonthlyPeriodStatus = (typeof MONTHLY_PERIOD_STATUSES)[number]

export const monthlyPeriods = mysqlTable(
  'monthly_periods',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    householdId: bigint('household_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => households.id, { onDelete: 'restrict' }),
    // Representa sempre o primeiro dia do mês de competência (ex.: 2026-07-01).
    referenceMonth: date('reference_month', { mode: 'string' }).notNull(),
    status: varchar('status', { length: 10 }).notNull().default('open'),
    closedAt: timestamp('closed_at'),
    closedByUserId: bigint('closed_by_user_id', { mode: 'number', unsigned: true }).references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex('monthly_periods_household_reference_month_unique').on(table.householdId, table.referenceMonth),
    // Necessária como alvo da foreign key composta financial_entries_period_household_fk
    // (garante no banco que uma movimentação só usa período do mesmo household).
    unique('monthly_periods_id_household_id_unique').on(table.id, table.householdId),
    check('monthly_periods_status_check', sql`${table.status} in ('open', 'review', 'closed')`),
  ],
)
