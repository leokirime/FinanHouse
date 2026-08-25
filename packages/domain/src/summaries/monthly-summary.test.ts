import { describe, expect, it } from 'vitest'
import type { FinancialEntry } from '../financial-entry/financial-entry.js'
import { parseMoney } from '../money/money.js'
import { calculateMonthlySummary } from './monthly-summary.js'

const PERIOD_ID = 1

function entry(overrides: Partial<FinancialEntry> = {}): FinancialEntry {
  return {
    id: Math.floor(Math.random() * 1_000_000),
    householdId: 1,
    periodId: PERIOD_ID,
    categoryId: 20,
    responsibleMemberId: null,
    createdByUserId: 40,
    entryType: 'expense',
    status: 'planned',
    description: 'Movimentação de teste',
    expectedAmount: parseMoney('100.00'),
    actualAmount: null,
    dueDate: null,
    realizationDate: null,
    notes: null,
    installmentPlanId: null,
    installmentNumber: null,
    ...overrides,
  }
}

describe('calculateMonthlySummary', () => {
  it('retorna zeros para uma competência sem movimentações', () => {
    const summary = calculateMonthlySummary(PERIOD_ID, [])
    expect(summary.expectedIncome).toBe(0n)
    expect(summary.expectedExpense).toBe(0n)
    expect(summary.expectedBalance).toBe(0n)
    expect(summary.realizedBalance).toBe(0n)
    expect(summary.projectedBalance).toBe(0n)
    expect(summary.entryCount).toBe(0)
    expect(summary.cancelledTotal).toBe(0n)
  })

  it('ignora movimentações de outra competência', () => {
    const summary = calculateMonthlySummary(PERIOD_ID, [entry({ periodId: 999 })])
    expect(summary.entryCount).toBe(0)
  })

  it('calcula previsto somando planned + pending + realized (não cancelled)', () => {
    const entries = [
      entry({ entryType: 'income', status: 'planned', expectedAmount: parseMoney('1000.00') }),
      entry({
        entryType: 'income',
        status: 'realized',
        expectedAmount: parseMoney('500.00'),
        actualAmount: parseMoney('500.00'),
        realizationDate: '2026-07-05',
      }),
      entry({ entryType: 'income', status: 'cancelled', expectedAmount: parseMoney('999.00') }),
    ]
    const summary = calculateMonthlySummary(PERIOD_ID, entries)
    expect(summary.expectedIncome).toBe(parseMoney('1500.00')) // 1000 + 500, sem o cancelado
  })

  it('realizado usa actual_amount, não expected_amount', () => {
    const entries = [
      entry({
        entryType: 'expense',
        status: 'realized',
        expectedAmount: parseMoney('100.00'),
        actualAmount: parseMoney('87.50'),
        realizationDate: '2026-07-05',
      }),
    ]
    const summary = calculateMonthlySummary(PERIOD_ID, entries)
    expect(summary.realizedExpense).toBe(parseMoney('87.50'))
    expect(summary.expectedExpense).toBe(parseMoney('100.00'))
  })

  it('pendente soma apenas expected_amount de entradas pending', () => {
    const entries = [entry({ entryType: 'expense', status: 'pending', expectedAmount: parseMoney('50.00') })]
    const summary = calculateMonthlySummary(PERIOD_ID, entries)
    expect(summary.pendingExpense).toBe(parseMoney('50.00'))
    expect(summary.plannedExpense).toBe(0n)
  })

  it('cancelado não compõe nenhum saldo, apenas cancelledTotal', () => {
    const entries = [
      entry({ entryType: 'expense', status: 'cancelled', expectedAmount: parseMoney('300.00') }),
      entry({ entryType: 'income', status: 'planned', expectedAmount: parseMoney('1000.00') }),
    ]
    const summary = calculateMonthlySummary(PERIOD_ID, entries)
    expect(summary.cancelledTotal).toBe(parseMoney('300.00'))
    expect(summary.expectedExpense).toBe(0n)
    expect(summary.expectedBalance).toBe(parseMoney('1000.00'))
  })

  it('saldo previsto = receitas previstas - despesas previstas', () => {
    const entries = [
      entry({ entryType: 'income', status: 'planned', expectedAmount: parseMoney('3000.00') }),
      entry({ entryType: 'expense', status: 'planned', expectedAmount: parseMoney('1200.00') }),
    ]
    const summary = calculateMonthlySummary(PERIOD_ID, entries)
    expect(summary.expectedBalance).toBe(parseMoney('1800.00'))
  })

  it('saldo realizado = receitas realizadas - despesas realizadas', () => {
    const entries = [
      entry({
        entryType: 'income',
        status: 'realized',
        expectedAmount: parseMoney('3000.00'),
        actualAmount: parseMoney('2900.00'),
        realizationDate: '2026-07-05',
      }),
      entry({
        entryType: 'expense',
        status: 'realized',
        expectedAmount: parseMoney('1200.00'),
        actualAmount: parseMoney('1150.00'),
        realizationDate: '2026-07-06',
      }),
    ]
    const summary = calculateMonthlySummary(PERIOD_ID, entries)
    expect(summary.realizedBalance).toBe(parseMoney('1750.00'))
  })

  it('saldo projetado mistura realizado (actual) + pendente/planejado (expected)', () => {
    const entries = [
      entry({
        entryType: 'income',
        status: 'realized',
        expectedAmount: parseMoney('1000.00'),
        actualAmount: parseMoney('950.00'),
        realizationDate: '2026-07-05',
      }),
      entry({ entryType: 'income', status: 'pending', expectedAmount: parseMoney('300.00') }),
      entry({ entryType: 'income', status: 'planned', expectedAmount: parseMoney('200.00') }),
      entry({
        entryType: 'expense',
        status: 'realized',
        expectedAmount: parseMoney('400.00'),
        actualAmount: parseMoney('420.00'),
        realizationDate: '2026-07-06',
      }),
    ]
    const summary = calculateMonthlySummary(PERIOD_ID, entries)
    // receitas: 950 (realizado) + 300 (pendente) + 200 (planejado) = 1450
    // despesas: 420 (realizado)
    expect(summary.projectedBalance).toBe(parseMoney('1030.00'))
  })

  it('entryCount conta todas as movimentações da competência, incluindo canceladas', () => {
    const entries = [
      entry({ status: 'planned' }),
      entry({ status: 'cancelled' }),
      entry({ status: 'realized', actualAmount: parseMoney('1.00'), realizationDate: '2026-07-01' }),
    ]
    const summary = calculateMonthlySummary(PERIOD_ID, entries)
    expect(summary.entryCount).toBe(3)
  })
})
