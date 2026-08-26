import { formatMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import { formatMoneyPtBr, parseMoneyPtBr } from './format-money-pt-br.ts'

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

describe('parseMoneyPtBr', () => {
  it('"3000,00" → 3000.00 (canônico)', () => {
    expect(formatMoney(parseMoneyPtBr('3000,00'))).toBe('3000.00')
  })

  it('"1000,50" → 1000.50', () => {
    expect(formatMoney(parseMoneyPtBr('1000,50'))).toBe('1000.50')
  })

  it('"99,90" → 99.90', () => {
    expect(formatMoney(parseMoneyPtBr('99,90'))).toBe('99.90')
  })

  it('"3.000,00" (separador de milhar) → 3000.00', () => {
    expect(formatMoney(parseMoneyPtBr('3.000,00'))).toBe('3000.00')
  })

  it('"12.345,67" (milhar + decimais) → 12345.67', () => {
    expect(formatMoney(parseMoneyPtBr('12.345,67'))).toBe('12345.67')
  })

  it('sem parte decimal ("3000") → 3000.00', () => {
    expect(formatMoney(parseMoneyPtBr('3000'))).toBe('3000.00')
  })

  it('aceita espaços nas bordas', () => {
    expect(formatMoney(parseMoneyPtBr('  3000,00  '))).toBe('3000.00')
  })

  it('rejeita formato inválido — nunca Number/parseFloat como fonte de verdade', () => {
    expect(() => parseMoneyPtBr('abc')).toThrow()
    expect(() => parseMoneyPtBr('3000.00')).toThrow() // ponto como decimal não é pt-BR
    expect(() => parseMoneyPtBr('3,000.00')).toThrow() // formato americano
    expect(() => parseMoneyPtBr('3000,0')).toThrow() // só 1 casa decimal
    expect(() => parseMoneyPtBr('3000,000')).toThrow() // 3 casas decimais
    expect(() => parseMoneyPtBr('')).toThrow()
  })

  it('resultado nunca passa por Number/parseFloat — precisão preservada em valores grandes', () => {
    expect(formatMoney(parseMoneyPtBr('999.999.999.999,99'))).toBe('999999999999.99')
  })
})
