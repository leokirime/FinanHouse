import type { FinancialEntry } from '../financial-entry/financial-entry.js'
import { addMoney, type Money, subtractMoney, sumMoney, ZERO_MONEY } from '../money/money.js'

/**
 * Resumo financeiro de uma competência mensal, calculado a partir das
 * movimentações que pertencem a ela.
 *
 * Definições:
 * - "previsto" (`expected*`) soma `expectedAmount` de toda movimentação não
 *   cancelada (planned + pending + realized) — é o total planejado do mês,
 *   estável mesmo depois que algo é realizado.
 * - "realizado" (`realized*`) soma `actualAmount` apenas de movimentações
 *   `realized` — o que de fato aconteceu.
 * - "pendente" (`pending*`) soma `expectedAmount` apenas de movimentações
 *   `pending` — aguardando realização.
 * - "planejado" (`planned*`) soma `expectedAmount` apenas de movimentações
 *   `planned` — ainda não confirmadas. Não faz parte da lista de campos
 *   pedida explicitamente, mas é exposto por ser necessário para calcular
 *   `projectedBalance` corretamente (ver abaixo) e por ser útil por si só.
 * - `cancelledTotal`: soma de `expectedAmount` de movimentações `cancelled`,
 *   **apenas informativo — nunca compõe nenhum saldo**.
 *
 * Saldos:
 * - `expectedBalance` = receitas previstas − despesas previstas.
 * - `realizedBalance` = receitas realizadas − despesas realizadas.
 * - `projectedBalance` = (realizada + pendente + planejada) de receita
 *   menos (realizada + pendente + planejada) de despesa — mistura o valor
 *   já confirmado (`actualAmount`, para `realized`) com o valor esperado
 *   (`expectedAmount`, para `pending`/`planned`). É a melhor estimativa
 *   atual, diferente de `expectedBalance` (que usa `expectedAmount` também
 *   para itens já realizados, ignorando o valor real).
 */
export interface MonthlySummary {
  periodId: number
  expectedIncome: Money
  expectedExpense: Money
  expectedBalance: Money
  realizedIncome: Money
  realizedExpense: Money
  realizedBalance: Money
  pendingIncome: Money
  pendingExpense: Money
  plannedIncome: Money
  plannedExpense: Money
  projectedBalance: Money
  entryCount: number
  cancelledTotal: Money
}

export function calculateMonthlySummary(periodId: number, entries: FinancialEntry[]): MonthlySummary {
  const relevant = entries.filter((entry) => entry.periodId === periodId)

  const nonCancelled = relevant.filter((entry) => entry.status !== 'cancelled')
  const byType = (type: 'income' | 'expense', predicate: (entry: FinancialEntry) => boolean) =>
    nonCancelled.filter((entry) => entry.entryType === type && predicate(entry))

  const expectedIncome = sumMoney(byType('income', () => true).map((e) => e.expectedAmount))
  const expectedExpense = sumMoney(byType('expense', () => true).map((e) => e.expectedAmount))

  const realizedIncome = sumMoney(
    byType('income', (e) => e.status === 'realized').map((e) => e.actualAmount ?? ZERO_MONEY),
  )
  const realizedExpense = sumMoney(
    byType('expense', (e) => e.status === 'realized').map((e) => e.actualAmount ?? ZERO_MONEY),
  )

  const pendingIncome = sumMoney(byType('income', (e) => e.status === 'pending').map((e) => e.expectedAmount))
  const pendingExpense = sumMoney(byType('expense', (e) => e.status === 'pending').map((e) => e.expectedAmount))

  const plannedIncome = sumMoney(byType('income', (e) => e.status === 'planned').map((e) => e.expectedAmount))
  const plannedExpense = sumMoney(byType('expense', (e) => e.status === 'planned').map((e) => e.expectedAmount))

  const cancelledTotal = sumMoney(
    relevant.filter((entry) => entry.status === 'cancelled').map((entry) => entry.expectedAmount),
  )

  return {
    periodId,
    expectedIncome,
    expectedExpense,
    expectedBalance: subtractMoney(expectedIncome, expectedExpense),
    realizedIncome,
    realizedExpense,
    realizedBalance: subtractMoney(realizedIncome, realizedExpense),
    pendingIncome,
    pendingExpense,
    plannedIncome,
    plannedExpense,
    projectedBalance: subtractMoney(
      addMoney(addMoney(realizedIncome, pendingIncome), plannedIncome),
      addMoney(addMoney(realizedExpense, pendingExpense), plannedExpense),
    ),
    entryCount: relevant.length,
    cancelledTotal,
  }
}
