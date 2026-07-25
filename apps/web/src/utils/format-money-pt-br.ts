import { formatMoney, type Money } from '@finanhouse/domain'

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
