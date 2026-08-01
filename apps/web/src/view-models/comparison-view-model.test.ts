import { parseMoney, type FinancialEntry, type MonthlyPeriod } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import {
  CATEGORY_FOOD,
  CATEGORY_HEALTH,
  CATEGORY_HOUSING,
  CATEGORY_LEISURE,
  CATEGORY_SALARY,
  fixtureCategories,
  fixtureFinancialEntries,
  fixtureMonthlyPeriods,
  FIXTURE_CURRENT_PERIOD_ID,
  FIXTURE_PREVIOUS_PERIOD_ID,
} from '../state/test-support/finance-test-fixtures.ts'
import { buildComparisonPeriodOptions, buildComparisonViewModel } from './comparison-view-model.ts'

function period(id: number, referenceMonth: string): MonthlyPeriod {
  return { id, householdId: 1, referenceMonth, status: 'closed', closedAt: null, closedByUserId: null }
}

let nextEntryId = 1
function entry(periodId: number, overrides: Partial<FinancialEntry>): FinancialEntry {
  const status = overrides.status ?? 'realized'
  const actualAmount = status === 'realized' ? (overrides.actualAmount ?? overrides.expectedAmount ?? parseMoney('100.00')) : null
  return {
    id: nextEntryId++,
    householdId: 1,
    periodId,
    categoryId: CATEGORY_FOOD,
    responsibleMemberId: null,
    createdByUserId: 1,
    entryType: 'expense',
    status,
    description: 'Despesa de teste',
    expectedAmount: parseMoney('100.00'),
    actualAmount,
    dueDate: '2026-07-10',
    realizationDate: status === 'realized' ? '2026-07-10' : null,
    notes: null,
    ...overrides,
  }
}

function build(entries: FinancialEntry[], periods = [period(2, '2026-07-01'), period(1, '2026-06-01')], categories = fixtureCategories) {
  return buildComparisonViewModel({ periods, entries, categories, basePeriodId: 2, comparedPeriodId: 1 })
}

