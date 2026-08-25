import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryCategoryRepository } from './in-memory-category-repository.js'
import { InMemoryFinancialEntryRepository } from './in-memory-financial-entry-repository.js'
import { InMemoryInstallmentPlanRepository } from './in-memory-installment-plan-repository.js'
import { InMemoryInstallmentTransactionRunner } from './in-memory-installment-transaction-runner.js'
import { InMemoryMonthlyPeriodRepository } from './in-memory-monthly-period-repository.js'

const HOUSEHOLD_ID = 1

function newPlanInput() {
  return {
    householdId: HOUSEHOLD_ID,
    description: 'Sofá',
    categoryId: 1,
    totalAmount: 100000n,
    installmentCount: 10,
    firstReferenceMonth: '2026-08-01',
    dueDay: 5,
    createdByUserId: 1,
    createdAt: '2026-08-20T00:00:00.000Z',
  }
}

function newEntryInput(overrides: Partial<Parameters<InMemoryFinancialEntryRepository['create']>[0]> = {}) {
  return {
    householdId: HOUSEHOLD_ID,
    periodId: 1,
    categoryId: 1,
    responsibleMemberId: null,
    createdByUserId: 1,
    entryType: 'expense' as const,
    status: 'planned' as const,
    description: 'Parcela',
    expectedAmount: 10000n,
    actualAmount: null,
    dueDate: '2026-08-05',
    realizationDate: null,
    notes: null,
    installmentPlanId: null,
    installmentNumber: null,
    ...overrides,
  }
}

describe('InMemoryInstallmentTransactionRunner', () => {
  let installmentPlans: InMemoryInstallmentPlanRepository
  let entries: InMemoryFinancialEntryRepository
  let periods: InMemoryMonthlyPeriodRepository
  let categories: InMemoryCategoryRepository
  let runner: InMemoryInstallmentTransactionRunner

  beforeEach(() => {
    installmentPlans = new InMemoryInstallmentPlanRepository()
    entries = new InMemoryFinancialEntryRepository()
    periods = new InMemoryMonthlyPeriodRepository()
    categories = new InMemoryCategoryRepository()
    runner = new InMemoryInstallmentTransactionRunner(installmentPlans, entries, periods, categories)
  })

  it('sucesso: todas as escritas de work() persistem', async () => {
    const result = await runner.run(async (context) => {
      const plan = await context.installmentPlans.create(newPlanInput())
      const entry = await context.entries.create(newEntryInput({ installmentPlanId: plan.id, installmentNumber: 1 }))
      return { plan, entry }
    })

    expect(await installmentPlans.findById(result.plan.id)).not.toBeNull()
    expect(await entries.findById(result.entry.id)).not.toBeNull()
  })

  it('falha após já ter criado o plano e algumas parcelas: rollback total — nenhum plano, nenhuma parcela sobrevive', async () => {
    await expect(
      runner.run(async (context) => {
        const plan = await context.installmentPlans.create(newPlanInput())
        for (let i = 1; i <= 5; i++) {
          await context.entries.create(newEntryInput({ installmentPlanId: plan.id, installmentNumber: i }))
        }
        throw new Error('falha simulada na parcela 6')
      }),
    ).rejects.toThrow('falha simulada na parcela 6')

    expect(await installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    expect(await entries.findByHousehold(HOUSEHOLD_ID)).toEqual([])
  })

  it('falha após criar uma MonthlyPeriod nova: rollback também desfaz a competência criada pela própria operação', async () => {
    await expect(
      runner.run(async (context) => {
        const plan = await context.installmentPlans.create(newPlanInput())
        await context.periods.create({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-09-01', status: 'open', closedAt: null, closedByUserId: null })
        await context.entries.create(newEntryInput({ installmentPlanId: plan.id, installmentNumber: 1 }))
        throw new Error('falha simulada após criar competência')
      }),
    ).rejects.toThrow()

    expect(await periods.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    expect(await installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
  })

  it('rollback nunca afeta dados que já existiam ANTES da transação (só desfaz o que a própria operação escreveu)', async () => {
    const preExistingPeriod = await periods.create({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01', status: 'open', closedAt: null, closedByUserId: null })
    const preExistingPlan = await installmentPlans.create(newPlanInput())

    await expect(
      runner.run(async (context) => {
        await context.installmentPlans.create(newPlanInput())
        throw new Error('falha simulada')
      }),
    ).rejects.toThrow()

    expect(await periods.findById(preExistingPeriod.id)).not.toBeNull()
    expect(await installmentPlans.findById(preExistingPlan.id)).not.toBeNull()
    expect(await installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([preExistingPlan])
  })

  it('ids gerados antes da falha nunca são reaproveitados depois do rollback — próxima criação bem-sucedida recebe um id novo', async () => {
    await expect(
      runner.run(async (context) => {
        await context.installmentPlans.create(newPlanInput())
        throw new Error('falha simulada')
      }),
    ).rejects.toThrow()

    const secondAttempt = await runner.run(async (context) => context.installmentPlans.create(newPlanInput()))
    expect(secondAttempt.id).toBe(2)
  })

  it('devolve o valor produzido por work() quando não há erro', async () => {
    const result = await runner.run(async () => 42)
    expect(result).toBe(42)
  })
})
