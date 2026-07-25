import {
  calculateMonthlySummary,
  compareMonthlyPeriods,
  type FinancialEntry,
  type FinancialEntryStatus,
  type Money,
  type MonthlyPeriod,
  type MonthlyPeriodStatus,
} from '@finanhouse/domain'
import {
  FIXTURE_CURRENT_PERIOD_ID,
  FIXTURE_PREVIOUS_PERIOD_ID,
  fixtureCategories,
  fixtureFinancialEntries,
  fixtureMonthlyPeriods,
} from '../data/dashboard-fixtures.ts'
import { formatMoneyPtBr } from '../utils/format-money-pt-br.ts'

/**
 * View-model do dashboard: única camada que lê as fixtures e as funções
 * puras de `@finanhouse/domain`. Componentes React não devem importar as
 * fixtures diretamente nem recalcular valores monetários — apenas
 * consumir o resultado desta função.
 */

export interface PeriodOverviewViewModel {
  referenceMonthLabel: string
  status: MonthlyPeriodStatus
  statusLabel: string
  contextText: string
}

export type IndicatorTone = 'income' | 'expense'

export interface IndicatorCardViewModel {
  key: 'realizedIncome' | 'realizedExpense' | 'realizedBalance' | 'projectedBalance'
  title: string
  value: string
  secondaryText: string
  tone: IndicatorTone
}

export interface EvolutionPointViewModel {
  periodId: number
  monthLabel: string
  income: Money
  expense: Money
}

export interface CategoryBreakdownItemViewModel {
  categoryId: number
  name: string
  amountLabel: string
  percent: number
}

export interface RecentEntryViewModel {
  id: number
  description: string
  categoryName: string
  entryType: 'income' | 'expense'
  status: FinancialEntryStatus
  statusLabel: string
  dateLabel: string
  amountLabel: string
}

export interface UpcomingEntryViewModel {
  id: number
  description: string
  categoryName: string
  dueDateLabel: string
  amountLabel: string
}

export interface DashboardViewModel {
  periodOverview: PeriodOverviewViewModel
  indicators: IndicatorCardViewModel[]
  evolution: EvolutionPointViewModel[]
  categoryBreakdown: CategoryBreakdownItemViewModel[]
  recentEntries: RecentEntryViewModel[]
  upcomingEntries: UpcomingEntryViewModel[]
}

// timeZone: 'UTC' é obrigatório aqui — sem ele, o formatador usa o fuso
// horário local do ambiente de execução, que pode "voltar" a meia-noite UTC
// para o dia (e mês) anterior dependendo de onde o código roda.
const monthShortFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
const monthLongFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dayShortFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })

/** Datas de domínio são "YYYY-MM-DD"; construir em UTC evita deslocamento de fuso. */
function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

const STATUS_LABELS: Record<MonthlyPeriodStatus, string> = {
  open: 'Aberta',
  review: 'Em revisão',
  closed: 'Fechada',
}

const PERIOD_CONTEXT_BY_STATUS: Record<MonthlyPeriodStatus, string> = {
  open: 'A competência está aberta — movimentações podem ser criadas e ajustadas livremente.',
  review: 'A competência está em revisão — confira as movimentações pendentes antes de fechar o mês.',
  closed: 'A competência está fechada — os totais deste mês não devem mais mudar.',
}

const ENTRY_STATUS_LABELS: Record<FinancialEntryStatus, string> = {
  planned: 'Planejado',
  pending: 'Pendente',
  realized: 'Realizado',
  cancelled: 'Cancelado',
}

function categoryName(categoryId: number): string {
  return fixtureCategories.find((category) => category.id === categoryId)?.name ?? 'Sem categoria'
}

function buildPeriodOverview(currentPeriod: MonthlyPeriod): PeriodOverviewViewModel {
  return {
    referenceMonthLabel: monthLongFormatter.format(parseIsoDate(currentPeriod.referenceMonth)),
    status: currentPeriod.status,
    statusLabel: STATUS_LABELS[currentPeriod.status],
    contextText: PERIOD_CONTEXT_BY_STATUS[currentPeriod.status],
  }
}

