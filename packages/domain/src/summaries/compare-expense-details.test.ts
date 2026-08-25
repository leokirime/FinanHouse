import { describe, expect, it } from 'vitest'
import type { FinancialEntry } from '../financial-entry/financial-entry.js'
import { parseMoney } from '../money/money.js'
import {
  compareExpenseCategoryTotals,
  detectNewAndDiscontinuedExpenses,
  normalizeDescriptionForComparison,
} from './compare-expense-details.js'

function entry(periodId: number, overrides: Partial<FinancialEntry> = {}): FinancialEntry {
  return {
    id: Math.floor(Math.random() * 1_000_000),
    householdId: 1,
    periodId,
    categoryId: 20,
    responsibleMemberId: null,
    createdByUserId: 40,
    entryType: 'expense',
    status: 'realized',
    description: 'Movimentação de teste',
    expectedAmount: parseMoney('100.00'),
    actualAmount: parseMoney('100.00'),
    dueDate: null,
    realizationDate: '2026-07-05',
    notes: null,
    installmentPlanId: null,
    installmentNumber: null,
    ...overrides,
  }
}

describe('normalizeDescriptionForComparison', () => {
  it('remove espaços nas pontas', () => {
    expect(normalizeDescriptionForComparison('  Supermercado  ')).toBe('supermercado')
  })

  it('baixa a caixa', () => {
    expect(normalizeDescriptionForComparison('SUPERMERCADO')).toBe('supermercado')
  })

  it('colapsa espaços internos repetidos', () => {
    expect(normalizeDescriptionForComparison('Seguro   do    carro')).toBe('seguro do carro')
  })
})

