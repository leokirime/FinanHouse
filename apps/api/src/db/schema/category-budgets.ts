import { sql } from 'drizzle-orm'
import { bigint, check, decimal, foreignKey, index, mysqlTable, timestamp, uniqueIndex } from 'drizzle-orm/mysql-core'
import { categories } from './categories.js'
import { households } from './households.js'
import { monthlyPeriods } from './monthly-periods.js'

export const categoryBudgets = mysqlTable(
  'category_budgets',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    householdId: bigint('household_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => households.id, { onDelete: 'restrict' }),
    // period_id e category_id não usam .references() single-column: a integridade "pertence ao
    // mesmo household" é imposta pelas foreign keys compostas abaixo (mesmo padrão de
    // financial_entries — ver DT-09/DT-13).
    periodId: bigint('period_id', { mode: 'number', unsigned: true }).notNull(),
    categoryId: bigint('category_id', { mode: 'number', unsigned: true }).notNull(),
    // Dinheiro sempre como DECIMAL — nunca FLOAT/DOUBLE (mesma estratégia monetária do projeto).
    limitAmount: decimal('limit_amount', { precision: 13, scale: 2, mode: 'string' }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    // No máximo um limite por household + competência + categoria (DT-13).
    uniqueIndex('category_budgets_household_period_category_unique').on(table.householdId, table.periodId, table.categoryId),
    index('category_budgets_period_id_idx').on(table.periodId),
    check('category_budgets_limit_amount_positive', sql`${table.limitAmount} > 0`),
    // Foreign keys compostas: garantem no próprio banco que o limite usa uma competência e uma
    // categoria do MESMO household — mesmo padrão de financial_entries_period_household_fk /
    // financial_entries_category_household_fk (DT-09). "Categoria de despesa ativa" é validado
    // apenas pela aplicação (packages/domain/src/planning/category-budget-rules.ts) — o tipo da
    // categoria não é uma propriedade que o schema desta tabela possa expressar via CHECK.
    foreignKey({
      name: 'category_budgets_period_household_fk',
      columns: [table.periodId, table.householdId],
      foreignColumns: [monthlyPeriods.id, monthlyPeriods.householdId],
    }).onDelete('restrict'),
    foreignKey({
      name: 'category_budgets_category_household_fk',
      columns: [table.categoryId, table.householdId],
      foreignColumns: [categories.id, categories.householdId],
    }).onDelete('restrict'),
  ],
)
