import type { FinancialEntry } from '@finanhouse/domain'
import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import { CATEGORY_FOOD, fixtureCategories, fixtureFinancialEntries, FIXTURE_CURRENT_PERIOD_ID, FIXTURE_HOUSEHOLD_ID } from '../state/test-support/finance-test-fixtures.ts'
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
    expect(plannedRow.canDelete).toBe(true)

    const pendingRow = buildFinancialEntryRow(pending, fixtureCategories)
    expect(pendingRow.canEdit).toBe(true)
    expect(pendingRow.canMarkPending).toBe(false)
    expect(pendingRow.canRealize).toBe(true)
    expect(pendingRow.canDelete).toBe(true)

    const realizedRow = buildFinancialEntryRow(realized, fixtureCategories)
    expect(realizedRow.canEdit).toBe(false)
    expect(realizedRow.editBlockedReason).toBeTruthy()
    expect(realizedRow.canRevertRealization).toBe(true)
    // Bloco 20 (ajuste pós-revisão): "realized" pode ser excluída — só a competência aberta é exigida, verificada pelo backend.
    expect(realizedRow.canDelete).toBe(true)

    const cancelledRow = buildFinancialEntryRow(cancelled, fixtureCategories)
    expect(cancelledRow.canEdit).toBe(false)
    expect(cancelledRow.canReactivate).toBe(true)
    expect(cancelledRow.canDelete).toBe(false)
  })
})

/**
 * Sessão 12, Bloco 06 — lacuna identificada na abertura do bloco: nenhuma
 * ocorrência de `installmentPlanId`/`installmentNumber` existia em
 * `financial-entries-view-model.ts` (confirmado por `grep` antes desta
 * implementação) — uma parcela aparecia em Movimentações indistinguível de
 * um lançamento avulso. `installmentLabel` é o ajuste mínimo: puramente
 * visual, nunca usado em cálculo, nunca persiste, total sempre vem de
 * `InstallmentPlan.installmentCount` (nunca inferido/recalculado aqui).
 */
describe('buildFinancialEntryRow — rotulagem de parcela (Sessão 12, Bloco 06)', () => {
  function installmentEntry(installmentNumber: number): FinancialEntry {
    return {
      id: 9800,
      householdId: FIXTURE_HOUSEHOLD_ID,
      periodId: FIXTURE_CURRENT_PERIOD_ID,
      categoryId: CATEGORY_FOOD,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'expense',
      status: 'planned',
      description: 'Geladeira',
      expectedAmount: parseMoney('300.00'),
      actualAmount: null,
      dueDate: '2026-07-10',
      realizationDate: null,
      notes: null,
      installmentPlanId: 999,
      installmentNumber,
    }
  }

  it('lançamento avulso (installmentPlanId/installmentNumber null) não recebe nenhum rótulo de parcela', () => {
    const avulso = currentEntries.find((entry) => entry.installmentPlanId === null)!
    const row = buildFinancialEntryRow(avulso, fixtureCategories)
    expect(row.installmentLabel).toBeNull()
  })

  it('com o total do plano disponível, mostra "Parcela N/Total"', () => {
    const row = buildFinancialEntryRow(installmentEntry(3), fixtureCategories, new Map([[999, 10]]))
    expect(row.installmentLabel).toBe('Parcela 3/10')
  })

  it('sem o total do plano disponível (mapa ausente ou plano não encontrado), mostra só "Parcela N" — nunca inventa o total', () => {
    const rowSemMapa = buildFinancialEntryRow(installmentEntry(3), fixtureCategories)
    expect(rowSemMapa.installmentLabel).toBe('Parcela 3')

    const rowPlanoNaoEncontrado = buildFinancialEntryRow(installmentEntry(3), fixtureCategories, new Map([[111, 5]]))
    expect(rowPlanoNaoEncontrado.installmentLabel).toBe('Parcela 3')
  })

  it('o rótulo nunca depende de contar parcelas irmãs nem de inferir pela descrição — é puramente function do próprio entry + do mapa de totais', () => {
    // A descrição não menciona "10" em lugar nenhum; ainda assim o total exibido vem do mapa, nunca de heurística textual.
    const entry = installmentEntry(1)
    expect(entry.description).toBe('Geladeira')
    const row = buildFinancialEntryRow(entry, fixtureCategories, new Map([[999, 10]]))
    expect(row.installmentLabel).toBe('Parcela 1/10')
  })
})
