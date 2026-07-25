import { describe, expect, it } from 'vitest'
import { InvalidMoneyAmountError } from '../errors/domain-errors.js'
import {
  addMoney,
  assertPositiveMoney,
  compareMoney,
  formatMoney,
  isPositiveMoney,
  parseMoney,
  subtractMoney,
  sumMoney,
} from './money.js'

describe('parseMoney', () => {
  it.each(['10.00', '1500.50', '0.01'])('aceita "%s"', (value) => {
    expect(() => parseMoney(value)).not.toThrow()
  })

  it.each(['10.999', '-15.00', 'abc', 'NaN', 'Infinity', '10', '10.5', ''])(
    'rejeita "%s"',
    (value) => {
      expect(() => parseMoney(value)).toThrow(InvalidMoneyAmountError)
    },
  )

  it('converte corretamente para centavos', () => {
    expect(parseMoney('10.00')).toBe(1000n)
    expect(parseMoney('1500.50')).toBe(150050n)
    expect(parseMoney('0.01')).toBe(1n)
  })
})

describe('formatMoney', () => {
  it('converte centavos de volta para decimal', () => {
    expect(formatMoney(1000n)).toBe('10.00')
    expect(formatMoney(150050n)).toBe('1500.50')
    expect(formatMoney(1n)).toBe('0.01')
    expect(formatMoney(0n)).toBe('0.00')
  })

  it('é o inverso de parseMoney (round-trip)', () => {
    for (const value of ['10.00', '1500.50', '0.01', '999999.99']) {
      expect(formatMoney(parseMoney(value))).toBe(value)
    }
  })

  it('formata valores negativos com sinal', () => {
    expect(formatMoney(-1000n)).toBe('-10.00')
  })
})

describe('aritmética', () => {
  it('soma e subtrai sem perda de precisão', () => {
    expect(addMoney(parseMoney('10.00'), parseMoney('0.01'))).toBe(1001n)
    expect(subtractMoney(parseMoney('10.00'), parseMoney('0.01'))).toBe(999n)
  })

  it('soma uma lista de valores', () => {
    const values = ['10.00', '20.50', '0.01'].map(parseMoney)
    expect(sumMoney(values)).toBe(3051n)
  })

  it('soma lista vazia retorna zero', () => {
    expect(sumMoney([])).toBe(0n)
  })

  it('compara valores', () => {
    expect(compareMoney(100n, 200n)).toBe(-1)
    expect(compareMoney(200n, 100n)).toBe(1)
    expect(compareMoney(100n, 100n)).toBe(0)
  })
})

describe('validação de positividade', () => {
  it('isPositiveMoney rejeita zero e negativos', () => {
    expect(isPositiveMoney(0n)).toBe(false)
    expect(isPositiveMoney(-1n)).toBe(false)
    expect(isPositiveMoney(1n)).toBe(true)
  })

  it('assertPositiveMoney lança para valores não positivos', () => {
    expect(() => assertPositiveMoney(0n, 'expected_amount')).toThrow(InvalidMoneyAmountError)
    expect(() => assertPositiveMoney(-100n, 'expected_amount')).toThrow(InvalidMoneyAmountError)
    expect(() => assertPositiveMoney(100n, 'expected_amount')).not.toThrow()
  })
})
