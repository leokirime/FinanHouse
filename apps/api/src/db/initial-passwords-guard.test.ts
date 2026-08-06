import { describe, expect, it } from 'vitest'
import {
  assertInitialPasswordsEnvironmentAllowed,
  assertNoUnauthorizedOverwrite,
  assertUsersFoundExactly,
  InitialPasswordsGuardError,
} from './initial-passwords-guard.js'

describe('assertInitialPasswordsEnvironmentAllowed', () => {
  it('aprova aiven + development + finanhouse_dev + confirmação', () => {
    expect(() =>
      assertInitialPasswordsEnvironmentAllowed({ provider: 'aiven', environment: 'development', database: 'finanhouse_dev', confirmFlag: 'true' }),
    ).not.toThrow()
  })

  it('recusa provider diferente de aiven', () => {
    expect(() =>
      assertInitialPasswordsEnvironmentAllowed({ provider: 'clever-cloud', environment: 'development', database: 'finanhouse_dev', confirmFlag: 'true' }),
    ).toThrow(InitialPasswordsGuardError)
  })

  it('recusa ambiente diferente de development', () => {
    expect(() =>
      assertInitialPasswordsEnvironmentAllowed({ provider: 'aiven', environment: 'production', database: 'finanhouse_dev', confirmFlag: 'true' }),
    ).toThrow(InitialPasswordsGuardError)
  })

  it('recusa banco diferente de finanhouse_dev', () => {
    expect(() =>
      assertInitialPasswordsEnvironmentAllowed({ provider: 'aiven', environment: 'development', database: 'finanhouse_prod', confirmFlag: 'true' }),
    ).toThrow(InitialPasswordsGuardError)
  })

  it('recusa sem CONFIRM_INITIAL_PASSWORDS=true', () => {
    expect(() =>
      assertInitialPasswordsEnvironmentAllowed({ provider: 'aiven', environment: 'development', database: 'finanhouse_dev', confirmFlag: undefined }),
    ).toThrow(InitialPasswordsGuardError)
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
