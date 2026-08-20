import { getTableConfig } from 'drizzle-orm/mysql-core'
import { describe, expect, it } from 'vitest'
import {
  categories,
  FINANCIAL_ENTRY_STATUSES,
  financialEntries,
  householdMembers,
  households,
  installmentPlans,
  monthlyPeriods,
  users,
} from './index.js'

const ALL_TABLES = { categories, financialEntries, householdMembers, households, monthlyPeriods, users }

describe('schema proposto — fundação', () => {
  it('define exatamente seis tabelas', () => {
    expect(Object.keys(ALL_TABLES)).toHaveLength(6)
  })

  it('usa os nomes de tabela esperados em snake_case', () => {
    const names = Object.values(ALL_TABLES).map((table) => getTableConfig(table).name)
    expect(names.sort()).toEqual(
      ['categories', 'financial_entries', 'household_members', 'households', 'monthly_periods', 'users'].sort(),
    )
  })

  it('nenhuma tabela usa FLOAT ou DOUBLE para nenhuma coluna', () => {
    for (const table of Object.values(ALL_TABLES)) {
      const { columns, name } = getTableConfig(table)
      for (const column of columns) {
        expect(column.columnType, `${name}.${column.name}`).not.toMatch(/Float|Double/i)
      }
    }
  })

  it('financial_entries usa DECIMAL(13,2) para valores monetários', () => {
    const { columns } = getTableConfig(financialEntries)
    const expectedAmount = columns.find((c) => c.name === 'expected_amount')
    const actualAmount = columns.find((c) => c.name === 'actual_amount')
    expect(expectedAmount?.getSQLType()).toBe('decimal(13,2)')
    expect(actualAmount?.getSQLType()).toBe('decimal(13,2)')
  })

  function uniqueIndexColumnSets(table: Parameters<typeof getTableConfig>[0]): string[] {
    return getTableConfig(table)
      .indexes.filter((index) => index.config.unique)
      .map((index) =>
        index.config.columns
          .map((column) => ('name' in column ? column.name : ''))
          .sort()
          .join(','),
      )
  }

  function uniqueConstraintColumnSets(table: Parameters<typeof getTableConfig>[0]): string[] {
    return getTableConfig(table).uniqueConstraints.map((constraint) =>
      constraint.columns
        .map((column) => column.name)
        .sort()
        .join(','),
    )
  }

  it('users.email é único', () => {
    const { columns } = getTableConfig(users)
    const emailColumn = columns.find((c) => c.name === 'email')
    expect(emailColumn?.isUnique).toBe(true)
  })

  it('household_members tem índice único composto household_id + user_id', () => {
    expect(uniqueIndexColumnSets(householdMembers)).toContain('household_id,user_id')
  })

  it('monthly_periods tem índice único composto household_id + reference_month', () => {
    expect(uniqueIndexColumnSets(monthlyPeriods)).toContain('household_id,reference_month')
  })

  it('categories tem índice único composto household_id + entry_type + name', () => {
    expect(uniqueIndexColumnSets(categories)).toContain('entry_type,household_id,name')
  })

  it('categories e monthly_periods têm unique(id, household_id) para servir de alvo de FK composta', () => {
    expect(uniqueConstraintColumnSets(categories)).toContain('household_id,id')
    expect(uniqueConstraintColumnSets(monthlyPeriods)).toContain('household_id,id')
  })

  it('cada tabela relevante declara CHECK constraints para seus campos de status/entry_type', () => {
    expect(getTableConfig(users).checks.length).toBeGreaterThan(0)
    expect(getTableConfig(households).checks.length).toBe(0) // households não tem status/entry_type
    expect(getTableConfig(householdMembers).checks.length).toBeGreaterThanOrEqual(2)
    expect(getTableConfig(categories).checks.length).toBeGreaterThanOrEqual(2)
    expect(getTableConfig(monthlyPeriods).checks.length).toBeGreaterThanOrEqual(1)
    expect(getTableConfig(financialEntries).checks.length).toBeGreaterThanOrEqual(4)
  })

  it('financial_entries.household_id e created_by_user_id têm foreign keys simples com RESTRICT', () => {
    const { foreignKeys } = getTableConfig(financialEntries)
    for (const columnName of ['household_id', 'created_by_user_id']) {
      const fk = foreignKeys.find((f) => f.reference().columns.some((c) => c.name === columnName))
      expect(fk?.onDelete, columnName).toBe('restrict')
    }
  })

  it('household_members usa CASCADE (tabela puramente associativa)', () => {
    const { foreignKeys } = getTableConfig(householdMembers)
    for (const fk of foreignKeys) {
      expect(fk.onDelete).toBe('cascade')
    }
  })

  it('financial_entries.period_id e category_id são protegidos por foreign keys COMPOSTAS (period_id/category_id + household_id), com RESTRICT', () => {
    const { foreignKeys } = getTableConfig(financialEntries)

    const periodFk = foreignKeys.find((f) => f.reference().columns.some((c) => c.name === 'period_id'))
    expect(periodFk?.reference().columns.map((c) => c.name).sort()).toEqual(['household_id', 'period_id'])
    expect(periodFk?.reference().foreignColumns.map((c) => c.name).sort()).toEqual(['household_id', 'id'])
    expect(periodFk?.reference().foreignTable).toBe(monthlyPeriods)
    expect(periodFk?.onDelete).toBe('restrict')

    const categoryFk = foreignKeys.find((f) => f.reference().columns.some((c) => c.name === 'category_id'))
    expect(categoryFk?.reference().columns.map((c) => c.name).sort()).toEqual(['category_id', 'household_id'])
    expect(categoryFk?.reference().foreignColumns.map((c) => c.name).sort()).toEqual(['household_id', 'id'])
    expect(categoryFk?.reference().foreignTable).toBe(categories)
    expect(categoryFk?.onDelete).toBe('restrict')
  })

  it('financial_entries.responsible_member_id é protegido por FK COMPOSTA (responsible_member_id/responsible_member_household_id + household_members), com RESTRICT (DT-09)', () => {
    const { foreignKeys } = getTableConfig(financialEntries)
    const memberFk = foreignKeys.find((f) => f.reference().columns.some((c) => c.name === 'responsible_member_id'))
    expect(memberFk?.reference().columns.map((c) => c.name).sort()).toEqual([
      'responsible_member_household_id',
      'responsible_member_id',
    ])
    expect(memberFk?.reference().foreignColumns.map((c) => c.name).sort()).toEqual(['household_id', 'id'])
    expect(memberFk?.reference().foreignTable).toBe(householdMembers)
    // RESTRICT, não SET NULL: o MySQL 8 proíbe uma CHECK constraint referenciar coluna que
    // também é alvo de SET NULL/CASCADE em FK (erro 3823) — ver DT-09.
    expect(memberFk?.onDelete).toBe('restrict')
  })

  it('financial_entries.responsible_member_id e responsible_member_household_id são nullable (a movimentação pode não ter responsável definido)', () => {
    const { columns } = getTableConfig(financialEntries)
    const responsibleMemberId = columns.find((c) => c.name === 'responsible_member_id')
    const responsibleMemberHouseholdId = columns.find((c) => c.name === 'responsible_member_household_id')
    expect(responsibleMemberId?.notNull).toBe(false)
    expect(responsibleMemberHouseholdId?.notNull).toBe(false)
  })

  it('household_members tem unique(id, household_id) para servir de alvo da FK composta do membro responsável', () => {
    expect(uniqueConstraintColumnSets(householdMembers)).toContain('household_id,id')
  })

  it('financial_entries declara CHECK garantindo que responsible_member_household_id só existe junto com responsible_member_id e é sempre igual a household_id', () => {
    const { checks } = getTableConfig(financialEntries)
    const consistencyCheck = checks.find((c) => c.name === 'financial_entries_responsible_member_household_check')
    expect(consistencyCheck).toBeDefined()
  })

  it('status de financial_entries usa o vocabulário previsto/realizado (nunca "paid")', () => {
    expect(FINANCIAL_ENTRY_STATUSES).toEqual(['planned', 'pending', 'realized', 'cancelled'])
    expect(FINANCIAL_ENTRY_STATUSES).not.toContain('paid')
  })

  it('financial_entries tem realization_date e não tem payment_date', () => {
    const { columns } = getTableConfig(financialEntries)
    const columnNames = columns.map((c) => c.name)
    expect(columnNames).toContain('realization_date')
    expect(columnNames).not.toContain('payment_date')
  })
})

