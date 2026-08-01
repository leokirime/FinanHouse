import { describe, expect, it } from 'vitest'
import { CATEGORY_FOOD, fixtureCategories, fixtureFinancialEntries, FIXTURE_CURRENT_PERIOD_ID } from '../state/test-support/finance-test-fixtures.ts'
import {
  buildFinancialEntryRow,
  DEFAULT_FINANCIAL_ENTRIES_FILTERS,
  filterFinancialEntries,
} from './financial-entries-view-model.ts'

const currentEntries = fixtureFinancialEntries.filter((entry) => entry.periodId === FIXTURE_CURRENT_PERIOD_ID)

describe('filterFinancialEntries', () => {
  it('sem filtros, retorna todas as movimentações da competência atual', () => {
    const result = filterFinancialEntries(fixtureFinancialEntries, fixtureCategories, FIXTURE_CURRENT_PERIOD_ID, DEFAULT_FINANCIAL_ENTRIES_FILTERS)
    expect(result).toHaveLength(currentEntries.length)
  })

  it('busca por descrição, sem diferenciar maiúsculas/minúsculas', () => {
    const result = filterFinancialEntries(fixtureFinancialEntries, fixtureCategories, FIXTURE_CURRENT_PERIOD_ID, {
      ...DEFAULT_FINANCIAL_ENTRIES_FILTERS,
      search: 'SEGURO',
    })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((entry) => entry.description.toLowerCase().includes('seguro'))).toBe(true)
  })

  it('busca por nome de categoria, sem diferenciar maiúsculas/minúsculas', () => {
    const result = filterFinancialEntries(fixtureFinancialEntries, fixtureCategories, FIXTURE_CURRENT_PERIOD_ID, {
      ...DEFAULT_FINANCIAL_ENTRIES_FILTERS,
      search: 'transporte',
    })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((entry) => entry.categoryId === 5)).toBe(true)
  })

  it('filtra por tipo (income/expense)', () => {
    const incomeOnly = filterFinancialEntries(fixtureFinancialEntries, fixtureCategories, FIXTURE_CURRENT_PERIOD_ID, {
      ...DEFAULT_FINANCIAL_ENTRIES_FILTERS,
      type: 'income',
    })
    expect(incomeOnly.length).toBeGreaterThan(0)
    expect(incomeOnly.every((entry) => entry.entryType === 'income')).toBe(true)
  })

  it('filtra por status', () => {
    const cancelledOnly = filterFinancialEntries(fixtureFinancialEntries, fixtureCategories, FIXTURE_CURRENT_PERIOD_ID, {
      ...DEFAULT_FINANCIAL_ENTRIES_FILTERS,
      status: 'cancelled',
    })
    expect(cancelledOnly.length).toBeGreaterThan(0)
    expect(cancelledOnly.every((entry) => entry.status === 'cancelled')).toBe(true)
  })

  it('filtra por categoria', () => {
    const foodOnly = filterFinancialEntries(fixtureFinancialEntries, fixtureCategories, FIXTURE_CURRENT_PERIOD_ID, {
      ...DEFAULT_FINANCIAL_ENTRIES_FILTERS,
      categoryId: CATEGORY_FOOD,
    })
    expect(foodOnly.length).toBeGreaterThan(0)
    expect(foodOnly.every((entry) => entry.categoryId === CATEGORY_FOOD)).toBe(true)
  })

  it('combina filtros sem nunca produzir NaN/Infinity nos rótulos derivados', () => {
    const result = filterFinancialEntries(fixtureFinancialEntries, fixtureCategories, FIXTURE_CURRENT_PERIOD_ID, {
      type: 'expense',
      status: 'pending',
      categoryId: 'all',
      search: '',
    })
    for (const entry of result) {
      const row = buildFinancialEntryRow(entry, fixtureCategories)
      expect(row.expectedAmountLabel).not.toContain('NaN')
      expect(row.expectedAmountLabel).not.toContain('Infinity')
    }
  })

  it('retorna lista vazia quando nada corresponde (estado vazio)', () => {
    const result = filterFinancialEntries(fixtureFinancialEntries, fixtureCategories, FIXTURE_CURRENT_PERIOD_ID, {
      ...DEFAULT_FINANCIAL_ENTRIES_FILTERS,
      search: 'termo que definitivamente não existe em nenhuma movimentação',
    })
    expect(result).toEqual([])
  })
})

describe('buildFinancialEntryRow', () => {
  it('marca corretamente as ações disponíveis por status', () => {
    const planned = currentEntries.find((entry) => entry.status === 'planned')!
    const pending = currentEntries.find((entry) => entry.status === 'pending')!
    const realized = currentEntries.find((entry) => entry.status === 'realized')!
    const cancelled = currentEntries.find((entry) => entry.status === 'cancelled')!

    const plannedRow = buildFinancialEntryRow(planned, fixtureCategories)
    expect(plannedRow.canEdit).toBe(true)
    expect(plannedRow.canMarkPending).toBe(true)
    expect(plannedRow.canRealize).toBe(true)
    expect(plannedRow.canCancel).toBe(true)

    const pendingRow = buildFinancialEntryRow(pending, fixtureCategories)
    expect(pendingRow.canEdit).toBe(true)
    expect(pendingRow.canMarkPending).toBe(false)
    expect(pendingRow.canRealize).toBe(true)
    expect(pendingRow.canCancel).toBe(true)

    const realizedRow = buildFinancialEntryRow(realized, fixtureCategories)
    expect(realizedRow.canEdit).toBe(false)
    expect(realizedRow.editBlockedReason).toBeTruthy()
    expect(realizedRow.canRevertRealization).toBe(true)

    const cancelledRow = buildFinancialEntryRow(cancelled, fixtureCategories)
    expect(cancelledRow.canEdit).toBe(false)
    expect(cancelledRow.canReactivate).toBe(true)
  })
})
