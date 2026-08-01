import {
  addMoney,
  buildCategoryBudgetSummaries,
  subtractMoney,
  type Category,
  type CategoryBudget,
  type CategoryBudgetStatus,
  type FinancialEntry,
  type FinancialEntryType,
  type Money,
  type MonthlyPeriod,
  ZERO_MONEY,
} from '@finanhouse/domain'
import { formatDatePtBrShort, parseIsoDate } from '../utils/format-date-pt-br.ts'
import { formatMoneyPtBr } from '../utils/format-money-pt-br.ts'

export interface PlanningPeriodOptionViewModel {
  id: number
  label: string
}

export interface PlanningValueViewModel {
  raw: Money
  label: string
}

export interface CategoryBudgetRowViewModel {
  categoryId: number
  categoryName: string
  hasLimit: boolean
  /** `id` do `CategoryBudget` real — `null` quando `hasLimit` é `false`. Necessário para editar/remover sem presumir qual é a competência atual. */
  budgetId: number | null
  limit: PlanningValueViewModel | null
  realized: PlanningValueViewModel
  pending: PlanningValueViewModel
  planned: PlanningValueViewModel
  projected: PlanningValueViewModel
  remaining: PlanningValueViewModel | null
  exceeded: PlanningValueViewModel | null
  percentConsumed: number | null
  percentLabel: string
  status: CategoryBudgetStatus
  statusLabel: string
}

export interface PlanningSummaryViewModel {
  totalLimit: PlanningValueViewModel
  totalRealized: PlanningValueViewModel
  totalPending: PlanningValueViewModel
  totalPlanned: PlanningValueViewModel
  totalProjected: PlanningValueViewModel
  totalRemaining: PlanningValueViewModel
  totalExceeded: PlanningValueViewModel
  healthyCount: number
  attentionCount: number
  exceededCount: number
  unplannedCount: number
}

export interface PlanningEntryRowViewModel {
  id: number
  categoryName: string
  description: string
  amountLabel: string
  dueDateLabel: string | null
}

export interface PlanningChartBarViewModel {
  categoryId: number
  categoryName: string
  projectedPercent: number
  status: CategoryBudgetStatus
  valueLabel: string
}

export interface PlanningChartViewModel {
  title: string
  summary: string
  bars: PlanningChartBarViewModel[]
}

export interface PlanningViewModel {
  isEmpty: boolean
  emptyTitle: string | null
  emptyDescription: string | null
  periodOptions: PlanningPeriodOptionViewModel[]
  selectedPeriod: PlanningPeriodOptionViewModel | null
  summary: PlanningSummaryViewModel | null
  rows: CategoryBudgetRowViewModel[]
  biggestRisks: CategoryBudgetRowViewModel[]
  availableCategoriesForNewBudget: { id: number; name: string }[]
  plannedEntries: PlanningEntryRowViewModel[]
  pendingEntries: PlanningEntryRowViewModel[]
  chart: PlanningChartViewModel
  accessibleSummary: string
}

export interface BuildPlanningViewModelInput {
  periods: MonthlyPeriod[]
  selectedPeriodId: number | null
  categories: Category[]
  entries: FinancialEntry[]
  budgets: CategoryBudget[]
}

const monthLongFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

const STATUS_LABELS: Record<CategoryBudgetStatus, string> = {
  healthy: 'Saudável',
  attention: 'Em atenção',
  exceeded: 'Excedido',
  unplanned: 'Sem planejamento',
}

/** Pior status primeiro — usado para ordenar a lista principal e escolher os "maiores riscos". */
const STATUS_SEVERITY_ORDER: Record<CategoryBudgetStatus, number> = { exceeded: 0, attention: 1, unplanned: 2, healthy: 3 }

function periodLabel(period: MonthlyPeriod): string {
  return monthLongFormatter.format(parseIsoDate(period.referenceMonth))
}

export function sortPeriodsByReferenceMonthDesc(periods: MonthlyPeriod[]): MonthlyPeriod[] {
  return [...periods].sort((a, b) => (a.referenceMonth < b.referenceMonth ? 1 : a.referenceMonth > b.referenceMonth ? -1 : 0))
}

export function buildPlanningPeriodOptions(periods: MonthlyPeriod[]): PlanningPeriodOptionViewModel[] {
  return sortPeriodsByReferenceMonthDesc(periods).map((period) => ({ id: period.id, label: periodLabel(period) }))
}

function categoryName(categories: Category[], categoryId: number): string {
  return categories.find((category) => category.id === categoryId)?.name ?? 'Sem categoria'
}

function value(raw: Money): PlanningValueViewModel {
  return { raw, label: formatMoneyPtBr(raw) }
}

