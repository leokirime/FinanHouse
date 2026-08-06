import { describe, expect, it } from 'vitest'
import { InitialPasswordsInputError, resolveInitialPasswordsInput } from './initial-passwords-input.js'

function buildEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    FINANHOUSE_BOOTSTRAP_OWNER_EMAIL: 'owner@finanhouse.invalid',
    FINANHOUSE_INITIAL_PASSWORD_OWNER: 'senha-do-owner-123',
    FINANHOUSE_BOOTSTRAP_PARTNER_EMAIL: 'partner@finanhouse.invalid',
    FINANHOUSE_INITIAL_PASSWORD_PARTNER: 'senha-do-partner-456',
    ...overrides,
  }
}

describe('resolveInitialPasswordsInput', () => {
  it('resolve as quatro variáveis quando todas estão presentes e válidas', () => {
    const input = resolveInitialPasswordsInput(buildEnv())
    expect(input).toEqual({
      ownerEmail: 'owner@finanhouse.invalid',
      ownerPassword: 'senha-do-owner-123',
      partnerEmail: 'partner@finanhouse.invalid',
      partnerPassword: 'senha-do-partner-456',
    })
  })

  it('lança com o nome da variável ausente, nunca com o valor', () => {
    expect(() => resolveInitialPasswordsInput(buildEnv({ FINANHOUSE_INITIAL_PASSWORD_OWNER: undefined }))).toThrow(
      /FINANHOUSE_INITIAL_PASSWORD_OWNER/,
    )
  })

  it('rejeita senha do owner mais curta que o mínimo', () => {
    expect(() => resolveInitialPasswordsInput(buildEnv({ FINANHOUSE_INITIAL_PASSWORD_OWNER: '123' }))).toThrow(InitialPasswordsInputError)
  })

  it('rejeita senha do partner mais curta que o mínimo', () => {
    expect(() => resolveInitialPasswordsInput(buildEnv({ FINANHOUSE_INITIAL_PASSWORD_PARTNER: '123' }))).toThrow(InitialPasswordsInputError)
  })

  it('rejeita e-mails de owner/partner iguais', () => {
    expect(() =>
      resolveInitialPasswordsInput(buildEnv({ FINANHOUSE_BOOTSTRAP_PARTNER_EMAIL: 'owner@finanhouse.invalid' })),
    ).toThrow(InitialPasswordsInputError)
  })

  it('rejeita senhas de owner/partner iguais', () => {
    expect(() =>
      resolveInitialPasswordsInput(buildEnv({ FINANHOUSE_INITIAL_PASSWORD_PARTNER: 'senha-do-owner-123' })),
    ).toThrow(InitialPasswordsInputError)
  })

  it('nunca inclui o valor da senha na mensagem de erro (mesmo quando ela é o motivo da rejeição)', () => {
    let thrown: Error | null = null
    try {
      resolveInitialPasswordsInput(buildEnv({ FINANHOUSE_INITIAL_PASSWORD_OWNER: 'sh0rt' }))
    } catch (error) {
      thrown = error as Error
    }
    expect(thrown).toBeInstanceOf(InitialPasswordsInputError)
    expect(thrown?.message).not.toContain('sh0rt')
  })
})
