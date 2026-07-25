import { sql } from 'drizzle-orm'
import { bigint, check, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core'

export const USER_STATUSES = ['active', 'inactive'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const users = mysqlTable(
  'users',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    displayName: varchar('display_name', { length: 120 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [check('users_status_check', sql`${table.status} in ('active', 'inactive')`)],
)