function percentLabel(percent: number | null): string {
  if (percent === null) return 'Sem limite definido'
  const formatted = percent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatted}%`
}

function buildRow(
  summary: ReturnType<typeof buildCategoryBudgetSummaries>[number],
  categories: Category[],
  periodId: number,
  budgets: CategoryBudget[],
): CategoryBudgetRowViewModel {
  const budget = budgets.find((candidate) => candidate.periodId === periodId && candidate.categoryId === summary.categoryId) ?? null
  return {
    categoryId: summary.categoryId,
    categoryName: categoryName(categories, summary.categoryId),
    hasLimit: summary.limitAmount !== null,
    budgetId: budget?.id ?? null,
    limit: summary.limitAmount !== null ? value(summary.limitAmount) : null,
    realized: value(summary.realizedAmount),
    pending: value(summary.pendingAmount),
    planned: value(summary.plannedAmount),
    projected: value(summary.projectedAmount),
    remaining: summary.remainingAmount !== null ? value(summary.remainingAmount) : null,
    exceeded: summary.exceededAmount !== null ? value(summary.exceededAmount) : null,
    percentConsumed: summary.percentConsumed,
    percentLabel: percentLabel(summary.percentConsumed),
    status: summary.status,
    statusLabel: STATUS_LABELS[summary.status],
  }
}

function sortRows(rows: CategoryBudgetRowViewModel[]): CategoryBudgetRowViewModel[] {
  return [...rows].sort((a, b) => {
    const severityDiff = STATUS_SEVERITY_ORDER[a.status] - STATUS_SEVERITY_ORDER[b.status]
    if (severityDiff !== 0) return severityDiff
    const percentA = a.percentConsumed ?? -1
    const percentB = b.percentConsumed ?? -1
    return percentB - percentA
  })
}

function buildSummary(rows: CategoryBudgetRowViewModel[]): PlanningSummaryViewModel {
  let totalLimit = ZERO_MONEY
  let totalRealized = ZERO_MONEY
  let totalPending = ZERO_MONEY
  let totalPlanned = ZERO_MONEY
  let totalProjected = ZERO_MONEY
  let totalRemaining = ZERO_MONEY
  let totalExceeded = ZERO_MONEY
  let healthyCount = 0
  let attentionCount = 0
  let exceededCount = 0
  let unplannedCount = 0

  for (const row of rows) {
    if (row.limit) totalLimit = addMoney(totalLimit, row.limit.raw)
    totalRealized = addMoney(totalRealized, row.realized.raw)
    totalPending = addMoney(totalPending, row.pending.raw)
    totalPlanned = addMoney(totalPlanned, row.planned.raw)
    totalProjected = addMoney(totalProjected, row.projected.raw)
    if (row.remaining) totalRemaining = addMoney(totalRemaining, row.remaining.raw)
    if (row.exceeded) totalExceeded = addMoney(totalExceeded, row.exceeded.raw)

    if (row.status === 'healthy') healthyCount += 1
    else if (row.status === 'attention') attentionCount += 1
    else if (row.status === 'exceeded') exceededCount += 1
    else unplannedCount += 1
  }

  return {
    totalLimit: value(totalLimit),
    totalRealized: value(totalRealized),
    totalPending: value(totalPending),
    totalPlanned: value(totalPlanned),
    totalProjected: value(totalProjected),
    totalRemaining: value(totalRemaining),
    totalExceeded: value(totalExceeded),
    healthyCount,
    attentionCount,
    exceededCount,
    unplannedCount,
  }
}

function buildChart(rows: CategoryBudgetRowViewModel[]): PlanningChartViewModel {
  const budgeted = rows.filter((row): row is CategoryBudgetRowViewModel & { limit: PlanningValueViewModel } => row.limit !== null)

  const bars: PlanningChartBarViewModel[] = budgeted.map((row) => {
    const projectedPercent = row.limit.raw > ZERO_MONEY ? Math.round((Number(row.projected.raw) / Number(row.limit.raw)) * 100) : 0
    return {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      projectedPercent,
      status: row.status,
      valueLabel: `${row.projected.label} de ${row.limit.label}`,
    }
  })

  const summary =
    bars.length > 0
      ? bars.map((bar) => `${bar.categoryName}: ${bar.valueLabel} (${bar.projectedPercent}%)`).join('. ')
      : 'Nenhuma categoria com limite definido nesta competência.'

  return { title: 'Consumo do limite por categoria', summary, bars }
}

export function buildEntryRows(
  entries: FinancialEntry[],
  categories: Category[],
  periodId: number,
  status: 'planned' | 'pending',
  entryType: FinancialEntryType = 'expense',
): PlanningEntryRowViewModel[] {
  return entries
    .filter((entry) => entry.periodId === periodId && entry.entryType === entryType && entry.status === status)
    .map((entry) => ({
      id: entry.id,
      categoryName: categoryName(categories, entry.categoryId),
      description: entry.description,
      amountLabel: formatMoneyPtBr(entry.expectedAmount),
      dueDateLabel: entry.dueDate ? formatDatePtBrShort(entry.dueDate) : null,
    }))
}

export interface PlanningRealSummaryViewModel {
  incomePlanned: PlanningValueViewModel
  incomePending: PlanningValueViewModel
  incomeProjected: PlanningValueViewModel
  expensePlanned: PlanningValueViewModel
  expensePending: PlanningValueViewModel
  expenseRealized: PlanningValueViewModel
  expenseProjected: PlanningValueViewModel
  projectedBalance: PlanningValueViewModel
}

/**
 * Resumo do Planejamento usando exclusivamente movimentações reais
 * (`planned`/`pending`/`realized`, nunca `cancelled`) — não depende de
 * `CategoryBudget` (limite por categoria, ainda sem persistência própria).
 * Receita vem direto das movimentações; despesa reaproveita o resumo por
 * categoria já calculado por `buildCategoryBudgetSummaries` (sempre chamado
 * aqui com `budgets: []`).
 */
export function buildPlanningRealSummary(entries: FinancialEntry[], periodId: number, expenseSummary: PlanningSummaryViewModel): PlanningRealSummaryViewModel {
  let incomePlanned = ZERO_MONEY
  let incomePending = ZERO_MONEY
  for (const entry of entries) {
    if (entry.periodId !== periodId || entry.entryType !== 'income') continue
    if (entry.status === 'planned') incomePlanned = addMoney(incomePlanned, entry.expectedAmount)
    else if (entry.status === 'pending') incomePending = addMoney(incomePending, entry.expectedAmount)
  }

  const incomeProjected = addMoney(incomePlanned, incomePending)
  const projectedBalance = subtractMoney(incomeProjected, expenseSummary.totalProjected.raw)

  return {
    incomePlanned: value(incomePlanned),
    incomePending: value(incomePending),
    incomeProjected: value(incomeProjected),
    expensePlanned: expenseSummary.totalPlanned,
    expensePending: expenseSummary.totalPending,
    expenseRealized: expenseSummary.totalRealized,
    expenseProjected: expenseSummary.totalProjected,
    projectedBalance: value(projectedBalance),
  }
}

function emptyViewModel(options: PlanningPeriodOptionViewModel[], title: string, description: string): PlanningViewModel {
  return {
    isEmpty: true,
    emptyTitle: title,
    emptyDescription: description,
    periodOptions: options,
    selectedPeriod: null,
    summary: null,
    rows: [],
    biggestRisks: [],
    availableCategoriesForNewBudget: [],
    plannedEntries: [],
    pendingEntries: [],
    chart: { title: 'Consumo do limite por categoria', summary: description, bars: [] },
    accessibleSummary: description,
  }
}

/**
 * View-model puro do Planejamento: recebe competências, categorias,
 * movimentações, limites e a competência selecionada por argumento — nunca
 * lê fixtures, Context, `localStorage` ou rede diretamente. Todo cálculo
 * financeiro vem de `@finanhouse/domain` (`buildCategoryBudgetSummaries`);
 * este arquivo só formata e ordena para exibição.
 */
export function buildPlanningViewModel(input: BuildPlanningViewModelInput): PlanningViewModel {
  const periodOptions = buildPlanningPeriodOptions(input.periods)
  if (periodOptions.length === 0) {
    return emptyViewModel(
      periodOptions,
      'Planejamento indisponível',
      'Cadastre ao menos uma competência para montar o planejamento.',
    )
  }

  const selectedPeriod = periodOptions.find((option) => option.id === input.selectedPeriodId) ?? periodOptions[0]!

  const summaries = buildCategoryBudgetSummaries(selectedPeriod.id, input.entries, input.categories, input.budgets)
  const rows = sortRows(summaries.map((summary) => buildRow(summary, input.categories, selectedPeriod.id, input.budgets)))
  const summary = buildSummary(rows)
  const biggestRisks = rows.filter((row) => row.status === 'exceeded' || row.status === 'attention').slice(0, 3)

  const budgetedCategoryIds = new Set(
    input.budgets.filter((budget) => budget.periodId === selectedPeriod.id).map((budget) => budget.categoryId),
  )
  const availableCategoriesForNewBudget = input.categories
    .filter((category) => category.entryType === 'expense' && category.status === 'active' && !budgetedCategoryIds.has(category.id))
    .map((category) => ({ id: category.id, name: category.name }))

  const plannedEntries = buildEntryRows(input.entries, input.categories, selectedPeriod.id, 'planned')
  const pendingEntries = buildEntryRows(input.entries, input.categories, selectedPeriod.id, 'pending')

  const chart = buildChart(rows)

  const accessibleSummary =
    rows.length === 0
      ? `Nenhuma categoria com limite ou despesa em ${selectedPeriod.label}.`
      : `Planejamento de ${selectedPeriod.label}: ${summary.exceededCount} categoria(s) excedida(s), ${summary.attentionCount} em atenção, ${summary.healthyCount} saudável(is), ${summary.unplannedCount} sem planejamento. ${chart.summary}`

  return {
    isEmpty: false,
    emptyTitle: null,
    emptyDescription: null,
    periodOptions,
    selectedPeriod,
    summary,
    rows,
    biggestRisks,
    availableCategoriesForNewBudget,
    plannedEntries,
    pendingEntries,
    chart,
    accessibleSummary,
  }
}
