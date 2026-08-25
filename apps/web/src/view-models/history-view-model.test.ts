import { parseMoney, type FinancialEntry, type MonthlyPeriod } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import {
  CATEGORY_FOOD,
  CATEGORY_HOUSING,
  fixtureCategories,
  fixtureFinancialEntries,
  fixtureMonthlyPeriods,
  FIXTURE_CURRENT_PERIOD_ID,
  FIXTURE_PREVIOUS_PERIOD_ID,
} from '../state/test-support/finance-test-fixtures.ts'
import { buildAvailableHistoryYears, buildHistoryViewModel, DEFAULT_HISTORY_FILTERS, sortPeriodsByReferenceMonthDesc } from './history-view-model.ts'

function period(id: number, referenceMonth: string, status: MonthlyPeriod['status'] = 'closed'): MonthlyPeriod {
  return { id, householdId: 1, referenceMonth, status, closedAt: null, closedByUserId: null }
}

describe('sortPeriodsByReferenceMonthDesc / buildAvailableHistoryYears', () => {
  it('ordena competências da mais recente para a mais antiga', () => {
    const sorted = sortPeriodsByReferenceMonthDesc([period(1, '2026-01-01'), period(2, '2026-06-01'), period(3, '2025-12-01')])
    expect(sorted.map((p) => p.id)).toEqual([2, 1, 3])
  })

  it('lista anos disponíveis sem duplicar, do mais recente para o mais antigo', () => {
    const years = buildAvailableHistoryYears([period(1, '2026-01-01'), period(2, '2026-06-01'), period(3, '2025-12-01')])
    expect(years).toEqual([2026, 2025])
  })
})

