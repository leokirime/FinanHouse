import { describe, expect, it } from 'vitest'
import type { Category as CategoryRow } from '../../../../db/types.js'
import { UnexpectedPersistedValueError } from '../persistence-errors.js'
import { toDomainCategory } from './category-mapper.js'

function buildRow(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: 1,
    householdId: 10,
    name: 'Mercado',
    entryType: 'expense',
    status: 'active',
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    ...overrides,
  }
}

describe('toDomainCategory', () => {
  it('mapeia uma categoria ativa', () => {
    const category = toDomainCategory(buildRow())
    expect(category).toEqual({ id: 1, householdId: 10, name: 'Mercado', entryType: 'expense', status: 'active' })
  })

  it('lança UnexpectedPersistedValueError para entry_type inesperado', () => {
    expect(() => toDomainCategory(buildRow({ entryType: 'transfer' }))).toThrow(UnexpectedPersistedValueError)
  })

  it('lança UnexpectedPersistedValueError para status inesperado', () => {
    expect(() => toDomainCategory(buildRow({ status: 'archived' }))).toThrow(UnexpectedPersistedValueError)
  })
})
