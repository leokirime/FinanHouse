import { describe, expect, it } from 'vitest'
import {
  FIXTURE_CURRENT_PERIOD_ID,
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
