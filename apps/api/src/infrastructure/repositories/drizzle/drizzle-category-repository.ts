import type { Category } from '@finanhouse/domain'
import { eq } from 'drizzle-orm'
import type { CategoryRepository } from '../../../application/ports/category-repository.js'
import { categories } from '../../../db/schema/index.js'
import { toDomainCategory } from './mappers/category-mapper.js'
import { translatePersistenceError } from './persistence-errors.js'
import type { DrizzleDb } from './types.js'

/**
 * Adaptador Drizzle real da porta `CategoryRepository` — somente leitura,
 * espelhando a porta (nenhum serviço de aplicação hoje cria/edita
 * categoria). Recebe a instância de banco por injeção de dependência; nunca
 * abre conexão própria.
 */
export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: number): Promise<Category | null> {
    try {
      const rows = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1)
      return rows[0] ? toDomainCategory(rows[0]) : null
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async findByHousehold(householdId: number): Promise<Category[]> {
    try {
      const rows = await this.db.select().from(categories).where(eq(categories.householdId, householdId))
      return rows.map(toDomainCategory)
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }
}