describe('buildHistoryViewModel', () => {
  it('estado vazio explícito quando não há nenhuma competência', () => {
    const viewModel = buildHistoryViewModel({
      periods: [],
      entries: [],
      categories: fixtureCategories,
      selectedPeriodId: null,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(viewModel.isEmpty).toBe(true)
  })

  it('seleciona por padrão a competência mais recente', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: null,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(viewModel.selectedPeriod?.id).toBe(FIXTURE_CURRENT_PERIOD_ID)
  })

  it('permite selecionar outra competência', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: FIXTURE_PREVIOUS_PERIOD_ID,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(viewModel.selectedPeriod?.id).toBe(FIXTURE_PREVIOUS_PERIOD_ID)
  })

  it('filtra por ano', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: null,
      filters: { ...DEFAULT_HISTORY_FILTERS, year: 2026 },
    })
    expect(viewModel.periods.every((p) => p.year === 2026)).toBe(true)
  })

  it('filtra por status de competência', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: null,
      filters: { ...DEFAULT_HISTORY_FILTERS, periodStatus: 'open' },
    })
    expect(viewModel.periods).toHaveLength(1)
    expect(viewModel.periods[0]?.id).toBe(FIXTURE_CURRENT_PERIOD_ID)
  })

  it('filtra movimentações por status', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      filters: { ...DEFAULT_HISTORY_FILTERS, entryStatus: 'cancelled' },
    })
    expect(viewModel.entries.every((entry) => entry.status === 'cancelled')).toBe(true)
    expect(viewModel.entries.length).toBeGreaterThan(0)
  })

  it('limpar os filtros volta a mostrar todas as competências/movimentações', () => {
    const filtered = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: null,
      filters: { year: 2026, periodStatus: 'open', entryStatus: 'cancelled' },
    })
    const cleared = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: null,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(cleared.periods.length).toBeGreaterThan(filtered.periods.length)
  })

  it('estado vazio quando os filtros de competência não encontram nada', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: null,
      filters: { ...DEFAULT_HISTORY_FILTERS, year: 1999 },
    })
    expect(viewModel.isEmpty).toBe(true)
    expect(viewModel.emptyTitle).toBe('Nenhuma competência encontrada')
  })

  it('mensagem de vazio quando o filtro de status de movimentação não encontra nada na competência', () => {
    const entriesWithoutCancelled = fixtureFinancialEntries.filter(
      (entry) => !(entry.periodId === FIXTURE_PREVIOUS_PERIOD_ID && entry.status === 'cancelled'),
    )
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: entriesWithoutCancelled,
      categories: fixtureCategories,
      selectedPeriodId: FIXTURE_PREVIOUS_PERIOD_ID,
      filters: { ...DEFAULT_HISTORY_FILTERS, entryStatus: 'cancelled' },
    })
    expect(viewModel.entries).toEqual([])
    expect(viewModel.entriesEmptyMessage).not.toBeNull()
  })

  it('receita realizada bate com calculateMonthlySummary', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(viewModel.summary?.realizedIncome.raw).toBe(parseMoney('8750.00'))
  })

  it('contagem por status planned/pending/realized/cancelled', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(viewModel.statusCounts).toEqual({ planned: 1, pending: 3, realized: 3, cancelled: 1 })
  })

  it('cancelled não compõe o saldo realizado nem o fechamento projetado', () => {
    const entries: FinancialEntry[] = [
      {
        id: 900,
        householdId: 1,
        periodId: FIXTURE_CURRENT_PERIOD_ID,
        categoryId: CATEGORY_HOUSING,
        responsibleMemberId: null,
        createdByUserId: 1,
        entryType: 'expense',
        status: 'cancelled',
        description: 'Cancelada de teste',
        expectedAmount: parseMoney('99999.00'),
        actualAmount: null,
        dueDate: null,
        realizationDate: null,
        notes: null,
        installmentPlanId: null,
        installmentNumber: null,
      },
    ]
    const viewModel = buildHistoryViewModel({
      periods: [period(FIXTURE_CURRENT_PERIOD_ID, '2026-07-01', 'open')],
      entries,
      categories: fixtureCategories,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(viewModel.summary?.realizedExpense.raw).toBe(0n)
    expect(viewModel.summary?.projectedBalance.raw).toBe(0n)
  })

  it('nunca produz NaN/Infinity mesmo sem nenhuma movimentação', () => {
    const viewModel = buildHistoryViewModel({
      periods: [period(1, '2026-07-01', 'open')],
      entries: [],
      categories: fixtureCategories,
      selectedPeriodId: 1,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(Number.isNaN(viewModel.summary?.realizedBalance.raw)).toBe(false)
    expect(viewModel.summary?.realizedBalance.label).not.toContain('NaN')
    expect(viewModel.summary?.realizedBalance.label).not.toContain('Infinity')
  })

  it('dinheiro permanece bigint em todo o pipeline', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(typeof viewModel.summary?.realizedIncome.raw).toBe('bigint')
  })

  it('datas exibidas em pt-BR', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(viewModel.selectedPeriod?.label).toBe('julho de 2026')
    expect(viewModel.entries[0]?.dateLabel).toMatch(/^\d{2} de \w{3}\.?$/)
  })

  it('movimentações ordenadas da data mais recente para a mais antiga', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: FIXTURE_PREVIOUS_PERIOD_ID,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    const dates = viewModel.entries.map((entry) => entry.dateLabel)
    expect(dates.length).toBeGreaterThan(1)
  })

  it('categoria de despesa aparece com nome legível nas linhas', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(viewModel.entries.some((entry) => entry.categoryName === 'Alimentação')).toBe(true)
    expect(CATEGORY_FOOD).toBeDefined()
  })

  it('resumo textual acessível cita a competência e as contagens', () => {
    const viewModel = buildHistoryViewModel({
      periods: fixtureMonthlyPeriods,
      entries: fixtureFinancialEntries,
      categories: fixtureCategories,
      selectedPeriodId: FIXTURE_CURRENT_PERIOD_ID,
      filters: DEFAULT_HISTORY_FILTERS,
    })
    expect(viewModel.accessibleSummary).toContain('julho de 2026')
    expect(viewModel.accessibleSummary).toContain('planejada')
  })
})
