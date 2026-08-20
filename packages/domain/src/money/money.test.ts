import { describe, expect, it } from 'vitest'
import { InvalidMoneyAmountError } from '../errors/domain-errors.js'
import {
  addMoney,
  assertPositiveMoney,
  compareMoney,
  formatMoney,
  isPositiveMoney,
  parseMoney,
  splitMoney,
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

describe('splitMoney', () => {
  it('divide um valor exatamente divisível em partes iguais', () => {
    expect(splitMoney(parseMoney('300.00'), 3)).toEqual([10000n, 10000n, 10000n])
  })

  it('a última parcela absorve todo o resto (exemplo do enunciado: R$ 1.000,00 em 3x)', () => {
    expect(splitMoney(parseMoney('1000.00'), 3)).toEqual([33333n, 33333n, 33334n])
  })

  it('R$ 10,00 em 3x — resto de 1 centavo absorvido só pela última', () => {
    expect(splitMoney(parseMoney('10.00'), 3)).toEqual([333n, 333n, 334n])
  })

  it('resto maior que 1 centavo ainda é absorvido inteiramente só pela última parcela', () => {
    // 100000 centavos / 7 = 14285, resto 5 — a última parcela recebe 14285 + 5 = 14290, nunca espalhado.
    const parts = splitMoney(100000n, 7)
    expect(parts.slice(0, -1).every((value) => value === 14285n)).toBe(true)
    expect(parts.at(-1)).toBe(14290n)
  })

  it('soma das parcelas é sempre exatamente igual ao total, para uma faixa ampla de total/n', () => {
    for (const total of [parseMoney('1.00'), parseMoney('1000.00'), parseMoney('3000.00'), parseMoney('999999.99'), 1n, 7n]) {
      for (let n = 1; n <= 24; n++) {
        const parts = splitMoney(total, n)
        expect(parts).toHaveLength(n)
        expect(sumMoney(parts)).toBe(total)
      }
    }
  })

  it('com parts = 1, devolve o total inteiro numa única parcela', () => {
    expect(splitMoney(parseMoney('50.00'), 1)).toEqual([5000n])
  })

  it('rejeita total não positivo', () => {
    expect(() => splitMoney(0n, 3)).toThrow(InvalidMoneyAmountError)
    expect(() => splitMoney(-100n, 3)).toThrow(InvalidMoneyAmountError)
  })

  it('rejeita parts não positivo ou não inteiro', () => {
    expect(() => splitMoney(1000n, 0)).toThrow(InvalidMoneyAmountError)
    expect(() => splitMoney(1000n, -1)).toThrow(InvalidMoneyAmountError)
    expect(() => splitMoney(1000n, 1.5)).toThrow(InvalidMoneyAmountError)
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
