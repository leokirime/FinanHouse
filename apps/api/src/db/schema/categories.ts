import { sql } from 'drizzle-orm'
import { bigint, check, mysqlTable, timestamp, unique, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { households } from './households.js'

export const ENTRY_TYPES = ['income', 'expense'] as const
export type EntryType = (typeof ENTRY_TYPES)[number]

export const CATEGORY_STATUSES = ['active', 'inactive'] as const
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number]

export const categories = mysqlTable(
  'categories',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    householdId: bigint('household_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => households.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 80 }).notNull(),
    entryType: varchar('entry_type', { length: 10 }).notNull(),
    // Exclusão física evitada: categorias já usadas devem virar "inactive" em vez de serem removidas.
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex('categories_household_type_name_unique').on(table.householdId, table.entryType, table.name),
    // Necessária como alvo da foreign key composta financial_entries_category_household_fk
    // (garante no banco que uma movimentação só usa categoria do mesmo household).
    unique('categories_id_household_id_unique').on(table.id, table.householdId),
    check('categories_entry_type_check', sql`${table.entryType} in ('income', 'expense')`),
    check('categories_status_check', sql`${table.status} in ('active', 'inactive')`),
  ],
)
