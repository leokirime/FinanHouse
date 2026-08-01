import { describe, expect, it } from 'vitest'
import type { MonthlyPeriod as MonthlyPeriodRow } from '../../../../db/types.js'
import { UnexpectedPersistedValueError } from '../persistence-errors.js'
import { toDomainMonthlyPeriod, toPersistenceMonthlyPeriod } from './monthly-period-mapper.js'

function buildRow(overrides: Partial<MonthlyPeriodRow> = {}): MonthlyPeriodRow {
  return {
    id: 1,
    householdId: 10,
    referenceMonth: '2026-07-01',
    status: 'open',
    closedAt: null,
    closedByUserId: null,
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    ...overrides,
  }
}

describe('toDomainMonthlyPeriod', () => {
  it('mapeia um período aberto sem data de fechamento', () => {
    const period = toDomainMonthlyPeriod(buildRow())
    expect(period.status).toBe('open')
    expect(period.closedAt).toBeNull()
    expect(period.closedByUserId).toBeNull()
  })

  it('preserva a semântica de competência mensal (referenceMonth) sem alteração de dia por timezone', () => {
    const period = toDomainMonthlyPeriod(buildRow({ referenceMonth: '2026-07-01' }))
    expect(period.referenceMonth).toBe('2026-07-01')
  })

  it('converte closedAt de Date para string ISO', () => {
    const period = toDomainMonthlyPeriod(
      buildRow({ status: 'closed', closedAt: new Date('2026-08-01T12:00:00Z'), closedByUserId: 5 }),
    )
    expect(period.closedAt).toBe('2026-08-01T12:00:00.000Z')
    expect(period.closedByUserId).toBe(5)
  })

  it('lança UnexpectedPersistedValueError para status inesperado', () => {
    expect(() => toDomainMonthlyPeriod(buildRow({ status: 'archived' }))).toThrow(UnexpectedPersistedValueError)
  })
})

describe('toPersistenceMonthlyPeriod', () => {
  it('converte closedAt de string ISO para Date', () => {
    const values = toPersistenceMonthlyPeriod({
      id: 1,
      householdId: 10,
      referenceMonth: '2026-07-01',
      status: 'closed',
      closedAt: '2026-08-01T12:00:00.000Z',
      closedByUserId: 5,
    })
    expect(values.closedAt).toBeInstanceOf(Date)
    expect((values.closedAt as Date).toISOString()).toBe('2026-08-01T12:00:00.000Z')
  })

  it('mantém closedAt nulo quando o período está aberto', () => {
    const values = toPersistenceMonthlyPeriod({
      id: 1,
      householdId: 10,
      referenceMonth: '2026-07-01',
      status: 'open',
      closedAt: null,
      closedByUserId: null,
    })
    expect(values.closedAt).toBeNull()
  })

  it('round trip domínio → persistência → domínio preserva o status e a competência', () => {
    const original = toDomainMonthlyPeriod(buildRow({ status: 'review' }))
    const persisted = toPersistenceMonthlyPeriod(original)
    const roundTripped = toDomainMonthlyPeriod(buildRow({ ...persisted } as MonthlyPeriodRow))
    expect(roundTripped.status).toBe(original.status)
    expect(roundTripped.referenceMonth).toBe(original.referenceMonth)
  })
})
