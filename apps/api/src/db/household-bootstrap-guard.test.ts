import { describe, expect, it } from 'vitest'
import {
  assertBootstrapEnvironmentAllowed,
  assertBootstrapMigrationsExact,
  assertNoExistingHousehold,
  BootstrapGuardError,
} from './household-bootstrap-guard.js'

describe('assertBootstrapEnvironmentAllowed', () => {
  const valid = { provider: 'aiven', environment: 'development', database: 'finanhouse_dev', confirmFlag: 'true' }

  it('aprova quando provider, ambiente, banco e confirmação estão corretos', () => {
    expect(() => assertBootstrapEnvironmentAllowed(valid)).not.toThrow()
  })

  it('recusa provider diferente de aiven', () => {
    expect(() => assertBootstrapEnvironmentAllowed({ ...valid, provider: 'clevercloud' })).toThrow(BootstrapGuardError)
  })

  it('recusa ambiente diferente de development', () => {
    expect(() => assertBootstrapEnvironmentAllowed({ ...valid, environment: 'production' })).toThrow(BootstrapGuardError)
  })

  it('recusa banco diferente de finanhouse_dev', () => {
    expect(() => assertBootstrapEnvironmentAllowed({ ...valid, database: 'finanhouse_prod' })).toThrow(BootstrapGuardError)
  })

  it('recusa sem CONFIRM_HOUSEHOLD_BOOTSTRAP=true', () => {
    expect(() => assertBootstrapEnvironmentAllowed({ ...valid, confirmFlag: undefined })).toThrow(BootstrapGuardError)
    expect(() => assertBootstrapEnvironmentAllowed({ ...valid, confirmFlag: 'false' })).toThrow(BootstrapGuardError)
  })
})

describe('assertBootstrapMigrationsExact', () => {
  it('aprova com exatamente 2 migrations', () => {
    expect(() => assertBootstrapMigrationsExact({ migrationsRows: [{ hash: 'a' }, { hash: 'b' }] })).not.toThrow()
  })

  it('recusa com menos de 2 migrations', () => {
    expect(() => assertBootstrapMigrationsExact({ migrationsRows: [{ hash: 'a' }] })).toThrow(BootstrapGuardError)
  })

  it('recusa com mais de 2 migrations (schema divergente do esperado)', () => {
    expect(() => assertBootstrapMigrationsExact({ migrationsRows: [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }] })).toThrow(BootstrapGuardError)
  })
})

describe('assertNoExistingHousehold', () => {
  it('aprova quando não há household existente', () => {
    expect(() => assertNoExistingHousehold({ householdCount: 0 })).not.toThrow()
  })

  it('recusa quando já existe ao menos um household', () => {
    expect(() => assertNoExistingHousehold({ householdCount: 1 })).toThrow(BootstrapGuardError)
  })
})
