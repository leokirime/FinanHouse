import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import type { FinancialEntry as FinancialEntryRow } from '../../../../db/types.js'
import { UnexpectedPersistedValueError } from '../persistence-errors.js'
import { toDomainFinancialEntry, toPersistenceFinancialEntry } from './financial-entry-mapper.js'

function buildRow(overrides: Partial<FinancialEntryRow> = {}): FinancialEntryRow {
  return {
    id: 1,
    householdId: 10,
    periodId: 100,
    categoryId: 200,
    responsibleMemberId: null,
    responsibleMemberHouseholdId: null,
    createdByUserId: 300,
    entryType: 'expense',
    status: 'planned',
    description: 'Aluguel',
    expectedAmount: '1234.56',
    actualAmount: null,
    dueDate: '2026-08-05',
    realizationDate: null,
    notes: null,
    installmentPlanId: null,
    installmentNumber: null,
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    ...overrides,
  }
}

describe('toDomainFinancialEntry', () => {
  it('mapeia uma movimentação sem responsável', () => {
    const entry = toDomainFinancialEntry(buildRow())
    expect(entry.responsibleMemberId).toBeNull()
    expect(entry.id).toBe(1)
    expect(entry.householdId).toBe(10)
    expect(entry.description).toBe('Aluguel')
  })

  it('mapeia uma movimentação com responsável, sem expor a coluna auxiliar', () => {
    const row = buildRow({ responsibleMemberId: 50, responsibleMemberHouseholdId: 10 })
    const entry = toDomainFinancialEntry(row)
    expect(entry.responsibleMemberId).toBe(50)
    expect('responsibleMemberHouseholdId' in entry).toBe(false)
  })

  it('converte dinheiro em centavos sem perda de precisão', () => {
    const entry = toDomainFinancialEntry(buildRow({ expectedAmount: '1234.56', actualAmount: '1234.56' }))
    expect(entry.expectedAmount).toBe(123456n)
    expect(entry.actualAmount).toBe(123456n)
  })

  it('mapeia actualAmount nulo como null, não zero', () => {
    const entry = toDomainFinancialEntry(buildRow({ actualAmount: null }))
    expect(entry.actualAmount).toBeNull()
  })

  it('preserva campos opcionais nulos (dueDate, realizationDate, notes)', () => {
    const entry = toDomainFinancialEntry(buildRow({ dueDate: null, realizationDate: null, notes: null }))
    expect(entry.dueDate).toBeNull()
    expect(entry.realizationDate).toBeNull()
    expect(entry.notes).toBeNull()
  })

  it('lança UnexpectedPersistedValueError para entry_type inesperado', () => {
    expect(() => toDomainFinancialEntry(buildRow({ entryType: 'transfer' }))).toThrow(UnexpectedPersistedValueError)
  })

  it('lança UnexpectedPersistedValueError para status inesperado', () => {
    expect(() => toDomainFinancialEntry(buildRow({ status: 'archived' }))).toThrow(UnexpectedPersistedValueError)
  })
})

describe('toPersistenceFinancialEntry', () => {
  it('deriva responsibleMemberHouseholdId = householdId quando há responsável', () => {
    const values = toPersistenceFinancialEntry({
      id: 1,
      householdId: 10,
      periodId: 100,
      categoryId: 200,
      responsibleMemberId: 50,
      createdByUserId: 300,
      entryType: 'expense',
      status: 'planned',
      description: 'Aluguel',
      expectedAmount: parseMoney('1234.56'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
      installmentPlanId: null,
      installmentNumber: null,
    })
    expect(values.responsibleMemberId).toBe(50)
    expect(values.responsibleMemberHouseholdId).toBe(10)
  })

  it('mantém responsibleMemberHouseholdId nulo quando não há responsável', () => {
    const values = toPersistenceFinancialEntry({
      id: 1,
      householdId: 10,
      periodId: 100,
      categoryId: 200,
      responsibleMemberId: null,
      createdByUserId: 300,
      entryType: 'expense',
      status: 'planned',
      description: 'Aluguel',
      expectedAmount: parseMoney('1234.56'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
      installmentPlanId: null,
      installmentNumber: null,
    })
    expect(values.responsibleMemberId).toBeNull()
    expect(values.responsibleMemberHouseholdId).toBeNull()
  })

  it('formata dinheiro de volta para string decimal com duas casas', () => {
    const values = toPersistenceFinancialEntry({
      id: 1,
      householdId: 10,
      periodId: 100,
      categoryId: 200,
      responsibleMemberId: null,
      createdByUserId: 300,
      entryType: 'income',
      status: 'planned',
      description: 'Salário',
      expectedAmount: parseMoney('5000.00'),
      actualAmount: parseMoney('5000.00'),
      dueDate: null,
      realizationDate: null,
      notes: null,
      installmentPlanId: null,
      installmentNumber: null,
    })
    expect(values.expectedAmount).toBe('5000.00')
    expect(values.actualAmount).toBe('5000.00')
  })

  it('round trip domínio → persistência → domínio preserva os valores', () => {
    const original = toDomainFinancialEntry(buildRow({ responsibleMemberId: 50, responsibleMemberHouseholdId: 10 }))
    const persisted = toPersistenceFinancialEntry(original)
    const roundTripped = toDomainFinancialEntry(buildRow({ ...persisted } as FinancialEntryRow))
    expect(roundTripped).toEqual(original)
  })
})
