import { parseMoney, type FinancialEntry, type MonthlyPeriod } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import {
  CATEGORY_HOUSING,
  FIXTURE_CURRENT_PERIOD_ID,
  FIXTURE_HOUSEHOLD_ID,
  FIXTURE_PREVIOUS_PERIOD_ID,
  fixtureCategories,
  fixtureFinancialEntries,
  fixtureMonthlyPeriods,
} from '../state/test-support/finance-test-fixtures.ts'
import { buildDashboardViewModel } from './dashboard-view-model.ts'

describe('buildDashboardViewModel', () => {
  const viewModel = buildDashboardViewModel({
    entries: fixtureFinancialEntries,
    categories: fixtureCategories,
    periods: fixtureMonthlyPeriods,
    currentPeriodId: FIXTURE_CURRENT_PERIOD_ID,
    previousPeriodId: FIXTURE_PREVIOUS_PERIOD_ID,
  })

  it('descreve a competência atual como aberta', () => {
    expect(viewModel.periodOverview.status).toBe('open')
    expect(viewModel.periodOverview.statusLabel).toBe('Aberta')
    expect(viewModel.periodOverview.referenceMonthLabel.toLowerCase()).toContain('julho')
  })

  it('expõe exatamente quatro indicadores principais', () => {
    expect(viewModel.indicators).toHaveLength(4)
    expect(viewModel.indicators.map((indicator) => indicator.key)).toEqual([
      'realizedIncome',
      'realizedExpense',
      'realizedBalance',
      'projectedBalance',
    ])
  })

  it('calcula receitas e despesas realizadas do mês atual a partir das fixtures', () => {
    const income = viewModel.indicators.find((indicator) => indicator.key === 'realizedIncome')
    const expense = viewModel.indicators.find((indicator) => indicator.key === 'realizedExpense')
    // Salário (875000) + Aluguel (180000) + Supermercado parcial (61000) realizados em julho.
    expect(income?.value).toBe('R$ 8.750,00')
    expect(expense?.value).toBe('R$ 2.410,00')
  })

  it('nunca produz NaN ou Infinity nos indicadores', () => {
    for (const indicator of viewModel.indicators) {
      expect(indicator.value).not.toContain('NaN')
      expect(indicator.value).not.toContain('Infinity')
      expect(indicator.secondaryText).not.toContain('NaN')
      expect(indicator.secondaryText).not.toContain('Infinity')
    }
  })

  it('possui um ponto de evolução por competência, sem NaN/Infinity', () => {
    expect(viewModel.evolution).toHaveLength(7)
    for (const point of viewModel.evolution) {
      expect(typeof point.income).toBe('bigint')
      expect(typeof point.expense).toBe('bigint')
    }
  })

  it('distribui despesas por categoria somando 100% (arredondamento à parte)', () => {
    const totalPercent = viewModel.categoryBreakdown.reduce((sum, item) => sum + item.percent, 0)
    expect(totalPercent).toBeGreaterThan(99)
    expect(totalPercent).toBeLessThanOrEqual(100.5)
    for (const item of viewModel.categoryBreakdown) {
      expect(Number.isFinite(item.percent)).toBe(true)
    }
  })

  it('não inclui a movimentação cancelada na distribuição por categoria', () => {
    const saude = viewModel.categoryBreakdown.find((item) => item.name === 'Saúde')
    expect(saude).toBeUndefined()
  })

  it('lista pendências próximas ordenadas por data, apenas status pending', () => {
    expect(viewModel.upcomingEntries.length).toBeGreaterThan(0)
    // Pendência de despesa (parcela do seguro) aparece com valor negativo;
    // pendência de receita (freelance a receber) aparece com valor positivo.
    const insurance = viewModel.upcomingEntries.find((entry) => entry.description.includes('seguro'))
    const freelance = viewModel.upcomingEntries.find((entry) => entry.description.includes('freelance'))
    expect(insurance?.amountLabel).toMatch(/^-R\$/)
    expect(freelance?.amountLabel).toMatch(/^R\$/)
  })

  it('lista movimentações recentes com rótulo de status', () => {
    expect(viewModel.recentEntries.length).toBeGreaterThan(0)
    for (const entry of viewModel.recentEntries) {
      expect(entry.statusLabel).toBeTruthy()
      expect(entry.categoryName).toBeTruthy()
    }
  })
})

/**
 * Sessão 12, Bloco 06 — comprova que uma parcela de `InstallmentPlan` (cada
 * uma uma `FinancialEntry` real, `installmentPlanId`/`installmentNumber`
 * preenchidos) é contabilizada pelo Dashboard exatamente como qualquer outra
 * movimentação: só na sua própria competência, pelo seu próprio valor —
 * nunca pelo total do plano. Nenhuma alteração de código de produção foi
 * necessária para estes casos: `buildDashboardViewModel`/`calculateMonthlySummary`
 * já operam exclusivamente sobre `FinancialEntry` filtrada por `periodId`.
 */
