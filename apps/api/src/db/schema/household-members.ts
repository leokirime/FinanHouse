import { sql } from 'drizzle-orm'
import { bigint, check, mysqlTable, timestamp, unique, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { households } from './households.js'
import { users } from './users.js'

export const HOUSEHOLD_MEMBER_ROLES = ['owner', 'member'] as const
export type HouseholdMemberRole = (typeof HOUSEHOLD_MEMBER_ROLES)[number]

export const HOUSEHOLD_MEMBER_STATUSES = ['active', 'inactive'] as const
export type HouseholdMemberStatus = (typeof HOUSEHOLD_MEMBER_STATUSES)[number]

export const householdMembers = mysqlTable(
  'household_members',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    // Tabela puramente associativa: CASCADE é aceitável aqui (ver Docs/03_contracts/contrato_banco_dados.md).
    householdId: bigint('household_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    removedAt: timestamp('removed_at'),
  },
  (table) => [
    uniqueIndex('household_members_household_user_unique').on(table.householdId, table.userId),
    // Necessária como alvo da foreign key composta financial_entries_responsible_member_household_fk
    // (garante no banco que o membro responsável de uma movimentação pertence ao mesmo household).
    unique('household_members_id_household_id_unique').on(table.id, table.householdId),
    check('household_members_role_check', sql`${table.role} in ('owner', 'member')`),
    check('household_members_status_check', sql`${table.status} in ('active', 'inactive')`),
  ],
)