function textOf(viewModel: ReturnType<typeof buildComparisonViewModel>): string {
  return JSON.stringify(viewModel, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
}

describe('buildComparisonPeriodOptions', () => {
  it('ordena competências da mais recente para a mais antiga com rótulos pt-BR', () => {
    const options = buildComparisonPeriodOptions([period(1, '2026-01-01'), period(3, '2026-03-01'), period(2, '2026-02-01')])
    expect(options.map((option) => option.id)).toEqual([3, 2, 1])
    expect(options[0]?.label.toLowerCase()).toContain('março')
  })
})

describe('buildComparisonViewModel', () => {
  it('retorna estado vazio quando há menos de duas competências', () => {
    const viewModel = buildComparisonViewModel({ periods: [period(1, '2026-07-01')], entries: [], categories: fixtureCategories, basePeriodId: 1, comparedPeriodId: null })
    expect(viewModel.isEmpty).toBe(true)
    expect(viewModel.emptyTitle).toBe('Comparativo indisponível')
  })

  it('usa competência atual como base e anterior como comparada nas fixtures', () => {
    const viewModel = buildComparisonViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      basePeriodId: FIXTURE_CURRENT_PERIOD_ID,
      comparedPeriodId: FIXTURE_PREVIOUS_PERIOD_ID,
    })
    expect(viewModel.basePeriod?.label.toLowerCase()).toContain('julho')
    expect(viewModel.comparedPeriod?.label.toLowerCase()).toContain('junho')
  })

  it('expõe os seis indicadores comparativos obrigatórios', () => {
    const viewModel = build([])
    expect(viewModel.indicators.map((indicator) => indicator.key)).toEqual([
      'realizedIncome',
      'realizedExpense',
      'realizedBalance',
      'projectedBalance',
      'expectedIncome',
      'expectedExpense',
    ])
  })

  it('calcula variação absoluta e percentual de receitas realizadas', () => {
    const viewModel = build([
      entry(1, { entryType: 'income', categoryId: CATEGORY_SALARY, expectedAmount: parseMoney('1000.00'), actualAmount: parseMoney('1000.00') }),
      entry(2, { entryType: 'income', categoryId: CATEGORY_SALARY, expectedAmount: parseMoney('1250.00'), actualAmount: parseMoney('1250.00') }),
    ])
    const income = viewModel.indicators.find((indicator) => indicator.key === 'realizedIncome')
    expect(income?.base.label).toBe('R$ 1.250,00')
    expect(income?.compared.label).toBe('R$ 1.000,00')
    expect(income?.change.absoluteLabel).toBe('+R$ 250,00')
    expect(income?.change.percentLabel).toBe('+25,00%')
  })

  it('trata base zero sem NaN ou Infinity', () => {
    const viewModel = build([
      entry(2, { entryType: 'income', categoryId: CATEGORY_SALARY, expectedAmount: parseMoney('900.00'), actualAmount: parseMoney('900.00') }),
    ])
    const income = viewModel.indicators.find((indicator) => indicator.key === 'realizedIncome')
    expect(income?.change.percent).toBeNull()
    expect(income?.change.percentLabel).toBe('Sem base comparável')
    expect(textOf(viewModel)).not.toContain('NaN')
    expect(textOf(viewModel)).not.toContain('Infinity')
  })

  it('calcula saldo realizado e fechamento projetado sem usar canceladas', () => {
    const viewModel = build([
      entry(2, { entryType: 'income', categoryId: CATEGORY_SALARY, expectedAmount: parseMoney('1000.00'), actualAmount: parseMoney('1000.00') }),
      entry(2, { entryType: 'expense', categoryId: CATEGORY_FOOD, expectedAmount: parseMoney('100.00'), actualAmount: parseMoney('100.00') }),
      entry(2, { entryType: 'expense', categoryId: CATEGORY_LEISURE, status: 'pending', expectedAmount: parseMoney('80.00') }),
      entry(2, { entryType: 'expense', categoryId: CATEGORY_HEALTH, status: 'cancelled', expectedAmount: parseMoney('500.00') }),
    ])
    const balance = viewModel.indicators.find((indicator) => indicator.key === 'realizedBalance')
    const projected = viewModel.indicators.find((indicator) => indicator.key === 'projectedBalance')
    expect(balance?.base.label).toBe('R$ 900,00')
    expect(projected?.base.label).toBe('R$ 820,00')
  })

  it('compara somente categorias de despesa', () => {
    const viewModel = build([
      entry(1, { entryType: 'income', categoryId: CATEGORY_SALARY, expectedAmount: parseMoney('300.00'), actualAmount: parseMoney('300.00') }),
      entry(1, { entryType: 'expense', categoryId: CATEGORY_FOOD, expectedAmount: parseMoney('100.00'), actualAmount: parseMoney('100.00') }),
      entry(2, { entryType: 'expense', categoryId: CATEGORY_FOOD, expectedAmount: parseMoney('120.00'), actualAmount: parseMoney('120.00') }),
    ])
    expect(viewModel.categoryComparisons.map((row) => row.categoryName)).toEqual(['Alimentação'])
  })

  it('ordena categorias pela maior variação absoluta', () => {
    const viewModel = build([
      entry(1, { categoryId: CATEGORY_FOOD, expectedAmount: parseMoney('100.00'), actualAmount: parseMoney('100.00') }),
      entry(2, { categoryId: CATEGORY_FOOD, expectedAmount: parseMoney('120.00'), actualAmount: parseMoney('120.00') }),
      entry(1, { categoryId: CATEGORY_HOUSING, expectedAmount: parseMoney('100.00'), actualAmount: parseMoney('100.00') }),
      entry(2, { categoryId: CATEGORY_HOUSING, expectedAmount: parseMoney('400.00'), actualAmount: parseMoney('400.00') }),
    ])
    expect(viewModel.categoryComparisons[0]?.categoryName).toBe('Moradia')
  })

  it('marca categoria sem base quando ela só existe no período base', () => {
    const viewModel = build([
      entry(2, { categoryId: CATEGORY_HEALTH, expectedAmount: parseMoney('70.00'), actualAmount: parseMoney('70.00') }),
    ])
    expect(viewModel.categoryComparisons[0]?.change.direction).toBe('no_base')
    expect(viewModel.categoryComparisons[0]?.change.percentLabel).toBe('Sem base comparável')
  })

  it('identifica maior aumento e maior redução de categorias', () => {
    const viewModel = build([
      entry(1, { categoryId: CATEGORY_FOOD, expectedAmount: parseMoney('300.00'), actualAmount: parseMoney('300.00') }),
      entry(2, { categoryId: CATEGORY_FOOD, expectedAmount: parseMoney('200.00'), actualAmount: parseMoney('200.00') }),
      entry(1, { categoryId: CATEGORY_HOUSING, expectedAmount: parseMoney('100.00'), actualAmount: parseMoney('100.00') }),
      entry(2, { categoryId: CATEGORY_HOUSING, expectedAmount: parseMoney('180.00'), actualAmount: parseMoney('180.00') }),
    ])
    expect(viewModel.biggestIncrease?.categoryName).toBe('Moradia')
    expect(viewModel.biggestReduction?.categoryName).toBe('Alimentação')
  })

  it('detecta despesas novas pela chave normalizada, preservando descrição original', () => {
    const viewModel = build([
      entry(1, { categoryId: CATEGORY_FOOD, description: 'Supermercado' }),
      entry(2, { categoryId: CATEGORY_FOOD, description: '  Supermercado  ' }),
      entry(2, { categoryId: CATEGORY_LEISURE, description: '  Cinema   especial  ', expectedAmount: parseMoney('60.00'), actualAmount: parseMoney('60.00') }),
    ])
    expect(viewModel.newExpenses).toHaveLength(1)
    expect(viewModel.newExpenses[0]?.description).toBe('  Cinema   especial  ')
  })

  it('detecta despesas encerradas sem usar IDs das movimentações', () => {
    const viewModel = build([
      entry(1, { id: 100, categoryId: CATEGORY_HOUSING, description: 'Internet' }),
      entry(2, { id: 999, categoryId: CATEGORY_HOUSING, description: 'Internet' }),
      entry(1, { categoryId: CATEGORY_LEISURE, description: 'Academia' }),
    ])
    expect(viewModel.endedExpenses.map((expense) => expense.description)).toEqual(['Academia'])
  })

  it('ignora despesas canceladas nas listas de novas e encerradas', () => {
    const viewModel = build([
      entry(1, { categoryId: CATEGORY_HEALTH, description: 'Consulta', status: 'cancelled', actualAmount: null, realizationDate: null }),
      entry(2, { categoryId: CATEGORY_HEALTH, description: 'Consulta', status: 'cancelled', actualAmount: null, realizationDate: null }),
    ])
    expect(viewModel.newExpenses).toEqual([])
    expect(viewModel.endedExpenses).toEqual([])
  })

  it('monta previsto versus realizado para os dois períodos', () => {
    const viewModel = build([
      entry(1, { entryType: 'income', categoryId: CATEGORY_SALARY, expectedAmount: parseMoney('100.00'), actualAmount: parseMoney('90.00') }),
      entry(2, { entryType: 'income', categoryId: CATEGORY_SALARY, expectedAmount: parseMoney('100.00'), actualAmount: parseMoney('110.00') }),
      entry(2, { entryType: 'expense', categoryId: CATEGORY_FOOD, status: 'pending', expectedAmount: parseMoney('25.00') }),
    ])
    expect(viewModel.plannedVsRealized).toHaveLength(2)
    expect(viewModel.plannedVsRealized[0]?.incomeDifference.absoluteLabel).toBe('+R$ 10,00')
    expect(viewModel.plannedVsRealized[0]?.expectedExpense.label).toBe('R$ 25,00')
    expect(viewModel.plannedVsRealized[0]?.realizedExpense.label).toBe('R$ 0,00')
  })

  it('gera gráfico com números consistentes e percentuais finitos', () => {
    const viewModel = build([
      entry(1, { entryType: 'income', categoryId: CATEGORY_SALARY, expectedAmount: parseMoney('500.00'), actualAmount: parseMoney('500.00') }),
      entry(2, { entryType: 'income', categoryId: CATEGORY_SALARY, expectedAmount: parseMoney('1000.00'), actualAmount: parseMoney('1000.00') }),
    ])
    expect(viewModel.chart.metrics).toHaveLength(4)
    expect(viewModel.chart.summary).toContain('Receitas realizadas')
    for (const metric of viewModel.chart.metrics) {
      expect(Number.isFinite(metric.basePercent)).toBe(true)
      expect(Number.isFinite(metric.comparedPercent)).toBe(true)
    }
  })

  it('gera resumo acessível sem NaN ou Infinity', () => {
    const viewModel = build([])
    expect(viewModel.accessibleSummary).toContain('Comparativo entre julho de 2026 e junho de 2026')
    expect(viewModel.accessibleSummary).not.toContain('NaN')
    expect(viewModel.accessibleSummary).not.toContain('Infinity')
  })

  it('corrige seleção inválida quando base e comparado apontam para a mesma competência', () => {
    const viewModel = buildComparisonViewModel({
      periods: [period(2, '2026-07-01'), period(1, '2026-06-01')],
      entries: [],
      categories: fixtureCategories,
      basePeriodId: 2,
      comparedPeriodId: 2,
    })
    expect(viewModel.basePeriod?.id).toBe(2)
    expect(viewModel.comparedPeriod?.id).toBe(1)
  })
})
