import { InvalidMoneyAmountError } from '../errors/domain-errors.js'

/**
 * Dinheiro é sempre representado internamente em centavos, como `bigint` —
 * nunca `number`/`float`, para evitar erro de arredondamento em cálculos
 * financeiros. A conversão para/de string decimal (o formato usado na
 * fronteira de persistência, DECIMAL(13,2)) só acontece em `parseMoney` e
 * `formatMoney`.
 */
export type Money = bigint

const DECIMAL_STRING_PATTERN = /^\d+\.\d{2}$/

/**
 * Converte uma string decimal ("10.00", "1500.50") em centavos.
 * Exige exatamente duas casas decimais e nenhum sinal — valores monetários
 * de domínio são sempre não negativos; sinal (receita/despesa) vem de
 * `entryType`, não do valor.
 */
export function parseMoney(decimal: string): Money {
  if (!DECIMAL_STRING_PATTERN.test(decimal)) {
    throw new InvalidMoneyAmountError(
      `Valor monetário inválido: "${decimal}". Use o formato "0.00", com exatamente duas casas decimais e sem sinal.`,
    )
  }
  const [whole, cents] = decimal.split('.')
  return BigInt(whole) * 100n + BigInt(cents)
}

/** Converte centavos de volta para a representação decimal ("10.00"). */
export function formatMoney(cents: Money): string {
  const negative = cents < 0n
  const abs = negative ? -cents : cents
  const whole = abs / 100n
  const remainder = abs % 100n
  return `${negative ? '-' : ''}${whole.toString()}.${remainder.toString().padStart(2, '0')}`
}

export function addMoney(a: Money, b: Money): Money {
  return a + b
}

export function subtractMoney(a: Money, b: Money): Money {
  return a - b
}

export function sumMoney(values: Money[]): Money {
  return values.reduce((total, value) => total + value, 0n)
}

/** -1 se a < b, 0 se iguais, 1 se a > b. */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function isPositiveMoney(cents: Money): boolean {
  return cents > 0n
}

/** Lança InvalidMoneyAmountError se o valor não for estritamente positivo. */
export function assertPositiveMoney(cents: Money, fieldName: string): void {
  if (!isPositiveMoney(cents)) {
    throw new InvalidMoneyAmountError(`${fieldName} deve ser positivo. Recebido: ${formatMoney(cents)}.`)
  }
}

export const ZERO_MONEY: Money = 0n
