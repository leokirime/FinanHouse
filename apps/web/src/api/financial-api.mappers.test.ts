import { describe, expect, it } from 'vitest'
import { categoryBudgetFromDto, categoryFromDto, financialEntryFromDto, moneyFromDto, moneyToDto } from './financial-api.mappers.ts'

describe('fronteira dinheiro (string decimal ↔ Money/bigint)', () => {
  it('moneyFromDto converte "1000.00" em 100000n (centavos)', () => {
    expect(moneyFromDto('1000.00')).toBe(100000n)
  })

  it('moneyToDto converte 100000n em "1000.00"', () => {
    expect(moneyToDto(100000n)).toBe('1000.00')
  })

  it('nunca usa Number()/parseFloat — precisão preservada em valores grandes', () => {
    expect(moneyFromDto('12345678.90')).toBe(1234567890n)
    expect(moneyToDto(1234567890n)).toBe('12345678.90')
  })
})

describe('financialEntryFromDto', () => {
  it('converte expectedAmount/actualAmount de string para Money, preservando null', () => {
    const entry = financialEntryFromDto({
      id: 1,
      householdId: 1,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'expense',
      status: 'planned',
      description: 'Aluguel',
      expectedAmount: '1000.00',
      actualAmount: null,
      dueDate: '2026-08-05',
      realizationDate: null,
      notes: null,
      installmentPlanId: null,
      installmentNumber: null,
    })

    expect(entry.expectedAmount).toBe(100000n)
    expect(entry.actualAmount).toBeNull()
  })
})

describe('categoryFromDto', () => {
  it('mapeia campos 1:1 (camelCase já compatível com o domínio)', () => {
    const category = categoryFromDto({ id: 3, householdId: 1, name: 'Moradia', entryType: 'expense', status: 'active' })
    expect(category).toEqual({ id: 3, householdId: 1, name: 'Moradia', entryType: 'expense', status: 'active' })
  })
})

describe('categoryBudgetFromDto', () => {
  it('mapeia campos 1:1 e converte limitAmount de string para Money (Bloco 18)', () => {
    const budget = categoryBudgetFromDto({ id: 1, householdId: 1, periodId: 7, categoryId: 3, limitAmount: '2000.00' })
    expect(budget).toEqual({ id: 1, householdId: 1, periodId: 7, categoryId: 3, limitAmount: 200000n })
  })
})
