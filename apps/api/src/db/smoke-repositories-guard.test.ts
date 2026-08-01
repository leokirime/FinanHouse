import { describe, expect, it } from 'vitest'
import {
  SmokeGuardError,
  assertNoResidualData,
  assertSmokeEnvironmentAllowed,
  assertSmokeMigrationsPresent,
  assertSmokeStartingEmpty,
} from './smoke-repositories-guard.js'

describe('assertSmokeEnvironmentAllowed', () => {
  const valid = { environment: 'development', database: 'finanhouse_dev', confirmFlag: 'true' }

  it('aceita development + finanhouse_dev + CONFIRM_REPOSITORY_SMOKE=true', () => {
    expect(() => assertSmokeEnvironmentAllowed(valid)).not.toThrow()
  })

  it('rejeita ambiente diferente de development', () => {
    expect(() => assertSmokeEnvironmentAllowed({ ...valid, environment: 'production' })).toThrow(SmokeGuardError)
  })

  it('rejeita banco diferente de finanhouse_dev', () => {
    expect(() => assertSmokeEnvironmentAllowed({ ...valid, database: 'finanhouse_prod' })).toThrow(SmokeGuardError)
  })

  it('rejeita quando CONFIRM_REPOSITORY_SMOKE não é exatamente "true"', () => {
    expect(() => assertSmokeEnvironmentAllowed({ ...valid, confirmFlag: undefined })).toThrow(SmokeGuardError)
    expect(() => assertSmokeEnvironmentAllowed({ ...valid, confirmFlag: '1' })).toThrow(SmokeGuardError)
  })
})

describe('assertSmokeMigrationsPresent', () => {
  it('aceita quando as duas migrations (0000 e 0001) estão registradas', () => {
    expect(() =>
      assertSmokeMigrationsPresent({ migrationsRows: [{ hash: 'a' }, { hash: 'b' }] }),
    ).not.toThrow()
  })

  it('rejeita quando falta alguma migration', () => {
    expect(() => assertSmokeMigrationsPresent({ migrationsRows: [{ hash: 'a' }] })).toThrow(SmokeGuardError)
    expect(() => assertSmokeMigrationsPresent({ migrationsRows: [] })).toThrow(SmokeGuardError)
  })
})

describe('assertSmokeStartingEmpty', () => {
  it('aceita quando todas as tabelas estão vazias', () => {
    expect(() =>
      assertSmokeStartingEmpty({ rowCounts: { users: 0, households: 0, financial_entries: 0 } }),
    ).not.toThrow()
  })

  it('rejeita quando alguma tabela tem registros', () => {
    expect(() =>
      assertSmokeStartingEmpty({ rowCounts: { users: 0, financial_entries: 3 } }),
    ).toThrow(SmokeGuardError)
  })
})

describe('assertNoResidualData', () => {
  it('aceita quando as contagens antes e depois do rollback são idênticas', () => {
    expect(() =>
      assertNoResidualData({ before: { users: 0, financial_entries: 0 }, after: { users: 0, financial_entries: 0 } }),
    ).not.toThrow()
  })

  it('rejeita quando alguma tabela ficou com dado residual após o rollback', () => {
    expect(() =>
      assertNoResidualData({ before: { financial_entries: 0 }, after: { financial_entries: 1 } }),
    ).toThrow(SmokeGuardError)
  })

  it('trata tabela ausente em um dos lados como contagem zero', () => {
    expect(() => assertNoResidualData({ before: {}, after: { users: 0 } })).not.toThrow()
  })
})
