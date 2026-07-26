import {
  calculateMonthlySummary,
  type Category,
  type FinancialEntry,
  type FinancialEntryStatus,
  type FinancialEntryType,
  type Money,
  type MonthlyPeriod,
  type MonthlyPeriodStatus,
} from '@finanhouse/domain'
import { ENTRY_STATUS_LABELS } from './financial-entries-view-model.ts'
import { formatDatePtBrShort, parseIsoDate } from '../utils/format-date-pt-br.ts'
import { formatMoneyPtBr } from '../utils/format-money-pt-br.ts'

export type HistoryYearFilter = 'all' | number
export type HistoryPeriodStatusFilter = 'all' | MonthlyPeriodStatus
export type HistoryEntryStatusFilter = 'all' | FinancialEntryStatus

export interface HistoryFilters {
  year: HistoryYearFilter
  periodStatus: HistoryPeriodStatusFilter
  entryStatus: HistoryEntryStatusFilter
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  year: 'all',
  periodStatus: 'all',
  entryStatus: 'all',
}

export interface HistoryValueViewModel {
  raw: Money
  label: string
}

export interface HistoryPeriodOptionViewModel {
  id: number
  label: string
  year: number
  status: MonthlyPeriodStatus
  statusLabel: string
}

export interface HistoryEntryRowViewModel {
  id: number
  description: string
  categoryName: string
  entryType: FinancialEntryType
  status: FinancialEntryStatus
  statusLabel: string
  dateLabel: string
  amountLabel: string
}

export interface HistorySummaryViewModel {
  realizedIncome: HistoryValueViewModel
  realizedExpense: HistoryValueViewModel
  realizedBalance: HistoryValueViewModel
  projectedBalance: HistoryValueViewModel
}

export interface HistoryStatusCountsViewModel {
  planned: number
  pending: number
  realized: number
  cancelled: number
}

export interface HistoryViewModel {
  isEmpty: boolean
  emptyTitle: string | null
  emptyDescription: string | null
  availableYears: number[]
  periodStatusOptions: Array<{ value: HistoryPeriodStatusFilter; label: string }>
  entryStatusOptions: Array<{ value: HistoryEntryStatusFilter; label: string }>
  periods: HistoryPeriodOptionViewModel[]
  selectedPeriod: HistoryPeriodOptionViewModel | null
  summary: HistorySummaryViewModel | null
  statusCounts: HistoryStatusCountsViewModel | null
  entries: HistoryEntryRowViewModel[]
  entriesEmptyMessage: string | null
  accessibleSummary: string
}

export interface BuildHistoryViewModelInput {
  periods: MonthlyPeriod[]
  entries: FinancialEntry[]
  categories: Category[]
  selectedPeriodId: number | null
  filters: HistoryFilters
}

const monthLongFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

const PERIOD_STATUS_LABELS: Record<MonthlyPeriodStatus, string> = {
  open: 'Aberta',
  review: 'Em revisão',
  closed: 'Fechada',
}

const PERIOD_STATUS_OPTIONS: Array<{ value: HistoryPeriodStatusFilter; label: string }> = [
  { value: 'all', label: 'Todas as competências' },
  { value: 'open', label: 'Aberta' },
  { value: 'review', label: 'Em revisão' },
  { value: 'closed', label: 'Fechada' },
]

const ENTRY_STATUS_OPTIONS: Array<{ value: HistoryEntryStatusFilter; label: string }> = [
  { value: 'all', label: 'Todos os status' },
  { value: 'planned', label: ENTRY_STATUS_LABELS.planned },
  { value: 'pending', label: ENTRY_STATUS_LABELS.pending },
  { value: 'realized', label: ENTRY_STATUS_LABELS.realized },
  { value: 'cancelled', label: ENTRY_STATUS_LABELS.cancelled },
]

function periodYear(period: MonthlyPeriod): number {
  return Number(period.referenceMonth.slice(0, 4))
}

function periodLabel(period: MonthlyPeriod): string {
  return monthLongFormatter.format(parseIsoDate(period.referenceMonth))
}

function categoryName(categories: Category[], categoryId: number): string {
  return categories.find((category) => category.id === categoryId)?.name ?? 'Sem categoria'
}

function value(raw: Money): HistoryValueViewModel {
  return { raw, label: formatMoneyPtBr(raw) }
}

function signedAmountLabel(entryType: FinancialEntryType, amount: Money): string {
  return formatMoneyPtBr(entryType === 'expense' ? -amount : amount)
}

export function sortPeriodsByReferenceMonthDesc(periods: MonthlyPeriod[]): MonthlyPeriod[] {
  return [...periods].sort((a, b) => (a.referenceMonth < b.referenceMonth ? 1 : a.referenceMonth > b.referenceMonth ? -1 : 0))
}

export function buildAvailableHistoryYears(periods: MonthlyPeriod[]): number[] {
  return [...new Set(periods.map(periodYear))].sort((a, b) => b - a)
}

function buildPeriodOption(period: MonthlyPeriod): HistoryPeriodOptionViewModel {
  return { id: period.id, label: periodLabel(period), year: periodYear(period), status: period.status, statusLabel: PERIOD_STATUS_LABELS[period.status] }
}

