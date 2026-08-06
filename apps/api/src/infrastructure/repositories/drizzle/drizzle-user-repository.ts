import { eq } from 'drizzle-orm'
import type { AuthUserRecord, UserRepository } from '../../../application/ports/user-repository.js'
import { users } from '../../../db/schema/index.js'
import { translatePersistenceError } from './persistence-errors.js'
import type { DrizzleDb } from './types.js'

function toAuthUserRecord(row: typeof users.$inferSelect): AuthUserRecord {
  return { id: row.id, displayName: row.displayName, email: row.email, status: row.status as 'active' | 'inactive', passwordHash: row.passwordHash }
}

/**
 * Adaptador Drizzle real da porta `UserRepository` — somente leitura (sem
 * cadastro público, DT-14). `password_hash` é lido aqui porque é a única
 * camada que precisa dele (o serviço de login); nunca sai desta fronteira
 * para um DTO HTTP.
 */
export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    try {
      const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1)
      return rows[0] ? toAuthUserRecord(rows[0]) : null
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async findById(id: number): Promise<AuthUserRecord | null> {
    try {
      const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
      return rows[0] ? toAuthUserRecord(rows[0]) : null
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }
}
