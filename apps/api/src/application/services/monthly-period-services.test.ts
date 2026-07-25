import { type Category, InvalidPeriodTransitionError, parseMoney } from '@finanhouse/domain'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryCategoryRepository } from '../../infrastructure/repositories/memory/in-memory-category-repository.js'
import { InMemoryFinancialEntryRepository } from '../../infrastructure/repositories/memory/in-memory-financial-entry-repository.js'
import { InMemoryHouseholdMemberRepository } from '../../infrastructure/repositories/memory/in-memory-household-member-repository.js'
import { InMemoryMonthlyPeriodRepository } from '../../infrastructure/repositories/memory/in-memory-monthly-period-repository.js'
import { CreateFinancialEntryService } from './financial-entry-services.js'
import {
  CloseMonthlyPeriodService,
  OpenMonthlyPeriodService,
  ReopenMonthlyPeriodService,
  StartMonthlyPeriodReviewService,
} from './monthly-period-services.js'

const HOUSEHOLD_ID = 1
const category: Category = { id: 1, householdId: HOUSEHOLD_ID, name: 'Mercado', entryType: 'expense', status: 'active' }

describe('serviços de competência mensal (repositórios em memória)', () => {
  const entries = new InMemoryFinancialEntryRepository()
  const periods = new InMemoryMonthlyPeriodRepository()
  const categories = new InMemoryCategoryRepository()
  const members = new InMemoryHouseholdMemberRepository()
  const periodDeps = { periods, entries }
  const entryDeps = { entries, periods, categories, members }

  beforeEach(() => {
    entries.reset()
    periods.reset()
    categories.reset()
    members.reset()
    categories.seed([category])
  })

  it('abre, revisa e fecha uma competência de ponta a ponta', async () => {
    const opened = await new OpenMonthlyPeriodService(periodDeps).execute({
      householdId: HOUSEHOLD_ID,
      referenceMonth: '2026-07-01',
    })
    expect(opened.status).toBe('open')

    const review = await new StartMonthlyPeriodReviewService(periodDeps).execute(opened.id)
    expect(review.status).toBe('review')

    const closed = await new CloseMonthlyPeriodService(periodDeps).execute(opened.id, {
      closedByUserId: 1,
      closedAt: '2026-08-01T00:00:00Z',
    })
    expect(closed.status).toBe('closed')

    const reopened = await new ReopenMonthlyPeriodService(periodDeps).execute(opened.id)
    expect(reopened.status).toBe('review')
  })

  it('rejeita fechamento direto sem passar por revisão', async () => {
    const opened = await new OpenMonthlyPeriodService(periodDeps).execute({
      householdId: HOUSEHOLD_ID,
      referenceMonth: '2026-07-01',
    })
    await expect(
      new CloseMonthlyPeriodService(periodDeps).execute(opened.id, { closedByUserId: 1, closedAt: '2026-08-01T00:00:00Z' }),
    ).rejects.toThrow(InvalidPeriodTransitionError)
  })

  it('fechamento carrega as movimentações reais do repositório para validação', async () => {
    const opened = await new OpenMonthlyPeriodService(periodDeps).execute({
      householdId: HOUSEHOLD_ID,
      referenceMonth: '2026-07-01',
    })
    await new CreateFinancialEntryService(entryDeps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: opened.id,
      categoryId: category.id,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'expense',
      description: 'Compras',
      expectedAmount: parseMoney('50.00'),
      dueDate: null,
      notes: null,
    })
    await new StartMonthlyPeriodReviewService(periodDeps).execute(opened.id)
    const closed = await new CloseMonthlyPeriodService(periodDeps).execute(opened.id, {
      closedByUserId: 1,
      closedAt: '2026-08-01T00:00:00Z',
    })
    expect(closed.status).toBe('closed')
  })
})
