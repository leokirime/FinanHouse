import { describe, expect, it } from 'vitest'
import { createFinancialEntry } from '../financial-entry/financial-entry-rules.js'
import type { Category } from '../category/category.js'
import { HouseholdMismatchError, InvalidDateError, InvalidPeriodTransitionError, MissingRealizationDataError } from '../errors/domain-errors.js'
import { parseMoney } from '../money/money.js'
import type { MonthlyPeriod } from './monthly-period.js'
import {
  closeMonthlyPeriod,
  openMonthlyPeriod,
  reopenMonthlyPeriod,
  reopenMonthlyPeriodFromReview,
  startMonthlyPeriodReview,
} from './monthly-period-rules.js'

const HOUSEHOLD_ID = 1

function makeCategory(overrides: Partial<Category> = {}): Category {
  return { id: 20, householdId: HOUSEHOLD_ID, name: 'Mercado', entryType: 'expense', status: 'active', ...overrides }
}

function makeEntry(period: MonthlyPeriod) {
  return createFinancialEntry(
    {
      id: 1,
      householdId: HOUSEHOLD_ID,
      periodId: period.id,
      categoryId: 20,
      responsibleMemberId: null,
      createdByUserId: 40,
      entryType: 'expense',
      description: 'Compras',
      expectedAmount: parseMoney('100.00'),
      dueDate: null,
      notes: null,
    },
    { period, category: makeCategory() },
  )
}

describe('openMonthlyPeriod', () => {
  it('cria uma competência aberta', () => {
    const period = openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    expect(period.status).toBe('open')
    expect(period.closedAt).toBeNull()
    expect(period.closedByUserId).toBeNull()
  })

  it.each(['2026-07-15', '2026-13-01', '2026-7-01', '2026/07/01'])('rejeita reference_month inválido: %s', (value) => {
    expect(() => openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: value })).toThrow(InvalidDateError)
  })
})

describe('transições permitidas', () => {
  it('open → review', () => {
    const period = openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    expect(startMonthlyPeriodReview(period).status).toBe('review')
  })

  it('review → open', () => {
    const period = startMonthlyPeriodReview(openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' }))
    expect(reopenMonthlyPeriodFromReview(period).status).toBe('open')
  })

  it('review → closed', () => {
    const open = openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    const review = startMonthlyPeriodReview(open)
    const closed = closeMonthlyPeriod(review, [], { closedByUserId: 40, closedAt: '2026-08-01T00:00:00Z' })
    expect(closed.status).toBe('closed')
    expect(closed.closedByUserId).toBe(40)
  })

  it('closed → review (reabertura explícita)', () => {
    const open = openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    const closed = closeMonthlyPeriod(startMonthlyPeriodReview(open), [], {
      closedByUserId: 40,
      closedAt: '2026-08-01T00:00:00Z',
    })
    const reopened = reopenMonthlyPeriod(closed)
    expect(reopened.status).toBe('review')
    expect(reopened.closedAt).toBeNull()
  })
})

describe('transições proibidas', () => {
  it('open não pode fechar diretamente (precisa passar por review)', () => {
    const open = openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    expect(() => closeMonthlyPeriod(open, [], { closedByUserId: 40, closedAt: '2026-08-01T00:00:00Z' })).toThrow(
      InvalidPeriodTransitionError,
    )
  })

  it('closed não pode voltar direto para open', () => {
    const open = openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    const closed = closeMonthlyPeriod(startMonthlyPeriodReview(open), [], {
      closedByUserId: 40,
      closedAt: '2026-08-01T00:00:00Z',
    })
    expect(() => reopenMonthlyPeriodFromReview(closed)).toThrow(InvalidPeriodTransitionError)
  })

  it('review não pode "abrir revisão" de novo', () => {
    const open = openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    const review = startMonthlyPeriodReview(open)
    expect(() => startMonthlyPeriodReview(review)).toThrow(InvalidPeriodTransitionError)
  })

  it('open não pode ser reaberto (reopen exige closed)', () => {
    const open = openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    expect(() => reopenMonthlyPeriod(open)).toThrow(InvalidPeriodTransitionError)
  })
})

describe('fechamento', () => {
  it('valida que todas as movimentações pertencem à competência', () => {
    const period = openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    const otherPeriod = openMonthlyPeriod({ id: 2, householdId: HOUSEHOLD_ID, referenceMonth: '2026-08-01' })
    const foreignEntry = makeEntry(otherPeriod)
    const review = startMonthlyPeriodReview(period)
    expect(() => closeMonthlyPeriod(review, [foreignEntry], { closedByUserId: 40, closedAt: '2026-08-01T00:00:00Z' })).toThrow(
      HouseholdMismatchError,
    )
  })

  it('valida invariantes de realização das movimentações', () => {
    const period = openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    const entry = makeEntry(period)
    const invalidEntry = { ...entry, status: 'realized' as const } // realized sem actual_amount/realization_date
    const review = startMonthlyPeriodReview(period)
    expect(() =>
      closeMonthlyPeriod(review, [invalidEntry], { closedByUserId: 40, closedAt: '2026-08-01T00:00:00Z' }),
    ).toThrow(MissingRealizationDataError)
  })

  it('fecha com sucesso quando todas as movimentações são válidas', () => {
    const period = openMonthlyPeriod({ id: 1, householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    const entry = makeEntry(period)
    const review = startMonthlyPeriodReview(period)
    const closed = closeMonthlyPeriod(review, [entry], { closedByUserId: 40, closedAt: '2026-08-01T00:00:00Z' })
    expect(closed.status).toBe('closed')
  })
})
