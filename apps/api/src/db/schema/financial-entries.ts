import { sql } from 'drizzle-orm'
import { bigint, check, date, decimal, foreignKey, index, mysqlTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'
import { categories } from './categories.js'
import { households } from './households.js'
import { householdMembers } from './household-members.js'
import { installmentPlans } from './installment-plans.js'
import { monthlyPeriods } from './monthly-periods.js'
import { users } from './users.js'

export const FINANCIAL_ENTRY_STATUSES = ['planned', 'pending', 'realized', 'cancelled'] as const
export type FinancialEntryStatus = (typeof FINANCIAL_ENTRY_STATUSES)[number]

export const financialEntries = mysqlTable(
  'financial_entries',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    householdId: bigint('household_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => households.id, { onDelete: 'restrict' }),
    // period_id e category_id não usam .references() single-column aqui: a integridade
    // "pertence ao mesmo household" é imposta pelas foreign keys compostas abaixo
    // (financial_entries_period_household_fk / financial_entries_category_household_fk),
    // que substituem e superam uma FK simples nessas duas colunas.
    periodId: bigint('period_id', { mode: 'number', unsigned: true }).notNull(),
    categoryId: bigint('category_id', { mode: 'number', unsigned: true }).notNull(),
    // responsible_member_id não usa .references() single-column: a integridade "pertence ao
    // mesmo household" é imposta pela foreign key composta abaixo
    // (financial_entries_responsible_member_household_fk), igual ao padrão já usado para
    // period_id/category_id. Não referencia household_id diretamente (NOT NULL) porque o MySQL
    // proíbe ON DELETE SET NULL em FK composta com coluna NOT NULL — por isso existe a coluna
    // auxiliar nullable responsible_member_household_id abaixo, mantida em sincronia com
    // household_id pela CHECK constraint (ver Docs/02_architecture/decisoes_tecnicas.md, DT-09).
    responsibleMemberId: bigint('responsible_member_id', { mode: 'number', unsigned: true }),
    // Espelha household_id apenas quando responsible_member_id está preenchido — detalhe de
    // persistência, não faz parte do modelo de domínio público. Preenchida/mantida pela camada
    // de persistência (repositório), nunca editada manualmente fora dela.
    responsibleMemberHouseholdId: bigint('responsible_member_household_id', { mode: 'number', unsigned: true }),
    createdByUserId: bigint('created_by_user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    entryType: varchar('entry_type', { length: 10 }).notNull(),
    status: varchar('status', { length: 10 }).notNull().default('planned'),
    description: varchar('description', { length: 255 }).notNull(),
    // Dinheiro sempre como DECIMAL — nunca FLOAT/DOUBLE (perda de precisão). Mantido como
    // string em TypeScript pelo mesmo motivo (mode padrão do Drizzle para decimal).
    expectedAmount: decimal('expected_amount', { precision: 13, scale: 2, mode: 'string' }).notNull(),
    actualAmount: decimal('actual_amount', { precision: 13, scale: 2, mode: 'string' }),
    dueDate: date('due_date', { mode: 'string' }),
    // Data em que a movimentação foi de fato realizada — recebida (receita) ou paga
    // (despesa). Nula enquanto status não é 'realized'.
    realizationDate: date('realization_date', { mode: 'string' }),
    notes: varchar('notes', { length: 500 }),
    // Nullable — a maioria dos lançamentos não é parcelada. Os dois campos sempre se movem
    // juntos (ver financial_entries_installment_coherence_check abaixo): nunca um preenchido
    // sem o outro. installment_plan_id não usa .references() single-column: a integridade
    // "pertence ao mesmo household" é imposta pela FK composta abaixo, mesmo padrão de
    // period_id/category_id (Sessão 12, Bloco 03).
    installmentPlanId: bigint('installment_plan_id', { mode: 'number', unsigned: true }),
    // Posição da parcela dentro do plano (1..installmentCount) — nunca duplicado dentro do
    // mesmo plano (ver financial_entries_installment_plan_number_unique abaixo).
    installmentNumber: bigint('installment_number', { mode: 'number', unsigned: true }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index('financial_entries_household_id_idx').on(table.householdId),
    index('financial_entries_period_id_idx').on(table.periodId),
    index('financial_entries_category_id_idx').on(table.categoryId),
    index('financial_entries_status_idx').on(table.status),
    index('financial_entries_entry_type_idx').on(table.entryType),
    index('financial_entries_due_date_idx').on(table.dueDate),
    index('financial_entries_realization_date_idx').on(table.realizationDate),
    // Colunas filhas da FK composta financial_entries_responsible_member_household_fk.
    index('financial_entries_responsible_member_household_idx').on(
      table.responsibleMemberId,
      table.responsibleMemberHouseholdId,
    ),
    check('financial_entries_entry_type_check', sql`${table.entryType} in ('income', 'expense')`),
    check(
      'financial_entries_status_check',
      sql`${table.status} in ('planned', 'pending', 'realized', 'cancelled')`,
    ),
    check('financial_entries_expected_amount_positive', sql`${table.expectedAmount} > 0`),
    check(
      'financial_entries_actual_amount_positive',
      sql`${table.actualAmount} is null or ${table.actualAmount} > 0`,
    ),
    // Garante que responsible_member_household_id só é preenchido junto com
    // responsible_member_id, e sempre igual ao household_id da própria movimentação — impede
    // associar um membro responsável de outro household (ver DT-09).
    check(
      'financial_entries_responsible_member_household_check',
      sql`(${table.responsibleMemberId} is null and ${table.responsibleMemberHouseholdId} is null) or (${table.responsibleMemberId} is not null and ${table.responsibleMemberHouseholdId} = ${table.householdId})`,
    ),
    // Foreign keys compostas: garantem no próprio banco que a movimentação usa um período
    // e uma categoria do MESMO household — não apenas um período/categoria que exista em
    // qualquer household. Exigem unique(id, household_id) nas tabelas referenciadas.
    foreignKey({
      name: 'financial_entries_period_household_fk',
      columns: [table.periodId, table.householdId],
      foreignColumns: [monthlyPeriods.id, monthlyPeriods.householdId],
    }).onDelete('restrict'),
    foreignKey({
      name: 'financial_entries_category_household_fk',
      columns: [table.categoryId, table.householdId],
      foreignColumns: [categories.id, categories.householdId],
    }).onDelete('restrict'),
    // FK composta: garante no próprio banco que o membro responsável pertence ao mesmo
    // household da movimentação. Referencia a coluna auxiliar responsible_member_household_id
    // (nullable), não household_id diretamente. RESTRICT, não SET NULL: o MySQL 8 proíbe uma
    // CHECK constraint referenciar qualquer coluna que também seja alvo de SET NULL/CASCADE em
    // FK (erro 3823, ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN) — SET NULL aqui
    // seria incompatível com a CHECK abaixo. RESTRICT bloqueia a exclusão física de um
    // household_member ainda referenciado; sem impacto prático, já que household_members usa
    // exclusão lógica (status/removed_at), nunca DELETE físico. Ver DT-09.
    foreignKey({
      name: 'financial_entries_responsible_member_household_fk',
      columns: [table.responsibleMemberId, table.responsibleMemberHouseholdId],
      foreignColumns: [householdMembers.id, householdMembers.householdId],
    }).onDelete('restrict'),
    // Garante que installment_number só é preenchido junto com installment_plan_id — nunca
    // uma parcela "órfã" com número mas sem plano, nem um plano apontado sem número
    // correspondente (Sessão 12, Bloco 03).
    check(
      'financial_entries_installment_coherence_check',
      sql`(${table.installmentPlanId} is null and ${table.installmentNumber} is null) or (${table.installmentPlanId} is not null and ${table.installmentNumber} is not null)`,
    ),
    // Impede duas parcelas com o mesmo número dentro do mesmo plano (ex.: "Sofá 3/10" duas
    // vezes). NULLs nunca colidem entre si num índice único do MySQL — lançamentos comuns
    // (ambas as colunas null) nunca são bloqueados por este índice.
    uniqueIndex('financial_entries_installment_plan_number_unique').on(table.installmentPlanId, table.installmentNumber),
    // FK composta: garante no próprio banco que uma parcela só referencia um InstallmentPlan
    // do MESMO household — mesmo padrão de period_id/category_id acima. RESTRICT (não SET
    // NULL): mesma limitação já documentada para responsible_member_household_fk — o MySQL 8
    // proíbe SET NULL numa coluna também referenciada por uma CHECK constraint (erro 3823),
    // e installment_plan_id é referenciado pela CHECK de coerência acima. RESTRICT também é
    // coerente com a decisão de produto: não existe exclusão global de um InstallmentPlan
    // nesta versão (Bloco 01) — não há necessidade de nenhuma política de propagação.
    foreignKey({
      name: 'financial_entries_installment_plan_household_fk',
      columns: [table.installmentPlanId, table.householdId],
      foreignColumns: [installmentPlans.id, installmentPlans.householdId],
    }).onDelete('restrict'),
  ],
)
