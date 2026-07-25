import { type Category, parseMoney } from '@finanhouse/domain'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryCategoryRepository } from '../../infrastructure/repositories/memory/in-memory-category-repository.js'
import { InMemoryFinancialEntryRepository } from '../../infrastructure/repositories/memory/in-memory-financial-entry-repository.js'
import { InMemoryHouseholdMemberRepository } from '../../infrastructure/repositories/memory/in-memory-household-member-repository.js'
import { InMemoryMonthlyPeriodRepository } from '../../infrastructure/repositories/memory/in-memory-monthly-period-repository.js'
import { CreateFinancialEntryService, RealizeFinancialEntryService } from './financial-entry-services.js'
import { OpenMonthlyPeriodService } from './monthly-period-services.js'
import { CalculateMonthlySummaryService, CompareMonthlyPeriodsService } from './summary-services.js'

const HOUSEHOLD_ID = 1
const category: Category = { id: 1, householdId: HOUSEHOLD_ID, name: 'Salário', entryType: 'income', status: 'active' }

describe('serviços de resumo e comparação (repositórios em memória)', () => {
  const entries = new InMemoryFinancialEntryRepository()
  const periods = new InMemoryMonthlyPeriodRepository()
  const categories = new InMemoryCategoryRepository()
  const members = new InMemoryHouseholdMemberRepository()
  const periodDeps = { periods, entries }
  const entryDeps = { entries, periods, categories, members }
  const summaryDeps = { entries }

  beforeEach(() => {
    entries.reset()
    periods.reset()
    categories.reset()
    members.reset()
    categories.seed([category])
  })

  it('calcula o resumo mensal a partir das movimentações persistidas', async () => {
    const period = await new OpenMonthlyPeriodService(periodDeps).execute({
      householdId: HOUSEHOLD_ID,
      referenceMonth: '2026-07-01',
    })
    const created = await new CreateFinancialEntryService(entryDeps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: period.id,
      categoryId: category.id,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'income',
      description: 'Salário',
      expectedAmount: parseMoney('3000.00'),
      dueDate: null,
      notes: null,
    })
    await new RealizeFinancialEntryService(entryDeps).execute(created.id, {
      actualAmount: parseMoney('3000.00'),
      realizationDate: '2026-07-05',
    })

    const summary = await new CalculateMonthlySummaryService(summaryDeps).execute(period.id)
    expect(summary.realizedIncome).toBe(parseMoney('3000.00'))
    expect(summary.realizedBalance).toBe(parseMoney('3000.00'))
  })

  it('compara duas competências persistidas', async () => {
    const previous = await new OpenMonthlyPeriodService(periodDeps).execute({
      householdId: HOUSEHOLD_ID,
      referenceMonth: '2026-06-01',
    })
    const current = await new OpenMonthlyPeriodService(periodDeps).execute({
      householdId: HOUSEHOLD_ID,
      referenceMonth: '2026-07-01',
    })

    const previousEntry = await new CreateFinancialEntryService(entryDeps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: previous.id,
      categoryId: category.id,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'income',
      description: 'Salário',
      expectedAmount: parseMoney('3000.00'),
      dueDate: null,
      notes: null,
    })
    await new RealizeFinancialEntryService(entryDeps).execute(previousEntry.id, {
      actualAmount: parseMoney('3000.00'),
      realizationDate: '2026-06-05',
    })

    const currentEntry = await new CreateFinancialEntryService(entryDeps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: current.id,
      categoryId: category.id,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'income',
      description: 'Salário',
      expectedAmount: parseMoney('3300.00'),
      dueDate: null,
      notes: null,
    })
    await new RealizeFinancialEntryService(entryDeps).execute(currentEntry.id, {
      actualAmount: parseMoney('3300.00'),
      realizationDate: '2026-07-05',
    })

    const comparison = await new CompareMonthlyPeriodsService(summaryDeps).execute(previous.id, current.id)
    expect(comparison.incomeChange.absolute).toBe(parseMoney('300.00'))
    expect(comparison.incomeChange.percent).toBe(10)
  })
})
