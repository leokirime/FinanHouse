import { parseMoney, type FinancialEntry, type MonthlyPeriod } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import {
  CATEGORY_FOOD,
  CATEGORY_HEALTH,
  CATEGORY_HOUSING,
  CATEGORY_LEISURE,
  CATEGORY_TRANSPORT,
  fixtureCategories,
  fixtureCategoryBudgets,
  fixtureFinancialEntries,
  fixtureMonthlyPeriods,
  FIXTURE_CURRENT_PERIOD_ID,
  FIXTURE_PREVIOUS_PERIOD_ID,
} from '../data/dashboard-fixtures.ts'
import { buildPlanningPeriodOptions, buildPlanningViewModel } from './planning-view-model.ts'

function period(id: number, referenceMonth: string): MonthlyPeriod {
  return { id, householdId: 1, referenceMonth, status: 'open', closedAt: null, closedByUserId: null }
}

describe('buildPlanningPeriodOptions', () => {
  it('ordena competências da mais recente para a mais antiga', () => {
    const options = buildPlanningPeriodOptions([period(1, '2026-01-01'), period(2, '2026-03-01'), period(3, '2026-02-01')])
    expect(options.map((option) => option.id)).toEqual([2, 3, 1])
  })

  it('rótulos em pt-BR (mês/ano)', () => {
    const options = buildPlanningPeriodOptions([period(1, '2026-07-01')])
    expect(options[0]?.label).toBe('julho de 2026')
  })
})

