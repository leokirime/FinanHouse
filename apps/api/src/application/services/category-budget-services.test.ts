import { type Category, type MonthlyPeriod, CategoryBudgetNotFoundError, parseMoney } from '@finanhouse/domain'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryCategoryBudgetRepository } from '../../infrastructure/repositories/memory/in-memory-category-budget-repository.js'
import { InMemoryCategoryRepository } from '../../infrastructure/repositories/memory/in-memory-category-repository.js'
import { InMemoryMonthlyPeriodRepository } from '../../infrastructure/repositories/memory/in-memory-monthly-period-repository.js'
import { DeleteCategoryBudgetService, ListCategoryBudgetsService, PutCategoryBudgetService } from './category-budget-services.js'

const HOUSEHOLD_ID = 1
const expenseCategory: Category = { id: 1, householdId: HOUSEHOLD_ID, name: 'Moradia', entryType: 'expense', status: 'active' }
const incomeCategory: Category = { id: 2, householdId: HOUSEHOLD_ID, name: 'Salário', entryType: 'income', status: 'active' }
const inactiveCategory: Category = { id: 3, householdId: HOUSEHOLD_ID, name: 'Antiga', entryType: 'expense', status: 'inactive' }
const otherHouseholdCategory: Category = { id: 4, householdId: 2, name: 'Outra', entryType: 'expense', status: 'active' }

const openPeriod: MonthlyPeriod = { id: 10, householdId: HOUSEHOLD_ID, referenceMonth: '2026-08-01', status: 'open', closedAt: null, closedByUserId: null }
const closedPeriod: MonthlyPeriod = { id: 11, householdId: HOUSEHOLD_ID, referenceMonth: '2026-06-01', status: 'closed', closedAt: '2026-07-05', closedByUserId: 1 }

describe('serviços de limite mensal por categoria (repositórios em memória)', () => {
  const budgets = new InMemoryCategoryBudgetRepository()
  const periods = new InMemoryMonthlyPeriodRepository()
  const categories = new InMemoryCategoryRepository()
  const deps = { budgets, periods, categories }

  beforeEach(async () => {
    budgets.reset()
    periods.reset()
    categories.reset()
    categories.seed([expenseCategory, incomeCategory, inactiveCategory, otherHouseholdCategory])
    await periods.save(openPeriod)
    await periods.save(closedPeriod)
  })

  it('PUT cria um novo limite quando ainda não existe (created: true)', async () => {
    const { budget, created } = await new PutCategoryBudgetService(deps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: openPeriod.id,
      categoryId: expenseCategory.id,
      limitAmount: parseMoney('1500.00'),
    })
    expect(created).toBe(true)
    expect(budget.limitAmount).toBe(150000n)
  })

  it('PUT atualiza um limite existente quando já existe (created: false), idempotente', async () => {
    await new PutCategoryBudgetService(deps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: openPeriod.id,
      categoryId: expenseCategory.id,
      limitAmount: parseMoney('1500.00'),
    })
    const { budget, created } = await new PutCategoryBudgetService(deps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: openPeriod.id,
      categoryId: expenseCategory.id,
      limitAmount: parseMoney('2000.00'),
    })
    expect(created).toBe(false)
    expect(budget.limitAmount).toBe(200000n)

    const all = await budgets.findByHouseholdAndPeriod(HOUSEHOLD_ID, openPeriod.id)
    expect(all).toHaveLength(1)
  })

  it('PUT rejeita categoria de receita', async () => {
    await expect(
      new PutCategoryBudgetService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: openPeriod.id,
        categoryId: incomeCategory.id,
        limitAmount: parseMoney('100.00'),
      }),
    ).rejects.toThrow()
  })

  it('PUT rejeita categoria inativa', async () => {
    await expect(
      new PutCategoryBudgetService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: openPeriod.id,
        categoryId: inactiveCategory.id,
        limitAmount: parseMoney('100.00'),
      }),
    ).rejects.toThrow()
  })

  it('PUT rejeita categoria de outro household', async () => {
    await expect(
      new PutCategoryBudgetService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: openPeriod.id,
        categoryId: otherHouseholdCategory.id,
        limitAmount: parseMoney('100.00'),
      }),
    ).rejects.toThrow()
  })

  it('PUT rejeita competência fechada', async () => {
    await expect(
      new PutCategoryBudgetService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: closedPeriod.id,
        categoryId: expenseCategory.id,
        limitAmount: parseMoney('100.00'),
      }),
    ).rejects.toThrow()
  })

  it('PUT rejeita valor zero ou negativo', async () => {
    await expect(
      new PutCategoryBudgetService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: openPeriod.id,
        categoryId: expenseCategory.id,
        limitAmount: 0n,
      }),
    ).rejects.toThrow()
  })

  it('LIST retorna os limites da competência', async () => {
    await new PutCategoryBudgetService(deps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: openPeriod.id,
      categoryId: expenseCategory.id,
      limitAmount: parseMoney('1500.00'),
    })
    const list = await new ListCategoryBudgetsService(deps).execute(HOUSEHOLD_ID, openPeriod.id)
    expect(list).toHaveLength(1)
  })

  it('DELETE remove um limite existente em competência aberta', async () => {
    await new PutCategoryBudgetService(deps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: openPeriod.id,
      categoryId: expenseCategory.id,
      limitAmount: parseMoney('1500.00'),
    })
    await new DeleteCategoryBudgetService(deps).execute({ householdId: HOUSEHOLD_ID, periodId: openPeriod.id, categoryId: expenseCategory.id })
    const list = await new ListCategoryBudgetsService(deps).execute(HOUSEHOLD_ID, openPeriod.id)
    expect(list).toHaveLength(0)
  })

  it('DELETE rejeita quando o limite não existe', async () => {
    await expect(
      new DeleteCategoryBudgetService(deps).execute({ householdId: HOUSEHOLD_ID, periodId: openPeriod.id, categoryId: expenseCategory.id }),
    ).rejects.toBeInstanceOf(CategoryBudgetNotFoundError)
  })

  it('DELETE rejeita competência fechada', async () => {
    await budgets.save({ id: 1, householdId: HOUSEHOLD_ID, periodId: closedPeriod.id, categoryId: expenseCategory.id, limitAmount: parseMoney('100.00') })
    await expect(
      new DeleteCategoryBudgetService(deps).execute({ householdId: HOUSEHOLD_ID, periodId: closedPeriod.id, categoryId: expenseCategory.id }),
    ).rejects.toThrow()
  })

  it('duas categorias diferentes na mesma competência não colidem (sem DuplicateCategoryBudgetError indevido)', async () => {
    await new PutCategoryBudgetService(deps).execute({ householdId: HOUSEHOLD_ID, periodId: openPeriod.id, categoryId: expenseCategory.id, limitAmount: parseMoney('100.00') })
    const otherExpense: Category = { id: 5, householdId: HOUSEHOLD_ID, name: 'Transporte', entryType: 'expense', status: 'active' }
    categories.seed([otherExpense])
    const { created } = await new PutCategoryBudgetService(deps).execute({ householdId: HOUSEHOLD_ID, periodId: openPeriod.id, categoryId: otherExpense.id, limitAmount: parseMoney('50.00') })
    expect(created).toBe(true)
  })
})
