import { bigint, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core'
import { users } from './users.js'

export const households = mysqlTable('households', {
  id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  // Default conceitual do domínio: BRL / America/Sao_Paulo. Nenhum dado é inserido neste bloco.
  currencyCode: varchar('currency_code', { length: 3 }).notNull().default('BRL'),
  timezone: varchar('timezone', { length: 64 }).notNull().default('America/Sao_Paulo'),
  createdByUserId: bigint('created_by_user_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
})
