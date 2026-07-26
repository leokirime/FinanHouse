import {
  calculateChange,
  calculateMonthlySummary,
  compareExpenseCategoryTotals,
  compareMonthlyPeriods,
  detectNewAndDiscontinuedExpenses,
  type Category,
  type CategoryComparisonDirection,
  type Change,
  type FinancialEntry,
  type Money,
  type MonthlyPeriod,
  type MonthlySummary,
  ZERO_MONEY,
} from '@finanhouse/domain'
import { parseIsoDate } from '../utils/format-date-pt-br.ts'
import { formatMoneyPtBr } from '../utils/format-money-pt-br.ts'

export interface PeriodOptionViewModel {
  id: number
  label: string
}

export interface ComparisonValueViewModel {
  raw: Money
  label: string
}

export type ComparisonDirection = 'increased' | 'decreased' | 'stable' | 'no_base'

export interface ComparisonChangeViewModel {
  absolute: Money
  absoluteLabel: string
  percent: number | null
  percentLabel: string
  direction: ComparisonDirection
  directionLabel: string
}

export interface ComparisonIndicatorViewModel {
  key:
    | 'realizedIncome'
    | 'realizedExpense'
    | 'realizedBalance'
    | 'projectedBalance'
    | 'expectedIncome'
    | 'expectedExpense'
  title: string
  base: ComparisonValueViewModel
  compared: ComparisonValueViewModel
  change: ComparisonChangeViewModel
  tone: 'income' | 'expense' | 'balance'
}

export interface CategoryComparisonViewModel {
  categoryId: number
  categoryName: string
  base: ComparisonValueViewModel
  compared: ComparisonValueViewModel
  change: ComparisonChangeViewModel
}

export interface ExpenseIdentityViewModel {
  categoryId: number
  categoryName: string
  description: string
  amount: ComparisonValueViewModel
}

export interface PlannedVsRealizedPeriodViewModel {
  periodId: number
  label: string
  expectedIncome: ComparisonValueViewModel
  realizedIncome: ComparisonValueViewModel
  incomeDifference: ComparisonChangeViewModel
  expectedExpense: ComparisonValueViewModel
  realizedExpense: ComparisonValueViewModel
  expenseDifference: ComparisonChangeViewModel
}

export interface ComparisonChartMetricViewModel {
  key: ComparisonIndicatorViewModel['key']
  label: string
  baseLabel: string
  comparedLabel: string
  basePercent: number
  comparedPercent: number
}

export interface ComparisonViewModel {
  isEmpty: boolean
  emptyTitle: string | null
  emptyDescription: string | null
  periodOptions: PeriodOptionViewModel[]
  basePeriod: PeriodOptionViewModel | null
  comparedPeriod: PeriodOptionViewModel | null
  indicators: ComparisonIndicatorViewModel[]
  categoryComparisons: CategoryComparisonViewModel[]
  biggestIncrease: CategoryComparisonViewModel | null
  biggestReduction: CategoryComparisonViewModel | null
  newExpenses: ExpenseIdentityViewModel[]
  endedExpenses: ExpenseIdentityViewModel[]
  plannedVsRealized: PlannedVsRealizedPeriodViewModel[]
  chart: {
    title: string
    summary: string
    metrics: ComparisonChartMetricViewModel[]
  }
  accessibleSummary: string
}

export interface BuildComparisonViewModelInput {
  periods: MonthlyPeriod[]
  entries: FinancialEntry[]
  categories: Category[]
  basePeriodId: number | null
  comparedPeriodId: number | null
}

const monthLongFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

const DIRECTION_LABELS: Record<ComparisonDirection, string> = {
  increased: 'aumentou',
  decreased: 'diminuiu',
  stable: 'permaneceu estável',
  no_base: 'Sem base comparável',
}

const CATEGORY_DIRECTION_MAP: Record<CategoryComparisonDirection, ComparisonDirection> = {
  increased: 'increased',
  decreased: 'decreased',
  stable: 'stable',
  no_base: 'no_base',
}

function periodLabel(period: MonthlyPeriod): string {
  return monthLongFormatter.format(parseIsoDate(period.referenceMonth))
}

export function sortPeriodsByReferenceMonthDesc(periods: MonthlyPeriod[]): MonthlyPeriod[] {
  return [...periods].sort((a, b) =>
    a.referenceMonth < b.referenceMonth ? 1 : a.referenceMonth > b.referenceMonth ? -1 : 0,
  )
}

export function buildComparisonPeriodOptions(periods: MonthlyPeriod[]): PeriodOptionViewModel[] {
  return sortPeriodsByReferenceMonthDesc(periods).map((period) => ({ id: period.id, label: periodLabel(period) }))
}

