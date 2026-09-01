import { describe, expect, it } from 'vitest'
import {
  assertBootstrapEnvironmentAllowed,
  assertBootstrapMigrationsMatchJournal,
  assertNoExistingHousehold,
  BootstrapGuardError,
} from './household-bootstrap-guard.js'

describe('assertBootstrapEnvironmentAllowed', () => {
  const dev = { provider: 'aiven', environment: 'development', database: 'finanhouse_dev', confirmFlag: 'true' }
  const prod = { provider: 'aiven', environment: 'production', database: 'finanhouse_prod', confirmFlag: 'true' }

  it('aprova development + finanhouse_dev + confirmação', () => {
    expect(() => assertBootstrapEnvironmentAllowed(dev)).not.toThrow()
  })

  it('aprova production + finanhouse_prod + confirmação (Sessão 14, Bloco 03, FASE D.1)', () => {
    expect(() => assertBootstrapEnvironmentAllowed(prod)).not.toThrow()
  })

  it('recusa provider diferente de aiven', () => {
    expect(() => assertBootstrapEnvironmentAllowed({ ...dev, provider: 'clevercloud' })).toThrow(BootstrapGuardError)
  })

  it('recusa production + finanhouse_dev (par cruzado — nunca o banco do outro ambiente)', () => {
    expect(() => assertBootstrapEnvironmentAllowed({ ...prod, database: 'finanhouse_dev' })).toThrow(BootstrapGuardError)
  })

  it('recusa development + finanhouse_prod (par cruzado — nunca o banco do outro ambiente)', () => {
    expect(() => assertBootstrapEnvironmentAllowed({ ...dev, database: 'finanhouse_prod' })).toThrow(BootstrapGuardError)
  })

  it('recusa defaultdb em qualquer ambiente', () => {
    expect(() => assertBootstrapEnvironmentAllowed({ ...dev, database: 'defaultdb' })).toThrow(BootstrapGuardError)
    expect(() => assertBootstrapEnvironmentAllowed({ ...prod, database: 'defaultdb' })).toThrow(BootstrapGuardError)
  })

  it('recusa ambiente desconhecido (nem development, nem production)', () => {
    expect(() => assertBootstrapEnvironmentAllowed({ ...dev, environment: 'staging', database: 'finanhouse_staging' })).toThrow(BootstrapGuardError)
  })

  it('recusa sem CONFIRM_HOUSEHOLD_BOOTSTRAP=true', () => {
    expect(() => assertBootstrapEnvironmentAllowed({ ...dev, confirmFlag: undefined })).toThrow(BootstrapGuardError)
    expect(() => assertBootstrapEnvironmentAllowed({ ...dev, confirmFlag: 'false' })).toThrow(BootstrapGuardError)
    expect(() => assertBootstrapEnvironmentAllowed({ ...prod, confirmFlag: undefined })).toThrow(BootstrapGuardError)
  })
})

describe('assertBootstrapMigrationsMatchJournal', () => {
  it('aprova quando a contagem aplicada é igual à esperada pelo journal oficial', () => {
    expect(() => assertBootstrapMigrationsMatchJournal({ appliedCount: 5, expectedCount: 5 })).not.toThrow()
  })

  it('não depende de um número fixo — aprova para qualquer contagem igual (ex.: journal futuro com 6 migrations)', () => {
    expect(() => assertBootstrapMigrationsMatchJournal({ appliedCount: 6, expectedCount: 6 })).not.toThrow()
  })

  it('recusa quando o banco tem MENOS migrations aplicadas que o journal espera (schema desatualizado)', () => {
    expect(() => assertBootstrapMigrationsMatchJournal({ appliedCount: 4, expectedCount: 5 })).toThrow(BootstrapGuardError)
  })

  it('recusa quando o banco tem MAIS migrations aplicadas que o journal espera (estado inconsistente)', () => {
    expect(() => assertBootstrapMigrationsMatchJournal({ appliedCount: 6, expectedCount: 5 })).toThrow(BootstrapGuardError)
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
