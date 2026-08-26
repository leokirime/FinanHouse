import { formatMoney, parseMoney, type Money } from '@finanhouse/domain'

/**
 * Formata centavos (`bigint`) como moeda pt-BR ("R$ 1.500,00"), reutilizando
 * `formatMoney` do domínio (decimal-safe) — nunca converte para `number`,
 * preservando precisão mesmo em valores grandes.
 */
export function formatMoneyPtBr(cents: Money): string {
  const decimal = formatMoney(cents)
  const negative = decimal.startsWith('-')
  const [wholePart, centsPart] = (negative ? decimal.slice(1) : decimal).split('.')
  const groupedWhole = BigInt(wholePart).toLocaleString('pt-BR')
  return `${negative ? '-' : ''}R$ ${groupedWhole},${centsPart}`
}

/**
 * Aceita entrada monetária no formato de digitação pt-BR — vírgula decimal,
 * ponto como separador de milhar opcional ("3000,00", "1000,50", "99,90",
 * "3.000,00") — e converte para a string decimal canônica do domínio/API
 * ("3000.00") antes de delegar a `parseMoney` (bigint-safe). Nunca usa
 * `Number`/`parseFloat` como fonte de verdade financeira; a normalização é
 * puramente textual (troca de separadores), sem nenhuma aritmética de ponto
 * flutuante envolvida.
 */
const PT_BR_MONEY_INPUT_PATTERN = /^(\d+|\d{1,3}(?:\.\d{3})+)(,\d{2})?$/

export function parseMoneyPtBr(text: string): Money {
  const trimmed = text.trim()
  if (!PT_BR_MONEY_INPUT_PATTERN.test(trimmed)) {
    throw new Error(`Formato de valor monetário pt-BR inválido: "${text}".`)
  }
  const withoutThousandsSeparators = trimmed.replace(/\./g, '')
  const canonicalDecimal = withoutThousandsSeparators.includes(',') ? withoutThousandsSeparators.replace(',', '.') : `${withoutThousandsSeparators}.00`
  return parseMoney(canonicalDecimal)
}
