import { describe, expect, it } from 'vitest'
import {
  assertAuthSessionsAfterState,
  assertAuthSessionsAuditEnvironmentAllowed,
  assertAuthSessionsBeforeState,
  assertPreExistingCountsPreserved,
  AuthSessionsAuditError,
  PRE_EXISTING_APPLICATION_TABLES,
} from './auth-sessions-audit.js'

describe('assertAuthSessionsAuditEnvironmentAllowed', () => {
  it('aprova development + finanhouse_dev', () => {
    expect(() => assertAuthSessionsAuditEnvironmentAllowed({ environment: 'development', database: 'finanhouse_dev' })).not.toThrow()
  })

  it('recusa ambiente diferente de development', () => {
    expect(() => assertAuthSessionsAuditEnvironmentAllowed({ environment: 'production', database: 'finanhouse_dev' })).toThrow(AuthSessionsAuditError)
  })

  it('recusa banco diferente de finanhouse_dev', () => {
    expect(() => assertAuthSessionsAuditEnvironmentAllowed({ environment: 'development', database: 'finanhouse_prod' })).toThrow(AuthSessionsAuditError)
  })
})

describe('assertAuthSessionsBeforeState', () => {
  it('aprova quando as sete tabelas existem, auth_sessions ainda não, e há exatamente 3 migrations', () => {
    expect(() =>
      assertAuthSessionsBeforeState({
        existingApplicationTables: [...PRE_EXISTING_APPLICATION_TABLES],
        migrationsRows: [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }],
      }),
    ).not.toThrow()
  })

  it('recusa quando falta alguma das sete tabelas pré-existentes', () => {
    expect(() =>
      assertAuthSessionsBeforeState({ existingApplicationTables: ['households', 'users'], migrationsRows: [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }] }),
    ).toThrow(AuthSessionsAuditError)
  })

  it('recusa quando auth_sessions já existe', () => {
    expect(() =>
      assertAuthSessionsBeforeState({
        existingApplicationTables: [...PRE_EXISTING_APPLICATION_TABLES, 'auth_sessions'],
        migrationsRows: [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }],
      }),
    ).toThrow(AuthSessionsAuditError)
  })

  it('recusa quando não há exatamente 3 migrations', () => {
    expect(() =>
      assertAuthSessionsBeforeState({ existingApplicationTables: [...PRE_EXISTING_APPLICATION_TABLES], migrationsRows: [{ hash: 'a' }] }),
    ).toThrow(AuthSessionsAuditError)
  })
})

describe('assertAuthSessionsAfterState', () => {
  const allTables = [...PRE_EXISTING_APPLICATION_TABLES, 'auth_sessions']
  const fourMigrations = [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }, { hash: 'd' }]

  it('aprova quando as oito tabelas existem, 4 migrations, auth_sessions vazia, nenhuma senha configurada', () => {
    expect(() =>
      assertAuthSessionsAfterState({ existingApplicationTables: allTables, migrationsRows: fourMigrations, authSessionsRowCount: 0, usersWithPasswordConfiguredCount: 0 }),
    ).not.toThrow()
  })

  it('recusa quando auth_sessions está ausente', () => {
    expect(() =>
      assertAuthSessionsAfterState({
        existingApplicationTables: [...PRE_EXISTING_APPLICATION_TABLES],
        migrationsRows: fourMigrations,
        authSessionsRowCount: 0,
        usersWithPasswordConfiguredCount: 0,
      }),
    ).toThrow(AuthSessionsAuditError)
  })

  it('recusa quando não há exatamente 4 migrations', () => {
    expect(() =>
      assertAuthSessionsAfterState({ existingApplicationTables: allTables, migrationsRows: [{ hash: 'a' }], authSessionsRowCount: 0, usersWithPasswordConfiguredCount: 0 }),
    ).toThrow(AuthSessionsAuditError)
  })

  it('recusa quando auth_sessions tem registros', () => {
    expect(() =>
      assertAuthSessionsAfterState({ existingApplicationTables: allTables, migrationsRows: fourMigrations, authSessionsRowCount: 2, usersWithPasswordConfiguredCount: 0 }),
    ).toThrow(AuthSessionsAuditError)
  })

  it('recusa quando algum usuário já tem senha configurada (migration nunca configura senha)', () => {
    expect(() =>
      assertAuthSessionsAfterState({ existingApplicationTables: allTables, migrationsRows: fourMigrations, authSessionsRowCount: 0, usersWithPasswordConfiguredCount: 1 }),
    ).toThrow(AuthSessionsAuditError)
  })
})

describe('assertPreExistingCountsPreserved', () => {
  it('aprova quando todas as contagens são idênticas', () => {
    const counts = { households: 1, users: 2, household_members: 2, categories: 7, monthly_periods: 1, financial_entries: 0, category_budgets: 0 }
    expect(() => assertPreExistingCountsPreserved(counts, { ...counts })).not.toThrow()
  })

  it('recusa quando alguma contagem mudou', () => {
    const before = { households: 1, users: 2, household_members: 2, categories: 7, monthly_periods: 1, financial_entries: 0, category_budgets: 0 }
    const after = { ...before, users: 3 }
    expect(() => assertPreExistingCountsPreserved(before, after)).toThrow(AuthSessionsAuditError)
  })
})