function percentLabel(percent: number | null): string {
  if (percent === null) return 'Sem base de comparação com o mês anterior'
  const sign = percent > 0 ? '+' : ''
  const formatted = percent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sign}${formatted}% vs. mês anterior`
}

function buildIndicators(): IndicatorCardViewModel[] {
  const currentSummary = calculateMonthlySummary(FIXTURE_CURRENT_PERIOD_ID, fixtureFinancialEntries)
  const comparison = compareMonthlyPeriods(
    { periodId: FIXTURE_PREVIOUS_PERIOD_ID, entries: fixtureFinancialEntries },
    { periodId: FIXTURE_CURRENT_PERIOD_ID, entries: fixtureFinancialEntries },
  )

  return [
    {
      key: 'realizedIncome',
      title: 'Receitas realizadas',
      value: formatMoneyPtBr(currentSummary.realizedIncome),
      secondaryText: percentLabel(comparison.incomeChange.percent),
      tone: 'income',
    },
    {
      key: 'realizedExpense',
      title: 'Despesas realizadas',
      value: formatMoneyPtBr(currentSummary.realizedExpense),
      secondaryText: percentLabel(comparison.expenseChange.percent),
      tone: 'expense',
    },
    {
      key: 'realizedBalance',
      title: 'Saldo realizado',
      value: formatMoneyPtBr(currentSummary.realizedBalance),
      secondaryText: percentLabel(comparison.realizedBalanceChange.percent),
      tone: currentSummary.realizedBalance >= 0n ? 'income' : 'expense',
    },
    {
      key: 'projectedBalance',
      title: 'Fechamento projetado',
      value: formatMoneyPtBr(currentSummary.projectedBalance),
      secondaryText: 'Considera pendentes e planejados além do realizado',
      tone: currentSummary.projectedBalance >= 0n ? 'income' : 'expense',
    },
  ]
}

function buildEvolution(): EvolutionPointViewModel[] {
  return fixtureMonthlyPeriods.map((period) => {
    const summary = calculateMonthlySummary(period.id, fixtureFinancialEntries)
    return {
      periodId: period.id,
      monthLabel: monthShortFormatter.format(parseIsoDate(period.referenceMonth)),
      income: summary.realizedIncome,
      expense: summary.realizedExpense,
    }
  })
}

function buildCategoryBreakdown(): CategoryBreakdownItemViewModel[] {
  const totals = new Map<number, bigint>()
  for (const entry of fixtureFinancialEntries) {
    if (entry.periodId !== FIXTURE_CURRENT_PERIOD_ID) continue
    if (entry.entryType !== 'expense') continue
    if (entry.status === 'cancelled') continue
    const amount = entry.status === 'realized' ? (entry.actualAmount ?? 0n) : entry.expectedAmount
    totals.set(entry.categoryId, (totals.get(entry.categoryId) ?? 0n) + amount)
  }

  const totalExpense = [...totals.values()].reduce((sum, value) => sum + value, 0n)

  return [...totals.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categoryName(categoryId),
      amountLabel: formatMoneyPtBr(amount),
      percent: totalExpense === 0n ? 0 : Math.round((Number(amount) / Number(totalExpense)) * 1000) / 10,
    }))
    .sort((a, b) => b.percent - a.percent)
}

function signedAmountLabel(entryType: FinancialEntry['entryType'], amount: Money): string {
  return formatMoneyPtBr(entryType === 'expense' ? -amount : amount)
}

function buildRecentEntries(): RecentEntryViewModel[] {
  const candidates = fixtureFinancialEntries.filter(
    (entry) => entry.periodId === FIXTURE_CURRENT_PERIOD_ID || entry.periodId === FIXTURE_PREVIOUS_PERIOD_ID,
  )

  return [...candidates]
    .sort((a, b) => {
      const dateA = a.realizationDate ?? a.dueDate ?? ''
      const dateB = b.realizationDate ?? b.dueDate ?? ''
      return dateA < dateB ? 1 : dateA > dateB ? -1 : 0
    })
    .slice(0, 6)
    .map((entry) => {
      const date = entry.realizationDate ?? entry.dueDate
      const amount = entry.status === 'realized' ? (entry.actualAmount ?? entry.expectedAmount) : entry.expectedAmount
      return {
        id: entry.id,
        description: entry.description,
        categoryName: categoryName(entry.categoryId),
        entryType: entry.entryType,
        status: entry.status,
        statusLabel: ENTRY_STATUS_LABELS[entry.status],
        dateLabel: date ? dayShortFormatter.format(parseIsoDate(date)) : '—',
        amountLabel: signedAmountLabel(entry.entryType, amount),
      }
    })
}

function buildUpcomingEntries(): UpcomingEntryViewModel[] {
  return fixtureFinancialEntries
    .filter(
      (entry): entry is FinancialEntry & { dueDate: string } =>
        entry.periodId === FIXTURE_CURRENT_PERIOD_ID && entry.status === 'pending' && entry.dueDate !== null,
    )
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
    .map((entry) => ({
      id: entry.id,
      description: entry.description,
      categoryName: categoryName(entry.categoryId),
      dueDateLabel: dayShortFormatter.format(parseIsoDate(entry.dueDate)),
      amountLabel: signedAmountLabel(entry.entryType, entry.expectedAmount),
    }))
}

export function buildDashboardViewModel(): DashboardViewModel {
  const currentPeriod = fixtureMonthlyPeriods.find((period) => period.id === FIXTURE_CURRENT_PERIOD_ID)
  if (!currentPeriod) {
    throw new Error('Fixture inconsistente: competência atual não encontrada.')
  }

  return {
    periodOverview: buildPeriodOverview(currentPeriod),
    indicators: buildIndicators(),
    evolution: buildEvolution(),
    categoryBreakdown: buildCategoryBreakdown(),
    recentEntries: buildRecentEntries(),
    upcomingEntries: buildUpcomingEntries(),
  }
}
