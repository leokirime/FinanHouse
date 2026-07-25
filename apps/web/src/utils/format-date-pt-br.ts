// timeZone: 'UTC' é obrigatório aqui — sem ele, o formatador usa o fuso
// horário local do ambiente de execução, que pode "voltar" a meia-noite UTC
// para o dia (e mês) anterior dependendo de onde o código roda.
const dayShortFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })

/** Datas de domínio são "YYYY-MM-DD"; construir em UTC evita deslocamento de fuso horário. */
export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatDatePtBrShort(isoDate: string): string {
  return dayShortFormatter.format(parseIsoDate(isoDate))
}
