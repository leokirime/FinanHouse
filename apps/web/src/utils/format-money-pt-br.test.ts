import { describe, expect, it } from 'vitest'
import { formatMoneyPtBr } from './format-money-pt-br.ts'

describe('formatMoneyPtBr', () => {
  it('formata zero', () => {
    expect(formatMoneyPtBr(0n)).toBe('R$ 0,00')
  })

  it('formata centavos', () => {
    expect(formatMoneyPtBr(50n)).toBe('R$ 0,50')
    expect(formatMoneyPtBr(1050n)).toBe('R$ 10,50')
  })

  it('formata milhares com separador pt-BR', () => {
    expect(formatMoneyPtBr(150000n)).toBe('R$ 1.500,00')
    expect(formatMoneyPtBr(1234567n)).toBe('R$ 12.345,67')
  })

  it('formata valores negativos de apresentação', () => {
    expect(formatMoneyPtBr(-25000n)).toBe('-R$ 250,00')
    expect(formatMoneyPtBr(-1n)).toBe('-R$ 0,01')
  })

  it('formata valores grandes sem perda de precisão', () => {
    expect(formatMoneyPtBr(999999999999n)).toBe('R$ 9.999.999.999,99')
  })

  it('nunca produz NaN ou Infinity na saída', () => {
    for (const value of [0n, 1n, -1n, 999999999999n, -999999999999n]) {
      const result = formatMoneyPtBr(value)
      expect(result).not.toContain('NaN')
      expect(result).not.toContain('Infinity')
    }
  })
})
