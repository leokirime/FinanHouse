import {
  calculateMonthlySummary,
  compareMonthlyPeriods,
  type Category,
  type FinancialEntry,
  type FinancialEntryStatus,
  type Money,
  type MonthlyPeriod,
  type MonthlyPeriodStatus,
} from '@finanhouse/domain'
import { formatDatePtBrShort, parseIsoDate } from '../utils/format-date-pt-br.ts'
import { formatMoneyPtBr } from '../utils/format-money-pt-br.ts'

/**
 * View-model do dashboard: única camada que combina dados financeiros com as
 * funções puras de `@finanhouse/domain`. Não lê fixtures nem estado global
 * diretamente — recebe tudo por argumento (ver `BuildDashboardViewModelInput`),
 * para que dashboard e Movimentações sempre derivem da mesma fonte (o estado
 * compartilhado em `state/`), nunca de dados paralelos.
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

export interface BuildDashboardViewModelInput {
  entries: FinancialEntry[]
  categories: Category[]
  /** Todas as competências conhecidas — usadas para a evolução financeira (um ponto por competência). */
  periods: MonthlyPeriod[]
  currentPeriodId: number
  previousPeriodId: number
}

// timeZone: 'UTC' pelo mesmo motivo de `utils/format-date-pt-br.ts` — evita
// que o formatador "volte" para o dia/mês anterior dependendo do fuso local.
const monthShortFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
const monthLongFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

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

function findCategoryName(categories: Category[], categoryId: number): string {
  return categories.find((category) => category.id === categoryId)?.name ?? 'Sem categoria'
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

function buildIndicators(entries: FinancialEntry[], currentPeriodId: number, previousPeriodId: number): IndicatorCardViewModel[] {
  const currentSummary = calculateMonthlySummary(currentPeriodId, entries)
  const comparison = compareMonthlyPeriods(
    { periodId: previousPeriodId, entries },
    { periodId: currentPeriodId, entries },
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

function buildEvolution(entries: FinancialEntry[], periods: MonthlyPeriod[]): EvolutionPointViewModel[] {
  return periods.map((period) => {
    const summary = calculateMonthlySummary(period.id, entries)
    return {
      periodId: period.id,
      monthLabel: monthShortFormatter.format(parseIsoDate(period.referenceMonth)),
      income: summary.realizedIncome,
      expense: summary.realizedExpense,
    }
  })
}

function buildCategoryBreakdown(entries: FinancialEntry[], categories: Category[], currentPeriodId: number): CategoryBreakdownItemViewModel[] {
  const totals = new Map<number, bigint>()
  for (const entry of entries) {
    if (entry.periodId !== currentPeriodId) continue
    if (entry.entryType !== 'expense') continue
    if (entry.status === 'cancelled') continue
    const amount = entry.status === 'realized' ? (entry.actualAmount ?? 0n) : entry.expectedAmount
    totals.set(entry.categoryId, (totals.get(entry.categoryId) ?? 0n) + amount)
  }

  const totalExpense = [...totals.values()].reduce((sum, value) => sum + value, 0n)

  return [...totals.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      name: findCategoryName(categories, categoryId),
      amountLabel: formatMoneyPtBr(amount),
      percent: totalExpense === 0n ? 0 : Math.round((Number(amount) / Number(totalExpense)) * 1000) / 10,
    }))
    .sort((a, b) => b.percent - a.percent)
}

function signedAmountLabel(entryType: FinancialEntry['entryType'], amount: Money): string {
  return formatMoneyPtBr(entryType === 'expense' ? -amount : amount)
}

function buildRecentEntries(
  entries: FinancialEntry[],
  categories: Category[],
  currentPeriodId: number,
  previousPeriodId: number,
): RecentEntryViewModel[] {
  const candidates = entries.filter((entry) => entry.periodId === currentPeriodId || entry.periodId === previousPeriodId)

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
        categoryName: findCategoryName(categories, entry.categoryId),
        entryType: entry.entryType,
        status: entry.status,
        statusLabel: ENTRY_STATUS_LABELS[entry.status],
        dateLabel: date ? formatDatePtBrShort(date) : '—',
        amountLabel: signedAmountLabel(entry.entryType, amount),
      }
    })
}

function buildUpcomingEntries(entries: FinancialEntry[], categories: Category[], currentPeriodId: number): UpcomingEntryViewModel[] {
  return entries
    .filter(
      (entry): entry is FinancialEntry & { dueDate: string } =>
        entry.periodId === currentPeriodId && entry.status === 'pending' && entry.dueDate !== null,
    )
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
    .map((entry) => ({
      id: entry.id,
      description: entry.description,
      categoryName: findCategoryName(categories, entry.categoryId),
      dueDateLabel: formatDatePtBrShort(entry.dueDate),
      amountLabel: signedAmountLabel(entry.entryType, entry.expectedAmount),
    }))
}

export function buildDashboardViewModel(input: BuildDashboardViewModelInput): DashboardViewModel {
  const currentPeriod = input.periods.find((period) => period.id === input.currentPeriodId)
  if (!currentPeriod) {
    throw new Error('Estado inconsistente: competência atual não encontrada.')
  }

  return {
    periodOverview: buildPeriodOverview(currentPeriod),
    indicators: buildIndicators(input.entries, input.currentPeriodId, input.previousPeriodId),
    evolution: buildEvolution(input.entries, input.periods),
    categoryBreakdown: buildCategoryBreakdown(input.entries, input.categories, input.currentPeriodId),
    recentEntries: buildRecentEntries(input.entries, input.categories, input.currentPeriodId, input.previousPeriodId),
    upcomingEntries: buildUpcomingEntries(input.entries, input.categories, input.currentPeriodId),
  }
}