describe('buildPlanningViewModel', () => {
  it('estado vazio explícito quando não há nenhuma competência', () => {
    const viewModel = buildPlanningViewModel({
      periods: [],
      selectedPeriodId: null,
      categories: fixtureCategories,
      entries: [],
      budgets: [],
    })
    expect(viewModel.isEmpty).toBe(true)
    expect(viewModel.rows).toEqual([])
  })

  it('usa as fixtures da competência atual: Moradia em atenção, Alimentação saudável, Transporte excedido, Lazer sem planejamento', () => {
    const viewModel = buildPlanningViewModel({
      periods: fixtureMonthlyPeriods,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      categories: fixtureCategories,
      entries: fixtureFinancialEntries,
      budgets: fixtureCategoryBudgets,
    })
    expect(viewModel.isEmpty).toBe(false)

    const byCategory = new Map(viewModel.rows.map((row) => [row.categoryId, row]))
    expect(byCategory.get(CATEGORY_HOUSING)?.status).toBe('attention')
    expect(byCategory.get(CATEGORY_FOOD)?.status).toBe('healthy')
    expect(byCategory.get(CATEGORY_TRANSPORT)?.status).toBe('exceeded')
    expect(byCategory.get(CATEGORY_LEISURE)?.status).toBe('unplanned')
  })

  it('categoria sem limite e sem despesa (Saúde) não aparece na lista', () => {
    const viewModel = buildPlanningViewModel({
      periods: fixtureMonthlyPeriods,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      categories: fixtureCategories,
      entries: fixtureFinancialEntries,
      budgets: fixtureCategoryBudgets,
    })
    expect(viewModel.rows.some((row) => row.categoryId === CATEGORY_HEALTH)).toBe(false)
  })

  it('contagens do resumo batem com os status das linhas', () => {
    const viewModel = buildPlanningViewModel({
      periods: fixtureMonthlyPeriods,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      categories: fixtureCategories,
      entries: fixtureFinancialEntries,
      budgets: fixtureCategoryBudgets,
    })
    const counted = { healthy: 0, attention: 0, exceeded: 0, unplanned: 0 }
    for (const row of viewModel.rows) counted[row.status] += 1
    expect(viewModel.summary?.healthyCount).toBe(counted.healthy)
    expect(viewModel.summary?.attentionCount).toBe(counted.attention)
    expect(viewModel.summary?.exceededCount).toBe(counted.exceeded)
    expect(viewModel.summary?.unplannedCount).toBe(counted.unplanned)
  })

  it('categoria sem limite tem percentLabel "Sem limite definido" e nenhum NaN/Infinity', () => {
    const viewModel = buildPlanningViewModel({
      periods: fixtureMonthlyPeriods,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      categories: fixtureCategories,
      entries: fixtureFinancialEntries,
      budgets: fixtureCategoryBudgets,
    })
    const leisure = viewModel.rows.find((row) => row.categoryId === CATEGORY_LEISURE)
    expect(leisure?.percentConsumed).toBeNull()
    expect(leisure?.percentLabel).toBe('Sem limite definido')
    for (const row of viewModel.rows) {
      expect(Number.isNaN(row.percentConsumed ?? 0)).toBe(false)
      expect(row.percentConsumed === null || Number.isFinite(row.percentConsumed)).toBe(true)
    }
  })

  it('maiores riscos contêm apenas categorias excedidas ou em atenção', () => {
    const viewModel = buildPlanningViewModel({
      periods: fixtureMonthlyPeriods,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      categories: fixtureCategories,
      entries: fixtureFinancialEntries,
      budgets: fixtureCategoryBudgets,
    })
    expect(viewModel.biggestRisks.every((row) => row.status === 'exceeded' || row.status === 'attention')).toBe(true)
    expect(viewModel.biggestRisks.some((row) => row.categoryId === CATEGORY_TRANSPORT)).toBe(true)
  })

  it('linhas ordenadas por severidade (excedido antes de saudável)', () => {
    const viewModel = buildPlanningViewModel({
      periods: fixtureMonthlyPeriods,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      categories: fixtureCategories,
      entries: fixtureFinancialEntries,
      budgets: fixtureCategoryBudgets,
    })
    const exceededIndex = viewModel.rows.findIndex((row) => row.categoryId === CATEGORY_TRANSPORT)
    const healthyIndex = viewModel.rows.findIndex((row) => row.categoryId === CATEGORY_FOOD)
    expect(exceededIndex).toBeLessThan(healthyIndex)
  })

  it('categorias disponíveis para novo limite excluem as já orçadas e categorias de receita', () => {
    const viewModel = buildPlanningViewModel({
      periods: fixtureMonthlyPeriods,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      categories: fixtureCategories,
      entries: fixtureFinancialEntries,
      budgets: fixtureCategoryBudgets,
    })
    const availableIds = viewModel.availableCategoriesForNewBudget.map((category) => category.id)
    expect(availableIds).not.toContain(CATEGORY_HOUSING) // já tem limite na competência atual
    expect(availableIds).toContain(CATEGORY_LEISURE) // ainda sem limite
    expect(availableIds).toContain(CATEGORY_HEALTH) // sem limite e sem despesa relevante
  })

  it('gráfico só inclui categorias com limite definido, consistente com os cards', () => {
    const viewModel = buildPlanningViewModel({
      periods: fixtureMonthlyPeriods,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      categories: fixtureCategories,
      entries: fixtureFinancialEntries,
      budgets: fixtureCategoryBudgets,
    })
    const barIds = viewModel.chart.bars.map((bar) => bar.categoryId)
    expect(barIds).not.toContain(CATEGORY_LEISURE) // unplanned não tem barra (sem limite)
    const housingBar = viewModel.chart.bars.find((bar) => bar.categoryId === CATEGORY_HOUSING)
    const housingRow = viewModel.rows.find((row) => row.categoryId === CATEGORY_HOUSING)
    expect(housingBar?.valueLabel).toContain(housingRow?.projected.label)
    expect(housingBar?.valueLabel).toContain(housingRow?.limit?.label ?? '')
  })

  it('competência fechada (junho) também é navegável e reflete seu próprio limite', () => {
    const viewModel = buildPlanningViewModel({
      periods: fixtureMonthlyPeriods,
      selectedPeriodId: FIXTURE_PREVIOUS_PERIOD_ID,
      categories: fixtureCategories,
      entries: fixtureFinancialEntries,
      budgets: fixtureCategoryBudgets,
    })
    const housing = viewModel.rows.find((row) => row.categoryId === CATEGORY_HOUSING)
    expect(housing).toBeDefined()
    expect(housing?.limit?.raw).toBe(parseMoney('1800.00'))
  })

  it('resumo textual acessível cita a competência selecionada', () => {
    const viewModel = buildPlanningViewModel({
      periods: fixtureMonthlyPeriods,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      categories: fixtureCategories,
      entries: fixtureFinancialEntries,
      budgets: fixtureCategoryBudgets,
    })
    expect(viewModel.accessibleSummary).toContain('julho de 2026')
  })

  it('quando a competência não tem nenhuma categoria relevante, rows fica vazio sem quebrar o resumo', () => {
    const emptyEntries: FinancialEntry[] = []
    const viewModel = buildPlanningViewModel({
      periods: fixtureMonthlyPeriods,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      categories: fixtureCategories,
      entries: emptyEntries,
      budgets: [],
    })
    expect(viewModel.rows).toEqual([])
    expect(viewModel.summary?.healthyCount).toBe(0)
    expect(viewModel.summary?.exceededCount).toBe(0)
  })
})