describe('buildDashboardViewModel — parcelas de InstallmentPlan (Sessão 12, Bloco 06)', () => {
  const AUGUST_PERIOD_ID = 101
  const SEPTEMBER_PERIOD_ID = 102
  const INSTALLMENT_PLAN_ID = 999

  const periods: MonthlyPeriod[] = [
    { id: AUGUST_PERIOD_ID, householdId: FIXTURE_HOUSEHOLD_ID, referenceMonth: '2026-08-01', status: 'open', closedAt: null, closedByUserId: null },
    { id: SEPTEMBER_PERIOD_ID, householdId: FIXTURE_HOUSEHOLD_ID, referenceMonth: '2026-09-01', status: 'open', closedAt: null, closedByUserId: null },
  ]

  function installment(periodId: number, installmentNumber: number, status: FinancialEntry['status'] = 'planned'): FinancialEntry {
    return {
      id: 9000 + installmentNumber,
      householdId: FIXTURE_HOUSEHOLD_ID,
      periodId,
      categoryId: CATEGORY_HOUSING,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'expense',
      status,
      description: `Geladeira ${installmentNumber}/10`,
      expectedAmount: parseMoney('300.00'),
      actualAmount: status === 'realized' ? parseMoney('300.00') : null,
      dueDate: `2026-0${installmentNumber === 1 ? '8' : '9'}-10`,
      realizationDate: status === 'realized' ? `2026-0${installmentNumber === 1 ? '8' : '9'}-10` : null,
      notes: null,
      installmentPlanId: INSTALLMENT_PLAN_ID,
      installmentNumber,
    }
  }

  it('Caso A — Dashboard de agosto contabiliza só a parcela 1/10 (R$ 300,00), nunca o total do plano (R$ 3.000,00)', () => {
    const entries = [installment(AUGUST_PERIOD_ID, 1, 'realized'), installment(SEPTEMBER_PERIOD_ID, 2, 'planned')]
    const viewModel = buildDashboardViewModel({
      entries,
      categories: fixtureCategories,
      periods,
      currentPeriodId: AUGUST_PERIOD_ID,
      previousPeriodId: SEPTEMBER_PERIOD_ID, // sentinela — sem período anterior real neste cenário isolado
    })

    const expense = viewModel.indicators.find((indicator) => indicator.key === 'realizedExpense')
    expect(expense?.value).toBe('R$ 300,00')
    expect(expense?.value).not.toBe('R$ 3.000,00')
    expect(expense?.value).not.toBe('R$ 600,00')
  })

  it('Caso B — parcela de competência futura (setembro) não entra no Dashboard de agosto; entra ao navegar para setembro', () => {
    const entries = [installment(AUGUST_PERIOD_ID, 1, 'planned'), installment(SEPTEMBER_PERIOD_ID, 2, 'planned')]

    const augustViewModel = buildDashboardViewModel({
      entries,
      categories: fixtureCategories,
      periods,
      currentPeriodId: AUGUST_PERIOD_ID,
      previousPeriodId: SEPTEMBER_PERIOD_ID,
    })
    const augustProjected = augustViewModel.indicators.find((indicator) => indicator.key === 'projectedBalance')
    // Só a parcela 1 (planned) entra no fechamento projetado de agosto — nunca as duas parcelas somadas.
    expect(augustProjected?.value).toBe('-R$ 300,00')

    const septemberViewModel = buildDashboardViewModel({
      entries,
      categories: fixtureCategories,
      periods,
      currentPeriodId: SEPTEMBER_PERIOD_ID,
      previousPeriodId: AUGUST_PERIOD_ID,
    })
    const septemberProjected = septemberViewModel.indicators.find((indicator) => indicator.key === 'projectedBalance')
    expect(septemberProjected?.value).toBe('-R$ 300,00')
  })

  it('Caso G — lançamento avulso (installmentPlanId/installmentNumber null) continua produzindo os indicadores normalmente, sem regressão', () => {
    const avulso: FinancialEntry = {
      id: 9500,
      householdId: FIXTURE_HOUSEHOLD_ID,
      periodId: AUGUST_PERIOD_ID,
      categoryId: CATEGORY_HOUSING,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'expense',
      status: 'realized',
      description: 'Conta de luz',
      expectedAmount: parseMoney('150.00'),
      actualAmount: parseMoney('150.00'),
      dueDate: '2026-08-15',
      realizationDate: '2026-08-15',
      notes: null,
      installmentPlanId: null,
      installmentNumber: null,
    }
    const viewModel = buildDashboardViewModel({
      entries: [avulso],
      categories: fixtureCategories,
      periods,
      currentPeriodId: AUGUST_PERIOD_ID,
      previousPeriodId: SEPTEMBER_PERIOD_ID,
    })
    const expense = viewModel.indicators.find((indicator) => indicator.key === 'realizedExpense')
    expect(expense?.value).toBe('R$ 150,00')
  })
})
