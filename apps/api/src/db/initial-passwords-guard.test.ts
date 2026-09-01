import { describe, expect, it } from 'vitest'
import {
  assertInitialPasswordsEnvironmentAllowed,
  assertNoUnauthorizedOverwrite,
  assertUsersFoundExactly,
  InitialPasswordsGuardError,
} from './initial-passwords-guard.js'

describe('assertInitialPasswordsEnvironmentAllowed', () => {
  const dev = { provider: 'aiven', environment: 'development', database: 'finanhouse_dev', confirmFlag: 'true' }
  const prod = { provider: 'aiven', environment: 'production', database: 'finanhouse_prod', confirmFlag: 'true' }

  it('aprova development + finanhouse_dev + confirmação', () => {
    expect(() => assertInitialPasswordsEnvironmentAllowed(dev)).not.toThrow()
  })

  it('aprova production + finanhouse_prod + confirmação (Sessão 14, Bloco 03, FASE D.1)', () => {
    expect(() => assertInitialPasswordsEnvironmentAllowed(prod)).not.toThrow()
  })

  it('recusa provider diferente de aiven', () => {
    expect(() => assertInitialPasswordsEnvironmentAllowed({ ...dev, provider: 'clever-cloud' })).toThrow(InitialPasswordsGuardError)
  })

  it('recusa production + finanhouse_dev (par cruzado — nunca o banco do outro ambiente)', () => {
    expect(() => assertInitialPasswordsEnvironmentAllowed({ ...prod, database: 'finanhouse_dev' })).toThrow(InitialPasswordsGuardError)
  })

  it('recusa development + finanhouse_prod (par cruzado — nunca o banco do outro ambiente)', () => {
    expect(() => assertInitialPasswordsEnvironmentAllowed({ ...dev, database: 'finanhouse_prod' })).toThrow(InitialPasswordsGuardError)
  })

  it('recusa defaultdb em qualquer ambiente', () => {
    expect(() => assertInitialPasswordsEnvironmentAllowed({ ...dev, database: 'defaultdb' })).toThrow(InitialPasswordsGuardError)
    expect(() => assertInitialPasswordsEnvironmentAllowed({ ...prod, database: 'defaultdb' })).toThrow(InitialPasswordsGuardError)
  })

  it('recusa ambiente desconhecido (nem development, nem production)', () => {
    expect(() => assertInitialPasswordsEnvironmentAllowed({ ...dev, environment: 'staging', database: 'finanhouse_staging' })).toThrow(
      InitialPasswordsGuardError,
    )
  })

  it('recusa sem CONFIRM_INITIAL_PASSWORDS=true', () => {
    expect(() => assertInitialPasswordsEnvironmentAllowed({ ...dev, confirmFlag: undefined })).toThrow(InitialPasswordsGuardError)
    expect(() => assertInitialPasswordsEnvironmentAllowed({ ...prod, confirmFlag: undefined })).toThrow(InitialPasswordsGuardError)
  })
})

describe('assertUsersFoundExactly', () => {
  it('aprova quando os dois usuários são encontrados', () => {
    expect(() => assertUsersFoundExactly({ ownerFound: true, partnerFound: true })).not.toThrow()
  })

  it('recusa quando o owner não é encontrado', () => {
    expect(() => assertUsersFoundExactly({ ownerFound: false, partnerFound: true })).toThrow(InitialPasswordsGuardError)
  })

  it('recusa quando o partner não é encontrado', () => {
    expect(() => assertUsersFoundExactly({ ownerFound: true, partnerFound: false })).toThrow(InitialPasswordsGuardError)
  })

  it('recusa quando nenhum é encontrado', () => {
    expect(() => assertUsersFoundExactly({ ownerFound: false, partnerFound: false })).toThrow(InitialPasswordsGuardError)
  })
})

describe('assertNoUnauthorizedOverwrite', () => {
  it('aprova quando nenhuma senha está configurada ainda', () => {
    expect(() => assertNoUnauthorizedOverwrite({ ownerAlreadyConfigured: false, partnerAlreadyConfigured: false, allowOverwrite: false })).not.toThrow()
  })

  it('recusa sobrescrever senha do owner sem autorização separada', () => {
    expect(() => assertNoUnauthorizedOverwrite({ ownerAlreadyConfigured: true, partnerAlreadyConfigured: false, allowOverwrite: false })).toThrow(
      InitialPasswordsGuardError,
    )
  })

  it('recusa sobrescrever senha do partner sem autorização separada', () => {
    expect(() => assertNoUnauthorizedOverwrite({ ownerAlreadyConfigured: false, partnerAlreadyConfigured: true, allowOverwrite: false })).toThrow(
      InitialPasswordsGuardError,
    )
  })

  it('aprova sobrescrever quando allowOverwrite é explicitamente true', () => {
    expect(() => assertNoUnauthorizedOverwrite({ ownerAlreadyConfigured: true, partnerAlreadyConfigured: true, allowOverwrite: true })).not.toThrow()
  })
})
