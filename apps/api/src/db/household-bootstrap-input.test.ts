import { describe, expect, it } from 'vitest'
import { BootstrapInputError, resolveBootstrapInput } from './household-bootstrap-input.js'

const VALID_ENV: NodeJS.ProcessEnv = {
  FINANHOUSE_BOOTSTRAP_OWNER_NAME: 'Owner Test',
  FINANHOUSE_BOOTSTRAP_OWNER_EMAIL: 'owner@bootstrap.invalid',
  FINANHOUSE_BOOTSTRAP_PARTNER_NAME: 'Partner Test',
  FINANHOUSE_BOOTSTRAP_PARTNER_EMAIL: 'partner@bootstrap.invalid',
  FINANHOUSE_BOOTSTRAP_HOUSEHOLD_NAME: 'Household Test',
}

describe('resolveBootstrapInput', () => {
  it('resolve as cinco variáveis quando todas estão presentes e válidas', () => {
    const input = resolveBootstrapInput(VALID_ENV)
    expect(input).toEqual({
      ownerName: 'Owner Test',
      ownerEmail: 'owner@bootstrap.invalid',
      partnerName: 'Partner Test',
      partnerEmail: 'partner@bootstrap.invalid',
      householdName: 'Household Test',
    })
  })

  it('rejeita quando uma variável obrigatória está ausente, citando apenas o nome dela', () => {
    const { FINANHOUSE_BOOTSTRAP_OWNER_EMAIL: _omitted, ...withoutOwnerEmail } = VALID_ENV
    try {
      resolveBootstrapInput(withoutOwnerEmail)
      expect.unreachable('deveria ter lançado BootstrapInputError')
    } catch (error) {
      expect(error).toBeInstanceOf(BootstrapInputError)
      expect((error as Error).message).toContain('FINANHOUSE_BOOTSTRAP_OWNER_EMAIL')
      expect((error as Error).message).not.toContain('bootstrap.invalid')
    }
  })

  it('rejeita quando uma variável obrigatória está vazia', () => {
    expect(() => resolveBootstrapInput({ ...VALID_ENV, FINANHOUSE_BOOTSTRAP_HOUSEHOLD_NAME: '   ' })).toThrow(BootstrapInputError)
  })

  it('rejeita e-mail do proprietário em formato inválido', () => {
    expect(() => resolveBootstrapInput({ ...VALID_ENV, FINANHOUSE_BOOTSTRAP_OWNER_EMAIL: 'nao-e-email' })).toThrow(BootstrapInputError)
  })

  it('rejeita e-mail do parceiro em formato inválido', () => {
    expect(() => resolveBootstrapInput({ ...VALID_ENV, FINANHOUSE_BOOTSTRAP_PARTNER_EMAIL: 'nao-e-email' })).toThrow(BootstrapInputError)
  })

  it('rejeita quando proprietário e parceiro usam o mesmo e-mail', () => {
    expect(() =>
      resolveBootstrapInput({ ...VALID_ENV, FINANHOUSE_BOOTSTRAP_PARTNER_EMAIL: VALID_ENV.FINANHOUSE_BOOTSTRAP_OWNER_EMAIL }),
    ).toThrow(BootstrapInputError)
  })

  it('rejeita nome com mais de 120 caracteres', () => {
    expect(() => resolveBootstrapInput({ ...VALID_ENV, FINANHOUSE_BOOTSTRAP_OWNER_NAME: 'a'.repeat(121) })).toThrow(BootstrapInputError)
  })
})
