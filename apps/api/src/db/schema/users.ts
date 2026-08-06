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
    // Nullable até a configuração inicial (autorização separada, Bloco 19/DT-14) — nunca a senha em
    // texto puro, sempre o hash Argon2id (`@node-rs/argon2`). Sem cadastro público: só os usuários já
    // existentes recebem senha, via script protegido, nunca por uma rota HTTP de auto-registro.
    passwordHash: varchar('password_hash', { length: 255 }),
    passwordConfiguredAt: timestamp('password_configured_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [check('users_status_check', sql`${table.status} in ('active', 'inactive')`)],
)
