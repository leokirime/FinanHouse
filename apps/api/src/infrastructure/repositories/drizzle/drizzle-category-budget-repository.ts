import type { CategoryBudget } from '@finanhouse/domain'
import { and, eq } from 'drizzle-orm'
import type { ResultSetHeader } from 'mysql2/promise'
import type { CategoryBudgetRepository } from '../../../application/ports/category-budget-repository.js'
import { categoryBudgets } from '../../../db/schema/index.js'
import { toDomainCategoryBudget, toPersistenceCategoryBudget, toPersistenceNewCategoryBudget } from './mappers/category-budget-mapper.js'
import { HouseholdScopeViolationError, translatePersistenceError } from './persistence-errors.js'
import type { DrizzleDb } from './types.js'

/**
 * Adaptador Drizzle real da porta `CategoryBudgetRepository`. Recebe a
 * instância de banco (ou transaction compatível) por injeção de
 * dependência; nunca abre conexão própria.
 *
 * CORRIGIDO (rodada de correção/hardening pré-Bloco 04, DT-15): a versão
 * anterior usava `nextId()` (lendo `information_schema.TABLES.AUTO_INCREMENT`)
 * + um único `save()` que fazia `INSERT` ou `UPDATE` dependendo da
 * existência prévia do `id`. `create()` agora faz um `INSERT` sem `id`,
 * deixando o `AUTO_INCREMENT` nativo do MySQL gerá-lo (`ResultSetHeader.insertId`);
 * `update()` só toca um limite já existente, nunca cria implicitamente. Um
 * `INSERT` via `create()` que colida com
 * `category_budgets_household_period_category_unique` continua falhando
 * como conflito de unicidade (`ER_DUP_ENTRY`, traduzido pelo
 * `translatePersistenceError`), exatamente como antes.
 */
export class DrizzleCategoryBudgetRepository implements CategoryBudgetRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: number): Promise<CategoryBudget | null> {
    try {
      const rows = await this.db.select().from(categoryBudgets).where(eq(categoryBudgets.id, id)).limit(1)
      return rows[0] ? toDomainCategoryBudget(rows[0]) : null
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async findByHouseholdAndPeriod(householdId: number, periodId: number): Promise<CategoryBudget[]> {
    try {
      const rows = await this.db
        .select()
        .from(categoryBudgets)
        .where(and(eq(categoryBudgets.householdId, householdId), eq(categoryBudgets.periodId, periodId)))
      return rows.map(toDomainCategoryBudget)
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async findByHouseholdPeriodAndCategory(householdId: number, periodId: number, categoryId: number): Promise<CategoryBudget | null> {
    try {
      const rows = await this.db
        .select()
        .from(categoryBudgets)
        .where(
          and(
            eq(categoryBudgets.householdId, householdId),
            eq(categoryBudgets.periodId, periodId),
            eq(categoryBudgets.categoryId, categoryId),
          ),
        )
        .limit(1)
      return rows[0] ? toDomainCategoryBudget(rows[0]) : null
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  /** Sempre insere uma linha nova — nunca fornece `id`; o valor real vem de `ResultSetHeader.insertId`, lido de volta pelo próprio banco de forma atômica. */
  async create(budget: Omit<CategoryBudget, 'id'>): Promise<CategoryBudget> {
    try {
      const values = toPersistenceNewCategoryBudget(budget)
      const [result] = (await this.db.insert(categoryBudgets).values(values)) as unknown as [ResultSetHeader, unknown]
      return { id: result.insertId, ...budget }
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  /** Nunca cria: só atualiza um limite já existente do mesmo household — `WHERE id = ? AND household_id = ?`. */
  async update(budget: CategoryBudget): Promise<CategoryBudget> {
    try {
      const values = toPersistenceCategoryBudget(budget)

      const existing = await this.db
        .select({ householdId: categoryBudgets.householdId })
        .from(categoryBudgets)
        .where(eq(categoryBudgets.id, budget.id))
        .limit(1)

      if (existing.length === 0 || existing[0]?.householdId !== budget.householdId) {
        throw new HouseholdScopeViolationError(
          `Limite de orçamento ${budget.id} não existe ou pertence a outro household — atualização bloqueada (update() nunca cria implicitamente).`,
        )
      }

      await this.db
        .update(categoryBudgets)
        .set({ limitAmount: values.limitAmount })
        .where(and(eq(categoryBudgets.id, budget.id), eq(categoryBudgets.householdId, budget.householdId)))

      return budget
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.db.delete(categoryBudgets).where(eq(categoryBudgets.id, id))
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }
}
