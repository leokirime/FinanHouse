import type { FinancialEntry } from '../financial-entry/financial-entry.js'
import { addMoney, subtractMoney, type Money, ZERO_MONEY } from '../money/money.js'
import { calculateMonthlySummary, type MonthlySummary } from './monthly-summary.js'

/**
 * Variação entre dois valores. `percent` é `null` quando o período anterior
 * é zero ("sem base comparável" — nunca `Infinity`/`NaN`).
 *
 * Arredondamento: o percentual é calculado convertendo os centavos (`bigint`)
 * para `number` só para essa divisão de exibição, arredondado a 2 casas
 * decimais. A perda de precisão do `Number()` é aceitável aqui porque o
 * resultado é apenas para exibição — nunca é persistido nem realimenta
 * nenhum cálculo monetário.
 */
export interface Change {
  absolute: Money
  percent: number | null
}

export function calculateChange(previous: Money, current: Money): Change {
  return { absolute: subtractMoney(current, previous), percent: calculatePercentChange(previous, current) }
}

export function calculatePercentChange(previous: Money, current: Money): number | null {
  if (previous === ZERO_MONEY) return null
  const diff = current - previous
  const percent = (Number(diff) / Number(previous)) * 100
  return Math.round(percent * 100) / 100
}

export interface CategoryChange {
  categoryId: number
  previousRealized: Money
  currentRealized: Money
  change: Change
}

export interface PeriodInput {
  periodId: number
  entries: FinancialEntry[]
}

export interface PeriodComparison {
  previous: MonthlySummary
  current: MonthlySummary
  incomeChange: Change
  expenseChange: Change
  /** Comparação do saldo realizado — a métrica de desempenho real, não a prevista. */
  realizedBalanceChange: Change
  /** Categorias de despesa com maior aumento de valor realizado, ordenadas do maior aumento para o menor. */
  categoriesIncreased: CategoryChange[]
  /** Categorias de despesa com maior queda de valor realizado, ordenadas da maior queda para a menor. */
  categoriesDecreased: CategoryChange[]
  /** Categorias de despesa usadas no mês atual mas não no anterior. */
  newExpenseCategories: number[]
  /** Categorias de despesa usadas no mês anterior mas não no atual. */
  discontinuedExpenseCategories: number[]
  /** Previsto vs. realizado do período atual (não é uma comparação entre meses, mas contexto útil). */
  currentExpectedVsRealized: Change
}

function nonCancelledExpenseCategoryTotals(entries: FinancialEntry[], periodId: number): Map<number, Money> {
  const totals = new Map<number, Money>()
  for (const entry of entries) {
    if (entry.periodId !== periodId) continue
    if (entry.entryType !== 'expense') continue
    if (entry.status === 'cancelled') continue
    const current = totals.get(entry.categoryId) ?? ZERO_MONEY
    const amount = entry.status === 'realized' ? (entry.actualAmount ?? ZERO_MONEY) : entry.expectedAmount
    totals.set(entry.categoryId, addMoney(current, amount))
  }
  return totals
}

/**
 * Compara duas competências mensais. Todas as comparações de valor (receita,
 * despesa, saldo, categorias) usam a métrica **realizada** — o que de fato
 * aconteceu em cada mês — por ser a base mais comparável entre dois meses já
 * ocorridos. Para o mês corrente (ainda em andamento), use também
 * `currentExpectedVsRealized` para entender o que falta se realizar.
 */
export function compareMonthlyPeriods(previous: PeriodInput, current: PeriodInput): PeriodComparison {
  const previousSummary = calculateMonthlySummary(previous.periodId, previous.entries)
  const currentSummary = calculateMonthlySummary(current.periodId, current.entries)

  const previousCategoryTotals = nonCancelledExpenseCategoryTotals(previous.entries, previous.periodId)
  const currentCategoryTotals = nonCancelledExpenseCategoryTotals(current.entries, current.periodId)

  const allCategoryIds = new Set([...previousCategoryTotals.keys(), ...currentCategoryTotals.keys()])
  const categoryChanges: CategoryChange[] = [...allCategoryIds].map((categoryId) => {
    const previousRealized = previousCategoryTotals.get(categoryId) ?? ZERO_MONEY
    const currentRealized = currentCategoryTotals.get(categoryId) ?? ZERO_MONEY
    return { categoryId, previousRealized, currentRealized, change: calculateChange(previousRealized, currentRealized) }
  })

  const increased = categoryChanges
    .filter((c) => c.change.absolute > ZERO_MONEY)
    .sort((a, b) => (a.change.absolute < b.change.absolute ? 1 : a.change.absolute > b.change.absolute ? -1 : 0))
  const decreased = categoryChanges
    .filter((c) => c.change.absolute < ZERO_MONEY)
    .sort((a, b) => (a.change.absolute < b.change.absolute ? -1 : a.change.absolute > b.change.absolute ? 1 : 0))

  const newExpenseCategories = [...currentCategoryTotals.keys()].filter((id) => !previousCategoryTotals.has(id))
  const discontinuedExpenseCategories = [...previousCategoryTotals.keys()].filter((id) => !currentCategoryTotals.has(id))

  return {
    previous: previousSummary,
    current: currentSummary,
    incomeChange: calculateChange(previousSummary.realizedIncome, currentSummary.realizedIncome),
    expenseChange: calculateChange(previousSummary.realizedExpense, currentSummary.realizedExpense),
    realizedBalanceChange: calculateChange(previousSummary.realizedBalance, currentSummary.realizedBalance),
    categoriesIncreased: increased,
    categoriesDecreased: decreased,
    newExpenseCategories,
    discontinuedExpenseCategories,
    currentExpectedVsRealized: calculateChange(currentSummary.expectedExpense, currentSummary.realizedExpense),
  }
}
