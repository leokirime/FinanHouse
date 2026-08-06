import { bigint, index, mysqlTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { households } from './households.js'
import { users } from './users.js'

/**
 * Sessão de login real (Bloco 19, DT-14). Nunca guarda o token bruto — só o
 * hash SHA-256 dele (`token_hash`, único). Vínculo do usuário com o household
 * (e se está `active`) é validado na aplicação no momento do login, não por
 * FK — mesmo raciocínio de `category_budgets` (DT-13): status é regra de
 * aplicação, não de schema.
 */
export const authSessions = mysqlTable(
  'auth_sessions',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    householdId: bigint('household_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => households.id, { onDelete: 'restrict' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at'),
  },
  (table) => [
    index('auth_sessions_user_id_idx').on(table.userId),
    index('auth_sessions_expires_at_idx').on(table.expiresAt),
    uniqueIndex('auth_sessions_token_hash_unique').on(table.tokenHash),
  ],
)