describe('installment_plans (Sessão 12, Bloco 03)', () => {
  it('usa o nome de tabela installment_plans em snake_case', () => {
    expect(getTableConfig(installmentPlans).name).toBe('installment_plans')
  })

  it('nenhuma coluna usa FLOAT ou DOUBLE', () => {
    const { columns } = getTableConfig(installmentPlans)
    for (const column of columns) {
      expect(column.columnType, column.name).not.toMatch(/Float|Double/i)
    }
  })

  it('usa DECIMAL(13,2) para total_amount — mesma estratégia monetária do projeto', () => {
    const { columns } = getTableConfig(installmentPlans)
    const totalAmount = columns.find((c) => c.name === 'total_amount')
    expect(totalAmount?.getSQLType()).toBe('decimal(13,2)')
  })

  it('due_day, installment_count e demais colunas numéricas usam bigint unsigned, nunca int', () => {
    const { columns } = getTableConfig(installmentPlans)
    for (const name of ['id', 'household_id', 'category_id', 'installment_count', 'due_day', 'created_by_user_id']) {
      const column = columns.find((c) => c.name === name)
      expect(column?.columnType, name).toBe('MySqlBigInt53')
    }
  })

  it('due_day é NOT NULL — obrigatório, nunca opcional (correção do Bloco 02)', () => {
    const { columns } = getTableConfig(installmentPlans)
    const dueDay = columns.find((c) => c.name === 'due_day')
    expect(dueDay?.notNull).toBe(true)
  })

  it('created_at é NOT NULL com defaultNow — mesma convenção de monthly_periods/categories', () => {
    const { columns } = getTableConfig(installmentPlans)
    const createdAt = columns.find((c) => c.name === 'created_at')
    expect(createdAt?.notNull).toBe(true)
    expect(createdAt?.hasDefault).toBe(true)
  })

  it('declara unique(id, household_id) para servir de alvo da FK composta de financial_entries', () => {
    const uniqueSets = getTableConfig(installmentPlans).uniqueConstraints.map((constraint) =>
      constraint.columns
        .map((column) => column.name)
        .sort()
        .join(','),
    )
    expect(uniqueSets).toContain('household_id,id')
  })

  it('declara CHECK constraints para total_amount > 0, installment_count >= 2 e due_day entre 1 e 31', () => {
    const { checks } = getTableConfig(installmentPlans)
    expect(checks.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        'installment_plans_total_amount_positive',
        'installment_plans_installment_count_min',
        'installment_plans_due_day_range',
      ]),
    )
  })

  it('household_id e created_by_user_id têm foreign keys simples com RESTRICT (sem CASCADE)', () => {
    const { foreignKeys } = getTableConfig(installmentPlans)
    for (const columnName of ['household_id', 'created_by_user_id']) {
      const fk = foreignKeys.find((f) => f.reference().columns.some((c) => c.name === columnName))
      expect(fk?.onDelete, columnName).toBe('restrict')
    }
  })

  it('category_id é protegido por foreign key COMPOSTA (category_id + household_id), com RESTRICT', () => {
    const { foreignKeys } = getTableConfig(installmentPlans)
    const categoryFk = foreignKeys.find((f) => f.reference().columns.some((c) => c.name === 'category_id'))
    expect(categoryFk?.reference().columns.map((c) => c.name).sort()).toEqual(['category_id', 'household_id'])
    expect(categoryFk?.reference().foreignColumns.map((c) => c.name).sort()).toEqual(['household_id', 'id'])
    expect(categoryFk?.reference().foreignTable).toBe(categories)
    expect(categoryFk?.onDelete).toBe('restrict')
  })

  it('não tem nenhuma foreign key para monthly_periods — first_reference_month é uma data solta, não uma competência real (Bloco 01/02)', () => {
    const { foreignKeys } = getTableConfig(installmentPlans)
    const periodFk = foreignKeys.find((f) => f.reference().foreignTable === monthlyPeriods)
    expect(periodFk).toBeUndefined()
  })
})

