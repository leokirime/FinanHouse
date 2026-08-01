function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Competência civil (`YYYY-MM-01`) do instante informado (padrão: agora),
 * usando o **calendário local** do navegador (`getFullYear`/`getMonth`) —
 * nunca `getUTCFullYear`/`getUTCMonth`, que "voltariam" para o mês anterior
 * perto da virada do dia dependendo do fuso horário do usuário.
 */
export function getCurrentReferenceMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`
}

/** Competência civil imediatamente anterior a `referenceMonth` (`YYYY-MM-01`). */
export function getPreviousReferenceMonth(referenceMonth: string): string {
  const [year, month] = referenceMonth.split('-').map(Number)
  const previous = new Date(year, month - 1 - 1, 1)
  return `${previous.getFullYear()}-${pad2(previous.getMonth() + 1)}-01`
}
