import { sql } from 'drizzle-orm'
import { bigint, check, date, decimal, foreignKey, index, mysqlTable, timestamp, unique, varchar } from 'drizzle-orm/mysql-core'
import { categories } from './categories.js'
import { households } from './households.js'
import { users } from './users.js'

/**
 * Agrupador de uma compra parcelada (Sessão 12) — nunca um segundo motor
 * financeiro: cada parcela persistida continua sendo uma linha real de
 * `financial_entries`, vinculada aqui via `installment_plan_id`/
 * `installment_number` (ver `financial-entries.ts`). Imutável como contrato
 * nesta primeira versão — nenhuma rota/serviço edita `total_amount`,
 * `installment_count`, `category_id`, `first_reference_month` ou `due_day`
 * de um plano existente (Sessão 12, Bloco 01).
 */
export const installmentPlans = mysqlTable(
  'installment_plans',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    householdId: bigint('household_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => households.id, { onDelete: 'restrict' }),
    description: varchar('description', { length: 255 }).notNull(),
    // category_id não usa .references() single-column: a integridade "pertence ao mesmo
    // household" é imposta pela foreign key composta abaixo — mesmo padrão já usado por
    // financial_entries_category_household_fk / category_budgets_category_household_fk.
    categoryId: bigint('category_id', { mode: 'number', unsigned: true }).notNull(),
    // Dinheiro sempre como DECIMAL — nunca FLOAT/DOUBLE (mesma estratégia monetária do projeto).
    totalAmount: decimal('total_amount', { precision: 13, scale: 2, mode: 'string' }).notNull(),
    installmentCount: bigint('installment_count', { mode: 'number', unsigned: true }).notNull(),
    // Sempre o primeiro dia do mês da primeira parcela — deliberadamente NÃO é FK para
    // monthly_periods: a competência da última parcela de um plano longo pode não existir
    // ainda como linha de competência no momento da criação do plano (ver Bloco 01/02,
    // `02_analysis/analise_arquitetural.md`). Cada `financial_entries` gerada, por outro
    // lado, referencia sempre um `period_id` real via FK composta já existente.
    firstReferenceMonth: date('first_reference_month', { mode: 'string' }).notNull(),
    // Obrigatório (1–31) — regra-base de vencimento do plano; resolvida por parcela para o
    // último dia válido do mês quando necessário (Bloco 02, `resolveInstallmentDueDate`).
    // Nunca nullable nesta versão — não existe parcelamento sem vencimento definido.
    dueDay: bigint('due_day', { mode: 'number', unsigned: true }).notNull(),
    // Somente autoria/auditoria — nunca filtro de visibilidade (household é a carteira
    // compartilhada, RF-09/DT-14). Nunca usado em nenhuma consulta de leitura.
    createdByUserId: bigint('created_by_user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('installment_plans_household_id_idx').on(table.householdId),
    // Necessária como alvo da foreign key composta
    // financial_entries_installment_plan_household_fk (garante no banco que uma parcela só
    // referencia um plano do mesmo household) — mesmo padrão de monthly_periods/categories.
    unique('installment_plans_id_household_id_unique').on(table.id, table.householdId),
    check('installment_plans_total_amount_positive', sql`${table.totalAmount} > 0`),
    check('installment_plans_installment_count_min', sql`${table.installmentCount} >= 2`),
    check('installment_plans_due_day_range', sql`${table.dueDay} >= 1 and ${table.dueDay} <= 31`),
    foreignKey({
      name: 'installment_plans_category_household_fk',
      columns: [table.categoryId, table.householdId],
      foreignColumns: [categories.id, categories.householdId],
    }).onDelete('restrict'),
  ],
)
