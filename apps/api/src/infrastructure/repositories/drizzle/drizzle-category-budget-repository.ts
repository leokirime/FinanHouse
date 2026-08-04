import type { CategoryBudget } from '@finanhouse/domain'
import { and, eq, sql } from 'drizzle-orm'
import type { CategoryBudgetRepository } from '../../../application/ports/category-budget-repository.js'
import { categoryBudgets } from '../../../db/schema/index.js'
import { toDomainCategoryBudget, toPersistenceCategoryBudget } from './mappers/category-budget-mapper.js'
import { HouseholdScopeViolationError, translatePersistenceError } from './persistence-errors.js'
import type { DrizzleDb } from './types.js'

/**
 * Adaptador Drizzle real da porta `CategoryBudgetRepository`. Recebe a
 * instância de banco (ou transaction compatível) por injeção de
 * dependência; nunca abre conexão própria. Mesmo padrão de
 * `DrizzleMonthlyPeriodRepository` (nunca upsert por unique key — ver o
 * comentário em `save()`).
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

  /**
   * Cria (INSERT simples, nunca upsert) ou atualiza um limite existente —
   * mesmo raciocínio de `DrizzleMonthlyPeriodRepository#save`: um upsert por
   * `category_budgets_household_period_category_unique` colidiria de forma
   * alheia ao `id`, mascarando um conflito legítimo de limite duplicado como
   * atualização silenciosa. Existência e household são verificados antes;
   * o UPDATE sempre usa `WHERE id = ? AND household_id = ?`.
   */
  async save(budget: CategoryBudget): Promise<CategoryBudget> {
    try {
      const values = toPersistenceCategoryBudget(budget)

      const existing = await this.db
        .select({ householdId: categoryBudgets.householdId })
        .from(categoryBudgets)
        .where(eq(categoryBudgets.id, budget.id))
        .limit(1)

      if (existing.length === 0) {
        await this.db.insert(categoryBudgets).values(values)
        return budget
      }

      if (existing[0]?.householdId !== budget.householdId) {
        throw new HouseholdScopeViolationError(
          `Limite de orçamento ${budget.id} pertence a outro household — escrita bloqueada.`,
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

  /**
   * Próximo valor de `AUTO_INCREMENT` — mesma dívida técnica documentada em
   * `drizzle-monthly-period-repository.ts#nextId`/`drizzle-financial-entry-repository.ts#nextId`
   * (DT-10): não reserva o valor atomicamente, aceitável apenas sem
   * escritores concorrentes.
   */
  async nextId(): Promise<number> {
    try {
      const [rows] = (await this.db.execute(
        sql`SELECT AUTO_INCREMENT AS nextId FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'category_budgets'`,
      )) as unknown as [Array<{ nextId: number }>, unknown]
      return Number(rows[0]?.nextId ?? 1)
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }
}