describe('compareExpenseCategoryTotals', () => {
  it('marca categoria como "increased" quando o total atual é maior', () => {
    const previous = [entry(1, { categoryId: 1, actualAmount: parseMoney('100.00'), expectedAmount: parseMoney('100.00') })]
    const current = [entry(2, { categoryId: 1, actualAmount: parseMoney('150.00'), expectedAmount: parseMoney('150.00') })]
    const rows = compareExpenseCategoryTotals({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.direction).toBe('increased')
    expect(rows[0]?.change.absolute).toBe(parseMoney('50.00'))
  })

  it('marca categoria como "decreased" quando o total atual é menor', () => {
    const previous = [entry(1, { categoryId: 1, actualAmount: parseMoney('200.00'), expectedAmount: parseMoney('200.00') })]
    const current = [entry(2, { categoryId: 1, actualAmount: parseMoney('120.00'), expectedAmount: parseMoney('120.00') })]
    const rows = compareExpenseCategoryTotals({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(rows[0]?.direction).toBe('decreased')
  })

  it('marca categoria como "stable" quando o total não muda', () => {
    const previous = [entry(1, { categoryId: 1, actualAmount: parseMoney('80.00'), expectedAmount: parseMoney('80.00') })]
    const current = [entry(2, { categoryId: 1, actualAmount: parseMoney('80.00'), expectedAmount: parseMoney('80.00') })]
    const rows = compareExpenseCategoryTotals({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(rows[0]?.direction).toBe('stable')
    expect(rows[0]?.change.absolute).toBe(0n)
  })

  it('marca categoria como "no_base" quando só existe no período atual', () => {
    const current = [entry(2, { categoryId: 1, actualAmount: parseMoney('80.00'), expectedAmount: parseMoney('80.00') })]
    const rows = compareExpenseCategoryTotals({ periodId: 1, entries: [] }, { periodId: 2, entries: current })

    expect(rows[0]?.direction).toBe('no_base')
    expect(rows[0]?.change.percent).toBeNull()
  })

  it('categoria que só existe no período anterior conta como "decreased" (caiu para zero)', () => {
    const previous = [entry(1, { categoryId: 1, actualAmount: parseMoney('80.00'), expectedAmount: parseMoney('80.00') })]
    const rows = compareExpenseCategoryTotals({ periodId: 1, entries: previous }, { periodId: 2, entries: [] })

    expect(rows[0]?.direction).toBe('decreased')
    expect(rows[0]?.currentAmount).toBe(0n)
  })

  it('ordena por maior variação absoluta, maior primeiro', () => {
    const previous = [
      entry(1, { categoryId: 1, actualAmount: parseMoney('100.00'), expectedAmount: parseMoney('100.00') }),
      entry(1, { categoryId: 2, actualAmount: parseMoney('100.00'), expectedAmount: parseMoney('100.00') }),
    ]
    const current = [
      entry(2, { categoryId: 1, actualAmount: parseMoney('110.00'), expectedAmount: parseMoney('110.00') }), // +10
      entry(2, { categoryId: 2, actualAmount: parseMoney('300.00'), expectedAmount: parseMoney('300.00') }), // +200
    ]
    const rows = compareExpenseCategoryTotals({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(rows[0]?.categoryId).toBe(2)
    expect(rows[1]?.categoryId).toBe(1)
  })

  it('categorias canceladas não entram na comparação', () => {
    const previous = [entry(1, { categoryId: 1, status: 'cancelled', actualAmount: null, realizationDate: null })]
    const current = [entry(2, { categoryId: 1, actualAmount: parseMoney('50.00') })]
    const rows = compareExpenseCategoryTotals({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(rows[0]?.direction).toBe('no_base')
  })

  it('nunca produz NaN/Infinity mesmo sem nenhuma movimentação', () => {
    const rows = compareExpenseCategoryTotals({ periodId: 1, entries: [] }, { periodId: 2, entries: [] })
    expect(rows).toEqual([])
  })
})

describe('detectNewAndDiscontinuedExpenses', () => {
  it('detecta uma despesa nova (existe no período atual, não no anterior)', () => {
    const current = [entry(2, { description: 'Assinatura de streaming' })]
    const result = detectNewAndDiscontinuedExpenses({ periodId: 1, entries: [] }, { periodId: 2, entries: current })

    expect(result.newExpenses).toHaveLength(1)
    expect(result.newExpenses[0]?.description).toBe('Assinatura de streaming')
    expect(result.discontinuedExpenses).toHaveLength(0)
  })

  it('detecta uma despesa descontinuada (existia no período anterior, não no atual)', () => {
    const previous = [entry(1, { description: 'Academia' })]
    const result = detectNewAndDiscontinuedExpenses({ periodId: 1, entries: previous }, { periodId: 2, entries: [] })

    expect(result.discontinuedExpenses).toHaveLength(1)
    expect(result.discontinuedExpenses[0]?.description).toBe('Academia')
    expect(result.newExpenses).toHaveLength(0)
  })

  it('a mesma despesa em ambos os períodos não é nem nova nem descontinuada', () => {
    const previous = [entry(1, { categoryId: 1, description: 'Aluguel' })]
    const current = [entry(2, { categoryId: 1, description: 'Aluguel' })]
    const result = detectNewAndDiscontinuedExpenses({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(result.newExpenses).toEqual([])
    expect(result.discontinuedExpenses).toEqual([])
  })

  it('diferenças de maiúsculas/minúsculas e espaçamento não contam como despesas diferentes', () => {
    const previous = [entry(1, { categoryId: 1, description: 'seguro do carro' })]
    const current = [entry(2, { categoryId: 1, description: '  Seguro   do Carro  ' })]
    const result = detectNewAndDiscontinuedExpenses({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(result.newExpenses).toEqual([])
    expect(result.discontinuedExpenses).toEqual([])
  })

  it('a mesma descrição em categorias diferentes conta como despesas diferentes', () => {
    const previous = [entry(1, { categoryId: 1, description: 'Manutenção' })]
    const current = [entry(2, { categoryId: 2, description: 'Manutenção' })]
    const result = detectNewAndDiscontinuedExpenses({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(result.newExpenses).toHaveLength(1)
    expect(result.discontinuedExpenses).toHaveLength(1)
  })

  it('nunca usa o id da movimentação como chave (ids diferem entre competências para a mesma despesa)', () => {
    const previous = [entry(1, { id: 111, categoryId: 1, description: 'Internet' })]
    const current = [entry(2, { id: 999, categoryId: 1, description: 'Internet' })]
    const result = detectNewAndDiscontinuedExpenses({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(result.newExpenses).toEqual([])
    expect(result.discontinuedExpenses).toEqual([])
  })

  it('preserva a descrição original (não normalizada) no resultado exibível', () => {
    const current = [entry(2, { description: '  Seguro   do Carro  ' })]
    const result = detectNewAndDiscontinuedExpenses({ periodId: 1, entries: [] }, { periodId: 2, entries: current })

    expect(result.newExpenses[0]?.description).toBe('  Seguro   do Carro  ')
  })

  it('despesas canceladas nunca aparecem como novas ou descontinuadas', () => {
    const previous = [entry(1, { description: 'Assinatura cancelada', status: 'cancelled', actualAmount: null, realizationDate: null })]
    const current = [entry(2, { description: 'Assinatura cancelada', status: 'cancelled', actualAmount: null, realizationDate: null })]
    const result = detectNewAndDiscontinuedExpenses({ periodId: 1, entries: previous }, { periodId: 2, entries: current })

    expect(result.newExpenses).toEqual([])
    expect(result.discontinuedExpenses).toEqual([])
  })

  it('soma valores de múltiplas movimentações com a mesma identidade no mesmo período', () => {
    const current = [
      entry(2, { description: 'Farmácia', actualAmount: parseMoney('30.00'), expectedAmount: parseMoney('30.00') }),
      entry(2, { description: 'Farmácia', actualAmount: parseMoney('20.00'), expectedAmount: parseMoney('20.00') }),
    ]
    const result = detectNewAndDiscontinuedExpenses({ periodId: 1, entries: [] }, { periodId: 2, entries: current })

    expect(result.newExpenses).toHaveLength(1)
    expect(result.newExpenses[0]?.amount).toBe(parseMoney('50.00'))
  })

  it('receitas não entram na detecção de despesas novas/descontinuadas', () => {
    const current = [entry(2, { entryType: 'income', description: 'Salário' })]
    const result = detectNewAndDiscontinuedExpenses({ periodId: 1, entries: [] }, { periodId: 2, entries: current })

    expect(result.newExpenses).toEqual([])
  })

  it('ordena por maior valor primeiro', () => {
    const current = [
      entry(2, { description: 'Pequena', actualAmount: parseMoney('10.00'), expectedAmount: parseMoney('10.00') }),
      entry(2, { description: 'Grande', actualAmount: parseMoney('500.00'), expectedAmount: parseMoney('500.00') }),
    ]
    const result = detectNewAndDiscontinuedExpenses({ periodId: 1, entries: [] }, { periodId: 2, entries: current })

    expect(result.newExpenses[0]?.description).toBe('Grande')
  })
})
