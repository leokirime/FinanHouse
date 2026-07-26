import type { FinancialEntry } from '../financial-entry/financial-entry.js'
import { addMoney, type Money, ZERO_MONEY } from '../money/money.js'
import { calculateChange, type Change, nonCancelledExpenseCategoryTotals, type PeriodInput } from './compare-periods.js'

export const CATEGORY_COMPARISON_DIRECTIONS = ['increased', 'decreased', 'stable', 'no_base'] as const
export type CategoryComparisonDirection = (typeof CATEGORY_COMPARISON_DIRECTIONS)[number]

export interface CategoryComparisonRow {
  categoryId: number
  previousAmount: Money
  currentAmount: Money
  change: Change
  direction: CategoryComparisonDirection
}

function absoluteMoney(value: Money): Money {
  return value < ZERO_MONEY ? -value : value
}

/**
 * Compara, categoria a categoria, o total não cancelado de despesas entre
 * duas competências — diferente de `compareMonthlyPeriods` (que só expõe as
 * categorias que aumentaram/diminuíram), esta função devolve **todas** as
 * categorias usadas em pelo menos um dos dois períodos, incluindo as que
 * permaneceram estáveis ou não têm base de comparação (só existem no período
 * atual). Ordenado pela maior variação absoluta, maior primeiro.
 */
export function compareExpenseCategoryTotals(previous: PeriodInput, current: PeriodInput): CategoryComparisonRow[] {
  const previousTotals = nonCancelledExpenseCategoryTotals(previous.entries, previous.periodId)
  const currentTotals = nonCancelledExpenseCategoryTotals(current.entries, current.periodId)
  const allCategoryIds = new Set([...previousTotals.keys(), ...currentTotals.keys()])

  const rows = [...allCategoryIds].map((categoryId): CategoryComparisonRow => {
    const previousAmount = previousTotals.get(categoryId) ?? ZERO_MONEY
    const currentAmount = currentTotals.get(categoryId) ?? ZERO_MONEY
    const change = calculateChange(previousAmount, currentAmount)
    const direction: CategoryComparisonDirection =
      previousAmount === ZERO_MONEY
        ? 'no_base'
        : currentAmount > previousAmount
          ? 'increased'
          : currentAmount < previousAmount
            ? 'decreased'
            : 'stable'
    return { categoryId, previousAmount, currentAmount, change, direction }
  })

  return rows.sort((a, b) => {
    const absA = absoluteMoney(a.change.absolute)
    const absB = absoluteMoney(b.change.absolute)
    return absB > absA ? 1 : absB < absA ? -1 : 0
  })
}

export interface ExpenseIdentityEntry {
  categoryId: number
  /** Descrição original da movimentação, nunca normalizada — é o que a UI deve exibir. */
  description: string
  amount: Money
}

export interface NewAndDiscontinuedExpenses {
  /** Presentes na competência atual, ausentes na anterior. */
  newExpenses: ExpenseIdentityEntry[]
  /** Presentes na competência anterior, ausentes na atual. */
  discontinuedExpenses: ExpenseIdentityEntry[]
}

/**
 * Normaliza uma descrição de movimentação apenas para fins de **comparação**
 * entre competências (remove espaços nas pontas, baixa a caixa e colapsa
 * espaços internos repetidos) — nunca usada para exibição; a UI sempre mostra
 * `ExpenseIdentityEntry.description` (original, não normalizada).
 */
export function normalizeDescriptionForComparison(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Chave de identidade de uma despesa entre competências: categoria + descrição
 * normalizada + tipo de lançamento. Nunca o `id` da movimentação — o `id` é
 * específico de cada competência (linhas diferentes em meses diferentes), não
 * identifica "a mesma despesa" ao longo do tempo.
 */
function buildExpenseIdentityKey(entry: Pick<FinancialEntry, 'categoryId' | 'description' | 'entryType'>): string {
  return `${entry.categoryId}::${normalizeDescriptionForComparison(entry.description)}::${entry.entryType}`
}

function buildExpenseIdentityMap(entries: FinancialEntry[], periodId: number): Map<string, ExpenseIdentityEntry> {
  const map = new Map<string, ExpenseIdentityEntry>()
  for (const entry of entries) {
    if (entry.periodId !== periodId) continue
    if (entry.entryType !== 'expense') continue
    if (entry.status === 'cancelled') continue

    const key = buildExpenseIdentityKey(entry)
    const amount = entry.status === 'realized' ? (entry.actualAmount ?? ZERO_MONEY) : entry.expectedAmount
    const existing = map.get(key)
    if (existing) {
      existing.amount = addMoney(existing.amount, amount)
    } else {
      map.set(key, { categoryId: entry.categoryId, description: entry.description, amount })
    }
  }
  return map
}

/**
 * Detecta despesas novas (existem na competência atual, não existiam na
 * anterior) e descontinuadas (existiam na anterior, não existem mais na
 * atual). `cancelled` nunca compõe nenhuma das duas listas. Ordenado pelo
 * maior valor, maior primeiro.
 */
export function detectNewAndDiscontinuedExpenses(previous: PeriodInput, current: PeriodInput): NewAndDiscontinuedExpenses {
  const previousMap = buildExpenseIdentityMap(previous.entries, previous.periodId)
  const currentMap = buildExpenseIdentityMap(current.entries, current.periodId)

  const byAmountDesc = (a: ExpenseIdentityEntry, b: ExpenseIdentityEntry) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0)

  const newExpenses = [...currentMap.entries()]
    .filter(([key]) => !previousMap.has(key))
    .map(([, entry]) => entry)
    .sort(byAmountDesc)

  const discontinuedExpenses = [...previousMap.entries()]
    .filter(([key]) => !currentMap.has(key))
    .map(([, entry]) => entry)
    .sort(byAmountDesc)

  return { newExpenses, discontinuedExpenses }
}
