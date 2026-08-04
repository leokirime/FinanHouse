import { describe, expect, it } from 'vitest'
import {
  assertCategoryBudgetsAfterState,
  assertCategoryBudgetsAuditEnvironmentAllowed,
  assertCategoryBudgetsBeforeState,
  assertPreExistingCountsPreserved,
  CategoryBudgetsAuditError,
  PRE_EXISTING_APPLICATION_TABLES,
} from './category-budgets-audit.js'

describe('assertCategoryBudgetsAuditEnvironmentAllowed', () => {
  it('aprova development + finanhouse_dev', () => {
    expect(() => assertCategoryBudgetsAuditEnvironmentAllowed({ environment: 'development', database: 'finanhouse_dev' })).not.toThrow()
  })

  it('recusa ambiente diferente de development', () => {
    expect(() => assertCategoryBudgetsAuditEnvironmentAllowed({ environment: 'production', database: 'finanhouse_dev' })).toThrow(
      CategoryBudgetsAuditError,
    )
  })

  it('recusa banco diferente de finanhouse_dev', () => {
    expect(() => assertCategoryBudgetsAuditEnvironmentAllowed({ environment: 'development', database: 'finanhouse_prod' })).toThrow(
      CategoryBudgetsAuditError,
    )
  })
})

describe('assertCategoryBudgetsBeforeState', () => {
  it('aprova quando as seis tabelas existem, category_budgets ainda não, e há exatamente 2 migrations', () => {
    expect(() =>
      assertCategoryBudgetsBeforeState({
        existingApplicationTables: [...PRE_EXISTING_APPLICATION_TABLES],
        migrationsRows: [{ hash: 'a' }, { hash: 'b' }],
      }),
    ).not.toThrow()
  })

  it('recusa quando falta alguma das seis tabelas pré-existentes', () => {
    expect(() =>
      assertCategoryBudgetsBeforeState({
        existingApplicationTables: ['households', 'users'],
        migrationsRows: [{ hash: 'a' }, { hash: 'b' }],
      }),
    ).toThrow(CategoryBudgetsAuditError)
  })

  it('recusa quando category_budgets já existe', () => {
    expect(() =>
      assertCategoryBudgetsBeforeState({
        existingApplicationTables: [...PRE_EXISTING_APPLICATION_TABLES, 'category_budgets'],
        migrationsRows: [{ hash: 'a' }, { hash: 'b' }],
      }),
    ).toThrow(CategoryBudgetsAuditError)
  })

  it('recusa quando não há exatamente 2 migrations', () => {
    expect(() =>
      assertCategoryBudgetsBeforeState({ existingApplicationTables: [...PRE_EXISTING_APPLICATION_TABLES], migrationsRows: [{ hash: 'a' }] }),
    ).toThrow(CategoryBudgetsAuditError)
  })
})

describe('assertCategoryBudgetsAfterState', () => {
  const allTables = [...PRE_EXISTING_APPLICATION_TABLES, 'category_budgets']

  it('aprova quando as sete tabelas existem, 3 migrations, category_budgets vazia', () => {
    expect(() =>
      assertCategoryBudgetsAfterState({ existingApplicationTables: allTables, migrationsRows: [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }], categoryBudgetsRowCount: 0 }),
    ).not.toThrow()
  })

  it('recusa quando category_budgets está ausente', () => {
    expect(() =>
      assertCategoryBudgetsAfterState({
        existingApplicationTables: [...PRE_EXISTING_APPLICATION_TABLES],
        migrationsRows: [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }],
        categoryBudgetsRowCount: 0,
      }),
    ).toThrow(CategoryBudgetsAuditError)
  })

  it('recusa quando não há exatamente 3 migrations', () => {
    expect(() =>
      assertCategoryBudgetsAfterState({ existingApplicationTables: allTables, migrationsRows: [{ hash: 'a' }, { hash: 'b' }], categoryBudgetsRowCount: 0 }),
    ).toThrow(CategoryBudgetsAuditError)
  })

  it('recusa quando category_budgets tem registros', () => {
    expect(() =>
      assertCategoryBudgetsAfterState({ existingApplicationTables: allTables, migrationsRows: [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }], categoryBudgetsRowCount: 3 }),
    ).toThrow(CategoryBudgetsAuditError)
  })
})

describe('assertPreExistingCountsPreserved', () => {
  it('aprova quando todas as contagens são idênticas', () => {
    const counts = { households: 1, users: 2, household_members: 2, categories: 7, monthly_periods: 1, financial_entries: 0 }
    expect(() => assertPreExistingCountsPreserved(counts, { ...counts })).not.toThrow()
  })

  it('recusa quando alguma contagem mudou', () => {
    const before = { households: 1, users: 2, household_members: 2, categories: 7, monthly_periods: 1, financial_entries: 0 }
    const after = { ...before, categories: 8 }
    expect(() => assertPreExistingCountsPreserved(before, after)).toThrow(CategoryBudgetsAuditError)
  })
})