describe('financial_entries — extensão de parcelamento (Sessão 12, Bloco 03)', () => {
  it('installment_plan_id e installment_number são nullable — lançamentos comuns continuam funcionando sem plano', () => {
    const { columns } = getTableConfig(financialEntries)
    const installmentPlanId = columns.find((c) => c.name === 'installment_plan_id')
    const installmentNumber = columns.find((c) => c.name === 'installment_number')
    expect(installmentPlanId?.notNull).toBe(false)
    expect(installmentNumber?.notNull).toBe(false)
  })

  it('não ganhou installment_total nem duplicou total_amount/installment_count — esses campos vivem só em installment_plans', () => {
    const { columns } = getTableConfig(financialEntries)
    const columnNames = columns.map((c) => c.name)
    expect(columnNames).not.toContain('installment_total')
    expect(columnNames).not.toContain('total_amount')
    expect(columnNames).not.toContain('installment_count')
  })

  it('declara CHECK garantindo que installment_plan_id e installment_number sempre se movem juntos (nunca um preenchido sem o outro)', () => {
    const { checks } = getTableConfig(financialEntries)
    const coherenceCheck = checks.find((c) => c.name === 'financial_entries_installment_coherence_check')
    expect(coherenceCheck).toBeDefined()
  })

  it('declara índice único (installment_plan_id, installment_number) — impede duas parcelas com o mesmo número no mesmo plano', () => {
    const uniqueSets = getTableConfig(financialEntries)
      .indexes.filter((index) => index.config.unique)
      .map((index) =>
        index.config.columns
          .map((column) => ('name' in column ? column.name : ''))
          .sort()
          .join(','),
      )
    expect(uniqueSets).toContain('installment_number,installment_plan_id')
  })

  it('installment_plan_id é protegido por foreign key COMPOSTA (installment_plan_id + household_id) para installment_plans, com RESTRICT (nunca CASCADE — Bloco 01: sem exclusão automática de parcelas ao remover um plano)', () => {
    const { foreignKeys } = getTableConfig(financialEntries)
    const planFk = foreignKeys.find((f) => f.reference().columns.some((c) => c.name === 'installment_plan_id'))
    expect(planFk?.reference().columns.map((c) => c.name).sort()).toEqual(['household_id', 'installment_plan_id'])
    expect(planFk?.reference().foreignColumns.map((c) => c.name).sort()).toEqual(['household_id', 'id'])
    expect(planFk?.reference().foreignTable).toBe(installmentPlans)
    expect(planFk?.onDelete).toBe('restrict')
  })
})
