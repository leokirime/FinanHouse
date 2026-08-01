import { getTableConfig } from 'drizzle-orm/mysql-core'
import { describe, expect, it } from 'vitest'
import { categories, FINANCIAL_ENTRY_STATUSES, financialEntries, householdMembers, households, monthlyPeriods, users } from './index.js'

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