function buildStatusCounts(entries: FinancialEntry[], periodId: number): HistoryStatusCountsViewModel {
  const relevant = entries.filter((entry) => entry.periodId === periodId)
  return {
    planned: relevant.filter((entry) => entry.status === 'planned').length,
    pending: relevant.filter((entry) => entry.status === 'pending').length,
    realized: relevant.filter((entry) => entry.status === 'realized').length,
    cancelled: relevant.filter((entry) => entry.status === 'cancelled').length,
  }
}

function buildEntryRows(entries: FinancialEntry[], categories: Category[], periodId: number, entryStatusFilter: HistoryEntryStatusFilter): HistoryEntryRowViewModel[] {
  const relevant = entries.filter((entry) => entry.periodId === periodId && (entryStatusFilter === 'all' || entry.status === entryStatusFilter))

  return [...relevant]
    .sort((a, b) => {
      const dateA = a.realizationDate ?? a.dueDate ?? ''
      const dateB = b.realizationDate ?? b.dueDate ?? ''
      return dateA < dateB ? 1 : dateA > dateB ? -1 : 0
    })
    .map((entry) => {
      const date = entry.realizationDate ?? entry.dueDate
      const amount = entry.status === 'realized' ? (entry.actualAmount ?? entry.expectedAmount) : entry.expectedAmount
      return {
        id: entry.id,
        description: entry.description,
        categoryName: categoryName(categories, entry.categoryId),
        entryType: entry.entryType,
        status: entry.status,
        statusLabel: ENTRY_STATUS_LABELS[entry.status],
        dateLabel: date ? formatDatePtBrShort(date) : 'Sem data',
        amountLabel: signedAmountLabel(entry.entryType, amount),
      }
    })
}

function emptyViewModel(title: string, description: string): HistoryViewModel {
  return {
    isEmpty: true,
    emptyTitle: title,
    emptyDescription: description,
    availableYears: [],
    periodStatusOptions: PERIOD_STATUS_OPTIONS,
    entryStatusOptions: ENTRY_STATUS_OPTIONS,
    periods: [],
    selectedPeriod: null,
    summary: null,
    statusCounts: null,
    entries: [],
    entriesEmptyMessage: null,
    accessibleSummary: description,
  }
}

/**
 * View-model puro do Histórico — estritamente consultivo: recebe
 * competências, movimentações, categorias, competência selecionada e
 * filtros por argumento; nunca lê fixtures/Context/`localStorage`
 * diretamente e nunca expõe nenhuma ação de mutação. Reaproveita
 * `calculateMonthlySummary` (`@finanhouse/domain`) para o resumo financeiro
 * — nenhuma fórmula reimplementada aqui.
 */
export function buildHistoryViewModel(input: BuildHistoryViewModelInput): HistoryViewModel {
  const availableYears = buildAvailableHistoryYears(input.periods)
  if (input.periods.length === 0) {
    return emptyViewModel('Histórico indisponível', 'Nenhuma competência registrada ainda.')
  }

  const allPeriodsDesc = sortPeriodsByReferenceMonthDesc(input.periods).map(buildPeriodOption)
  const filteredPeriods = allPeriodsDesc.filter(
    (period) =>
      (input.filters.year === 'all' || period.year === input.filters.year) &&
      (input.filters.periodStatus === 'all' || period.status === input.filters.periodStatus),
  )

  if (filteredPeriods.length === 0) {
    return {
      ...emptyViewModel('Nenhuma competência encontrada', 'Nenhuma competência corresponde aos filtros atuais. Ajuste o ano ou o status para ver o histórico.'),
      availableYears,
      periods: [],
    }
  }

  const selectedPeriod =
    filteredPeriods.find((period) => period.id === input.selectedPeriodId) ?? filteredPeriods[0]!

  const summaryData = calculateMonthlySummary(selectedPeriod.id, input.entries)
  const summary: HistorySummaryViewModel = {
    realizedIncome: value(summaryData.realizedIncome),
    realizedExpense: value(summaryData.realizedExpense),
    realizedBalance: value(summaryData.realizedBalance),
    projectedBalance: value(summaryData.projectedBalance),
  }

  const statusCounts = buildStatusCounts(input.entries, selectedPeriod.id)
  const entries = buildEntryRows(input.entries, input.categories, selectedPeriod.id, input.filters.entryStatus)

  const entriesEmptyMessage =
    entries.length === 0
      ? input.filters.entryStatus === 'all'
        ? 'Nenhuma movimentação registrada nesta competência.'
        : 'Nenhuma movimentação corresponde ao status selecionado nesta competência.'
      : null

  const accessibleSummary = `Histórico de ${selectedPeriod.label} (${selectedPeriod.statusLabel}): receita realizada ${summary.realizedIncome.label}, despesa realizada ${summary.realizedExpense.label}, saldo realizado ${summary.realizedBalance.label}, fechamento projetado ${summary.projectedBalance.label}. ${statusCounts.planned} planejada(s), ${statusCounts.pending} pendente(s), ${statusCounts.realized} realizada(s), ${statusCounts.cancelled} cancelada(s).`

  return {
    isEmpty: false,
    emptyTitle: null,
    emptyDescription: null,
    availableYears,
    periodStatusOptions: PERIOD_STATUS_OPTIONS,
    entryStatusOptions: ENTRY_STATUS_OPTIONS,
    periods: filteredPeriods,
    selectedPeriod,
    summary,
    statusCounts,
    entries,
    entriesEmptyMessage,
    accessibleSummary,
  }
}
