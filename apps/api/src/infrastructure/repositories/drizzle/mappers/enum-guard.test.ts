import { describe, expect, it } from 'vitest'
import { UnexpectedPersistedValueError } from '../persistence-errors.js'
import { assertKnownValue } from './enum-guard.js'

describe('assertKnownValue', () => {
  it('retorna o valor quando pertence ao conjunto permitido', () => {
    expect(assertKnownValue('active', ['active', 'inactive'] as const, 'status')).toBe('active')
  })

  it('lança UnexpectedPersistedValueError para valor fora do conjunto', () => {
    expect(() => assertKnownValue('archived', ['active', 'inactive'] as const, 'status')).toThrow(
      UnexpectedPersistedValueError,
    )
  })

  it('inclui o nome do campo e o valor recebido na mensagem', () => {
    expect(() => assertKnownValue('archived', ['active', 'inactive'] as const, 'categories.status')).toThrow(
      /categories\.status.*"archived"/,
    )
  })
})