function categoryName(categories: Category[], categoryId: number): string {
  return categories.find((category) => category.id === categoryId)?.name ?? 'Sem categoria'
}

function value(raw: Money): ComparisonValueViewModel {
  return { raw, label: formatMoneyPtBr(raw) }
}

function signedMoneyLabel(amount: Money): string {
  if (amount === ZERO_MONEY) return formatMoneyPtBr(ZERO_MONEY)
  return `${amount > ZERO_MONEY ? '+' : ''}${formatMoneyPtBr(amount)}`
}

function percentLabel(percent: number | null): string {
  if (percent === null) return 'Sem base comparável'
  const sign = percent > 0 ? '+' : ''
  const formatted = percent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sign}${formatted}%`
}

function directionFromChange(change: Change): ComparisonDirection {
  if (change.percent === null) return 'no_base'
  if (change.absolute > ZERO_MONEY) return 'increased'
  if (change.absolute < ZERO_MONEY) return 'decreased'
  return 'stable'
}

function changeViewModel(change: Change, directionOverride?: ComparisonDirection): ComparisonChangeViewModel {
  const direction = directionOverride ?? directionFromChange(change)
  return {
    absolute: change.absolute,
    absoluteLabel: signedMoneyLabel(change.absolute),
    percent: change.percent,
    percentLabel: percentLabel(change.percent),
    direction,
    directionLabel: DIRECTION_LABELS[direction],
  }
}

function buildIndicator(
  key: ComparisonIndicatorViewModel['key'],
  title: string,
  baseAmount: Money,
  comparedAmount: Money,
  tone: ComparisonIndicatorViewModel['tone'],
  change?: Change,
): ComparisonIndicatorViewModel {
  return {
    key,
    title,
    base: value(baseAmount),
    compared: value(comparedAmount),
    change: changeViewModel(change ?? calculateChange(comparedAmount, baseAmount)),
    tone,
  }
}

function buildPlannedVsRealized(period: PeriodOptionViewModel, summary: MonthlySummary): PlannedVsRealizedPeriodViewModel {
  return {
    periodId: period.id,
    label: period.label,
    expectedIncome: value(summary.expectedIncome),
    realizedIncome: value(summary.realizedIncome),
    incomeDifference: changeViewModel(calculateChange(summary.expectedIncome, summary.realizedIncome)),
    expectedExpense: value(summary.expectedExpense),
    realizedExpense: value(summary.realizedExpense),
    expenseDifference: changeViewModel(calculateChange(summary.expectedExpense, summary.realizedExpense)),
  }
}

function absoluteMoney(amount: Money): Money {
  return amount < ZERO_MONEY ? -amount : amount
}

function ratioPercent(amount: Money, max: Money): number {
  if (max === ZERO_MONEY) return 0
  return Math.max(4, Math.round((Number(absoluteMoney(amount)) / Number(max)) * 100))
}

function buildChart(indicators: ComparisonIndicatorViewModel[]) {
  const chartIndicators = indicators.filter((indicator) =>
    ['realizedIncome', 'realizedExpense', 'realizedBalance', 'projectedBalance'].includes(indicator.key),
  )
  const max = chartIndicators.reduce<Money>((currentMax, indicator) => {
    const base = absoluteMoney(indicator.base.raw)
    const compared = absoluteMoney(indicator.compared.raw)
    const localMax = base > compared ? base : compared
    return localMax > currentMax ? localMax : currentMax
  }, ZERO_MONEY)

  return {
    title: 'Indicadores lado a lado',
    summary: chartIndicators
      .map((indicator) => `${indicator.title}: ${indicator.base.label} no período base e ${indicator.compared.label} no comparado`)
      .join('. '),
    metrics: chartIndicators.map((indicator) => ({
      key: indicator.key,
      label: indicator.title,
      baseLabel: indicator.base.label,
      comparedLabel: indicator.compared.label,
      basePercent: ratioPercent(indicator.base.raw, max),
      comparedPercent: ratioPercent(indicator.compared.raw, max),
    })),
  }
}

function emptyViewModel(options: PeriodOptionViewModel[], title: string, description: string): ComparisonViewModel {
  return {
    isEmpty: true,
    emptyTitle: title,
    emptyDescription: description,
    periodOptions: options,
    basePeriod: null,
    comparedPeriod: null,
    indicators: [],
    categoryComparisons: [],
    biggestIncrease: null,
    biggestReduction: null,
    newExpenses: [],
    endedExpenses: [],
    plannedVsRealized: [],
    chart: { title: 'Indicadores lado a lado', summary: description, metrics: [] },
    accessibleSummary: description,
  }
}

export function buildComparisonViewModel(input: BuildComparisonViewModelInput): ComparisonViewModel {
  const periodOptions = buildComparisonPeriodOptions(input.periods)
  if (periodOptions.length < 2) {
    return emptyViewModel(
      periodOptions,
      'Comparativo indisponível',
      'Cadastre ao menos duas competências para comparar períodos sem inventar dados.',
    )
  }

  const basePeriod = periodOptions.find((period) => period.id === input.basePeriodId) ?? periodOptions[0] ?? null
  const comparedPeriod =
    periodOptions.find((period) => period.id === input.comparedPeriodId && period.id !== basePeriod?.id) ??
    periodOptions.find((period) => period.id !== basePeriod?.id) ??
    null

  if (!basePeriod || !comparedPeriod) {
    return emptyViewModel(periodOptions, 'Seleção inválida', 'Escolha duas competências diferentes para montar o comparativo.')
  }

  const comparison = compareMonthlyPeriods(
    { periodId: comparedPeriod.id, entries: input.entries },
    { periodId: basePeriod.id, entries: input.entries },
  )
  const baseSummary = calculateMonthlySummary(basePeriod.id, input.entries)
  const comparedSummary = calculateMonthlySummary(comparedPeriod.id, input.entries)

  const indicators: ComparisonIndicatorViewModel[] = [
    buildIndicator('realizedIncome', 'Receitas realizadas', baseSummary.realizedIncome, comparedSummary.realizedIncome, 'income', comparison.incomeChange),
    buildIndicator('realizedExpense', 'Despesas realizadas', baseSummary.realizedExpense, comparedSummary.realizedExpense, 'expense', comparison.expenseChange),
    buildIndicator(
      'realizedBalance',
      'Saldo realizado',
      baseSummary.realizedBalance,
      comparedSummary.realizedBalance,
      'balance',
      comparison.realizedBalanceChange,
    ),
    buildIndicator('projectedBalance', 'Fechamento projetado', baseSummary.projectedBalance, comparedSummary.projectedBalance, 'balance'),
    buildIndicator('expectedIncome', 'Receitas previstas', baseSummary.expectedIncome, comparedSummary.expectedIncome, 'income'),
    buildIndicator('expectedExpense', 'Despesas previstas', baseSummary.expectedExpense, comparedSummary.expectedExpense, 'expense'),
  ]

  const categoryComparisons = compareExpenseCategoryTotals(
    { periodId: comparedPeriod.id, entries: input.entries },
    { periodId: basePeriod.id, entries: input.entries },
  ).map((row): CategoryComparisonViewModel => ({
    categoryId: row.categoryId,
    categoryName: categoryName(input.categories, row.categoryId),
    base: value(row.currentAmount),
    compared: value(row.previousAmount),
    change: changeViewModel(row.change, CATEGORY_DIRECTION_MAP[row.direction]),
  }))

  const biggestIncrease = categoryComparisons.find((row) => row.change.direction === 'increased') ?? null
  const biggestReduction = categoryComparisons.find((row) => row.change.direction === 'decreased') ?? null

  const details = detectNewAndDiscontinuedExpenses(
    { periodId: comparedPeriod.id, entries: input.entries },
    { periodId: basePeriod.id, entries: input.entries },
  )

  const newExpenses = details.newExpenses.map((expense) => ({
    categoryId: expense.categoryId,
    categoryName: categoryName(input.categories, expense.categoryId),
    description: expense.description,
    amount: value(expense.amount),
  }))
  const endedExpenses = details.discontinuedExpenses.map((expense) => ({
    categoryId: expense.categoryId,
    categoryName: categoryName(input.categories, expense.categoryId),
    description: expense.description,
    amount: value(expense.amount),
  }))

  const plannedVsRealized = [
    buildPlannedVsRealized(basePeriod, baseSummary),
    buildPlannedVsRealized(comparedPeriod, comparedSummary),
  ]

  const chart = buildChart(indicators)
  const accessibleSummary = `Comparativo entre ${basePeriod.label} e ${comparedPeriod.label}. Saldo realizado ${indicators[2]?.change.directionLabel ?? 'permaneceu estável'} em ${indicators[2]?.change.absoluteLabel ?? formatMoneyPtBr(ZERO_MONEY)}. ${chart.summary}.`

  return {
    isEmpty: false,
    emptyTitle: null,
    emptyDescription: null,
    periodOptions,
    basePeriod,
    comparedPeriod,
    indicators,
    categoryComparisons,
    biggestIncrease,
    biggestReduction,
    newExpenses,
    endedExpenses,
    plannedVsRealized,
    chart,
    accessibleSummary,
  }
}
