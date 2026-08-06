import { describe, expect, it } from 'vitest'
import { assertAuthSmokeEnvironmentAllowed, assertAuthSmokeMigrationsPresent, AuthSmokeGuardError } from './auth-smoke-guard.js'

const VALID: Parameters<typeof assertAuthSmokeEnvironmentAllowed>[0] = {
  provider: 'aiven',
  environment: 'development',
  database: 'finanhouse_dev',
  confirmFlag: 'true',
}

describe('assertAuthSmokeEnvironmentAllowed', () => {
  it('não lança quando provider/environment/database/confirmFlag estão todos corretos', () => {
    expect(() => assertAuthSmokeEnvironmentAllowed(VALID)).not.toThrow()
  })

  it('rejeita provider diferente de aiven, mencionando o comando correto', () => {
    expect(() => assertAuthSmokeEnvironmentAllowed({ ...VALID, provider: 'clever-cloud' })).toThrow(
      /DATABASE_PROVIDER=aiven/,
    )
  })

  it('rejeita ambiente diferente de development', () => {
    expect(() => assertAuthSmokeEnvironmentAllowed({ ...VALID, environment: 'production' })).toThrow(AuthSmokeGuardError)
  })

  it('rejeita banco diferente de finanhouse_dev', () => {
    expect(() => assertAuthSmokeEnvironmentAllowed({ ...VALID, database: 'finanhouse_prod' })).toThrow(AuthSmokeGuardError)
  })

  it('rejeita sem CONFIRM_AUTH_SMOKE_TEST=true, mencionando exatamente essa variável (nunca CONFIRM_REPOSITORY_SMOKE)', () => {
    expect(() => assertAuthSmokeEnvironmentAllowed({ ...VALID, confirmFlag: undefined })).toThrow(/CONFIRM_AUTH_SMOKE_TEST=true/)
  })

  it('rejeita confirmFlag com qualquer valor diferente da string exata "true"', () => {
    expect(() => assertAuthSmokeEnvironmentAllowed({ ...VALID, confirmFlag: 'TRUE' })).toThrow(AuthSmokeGuardError)
  })

  it('nenhuma mensagem de erro menciona o script/variável do smoke de repositórios genérico', () => {
    try {
      assertAuthSmokeEnvironmentAllowed({ ...VALID, confirmFlag: undefined })
      throw new Error('deveria ter lançado')
    } catch (error) {
      expect((error as Error).message).not.toContain('CONFIRM_REPOSITORY_SMOKE')
      expect((error as Error).message).not.toContain('db:smoke:repositories')
    }
  })
})

describe('assertAuthSmokeMigrationsPresent', () => {
  it('não lança com exatamente 4 migrations registradas', () => {
    expect(() =>
      assertAuthSmokeMigrationsPresent({ migrationsRows: [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }, { hash: 'd' }] }),
    ).not.toThrow()
  })

  it('não lança com mais de 4 migrations registradas', () => {
    expect(() =>
      assertAuthSmokeMigrationsPresent({
        migrationsRows: [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }, { hash: 'd' }, { hash: 'e' }],
      }),
    ).not.toThrow()
  })

  it('rejeita com menos de 4 migrations registradas', () => {
    expect(() => assertAuthSmokeMigrationsPresent({ migrationsRows: [{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }] })).toThrow(
      AuthSmokeGuardError,
    )
  })

  it('rejeita com zero migrations registradas', () => {
    expect(() => assertAuthSmokeMigrationsPresent({ migrationsRows: [] })).toThrow(AuthSmokeGuardError)
  })
})
