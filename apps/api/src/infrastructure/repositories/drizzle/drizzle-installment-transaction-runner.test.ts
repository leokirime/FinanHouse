import { describe, expect, it } from 'vitest'
import { DrizzleInstallmentTransactionRunner } from './drizzle-installment-transaction-runner.js'
import { DrizzleCategoryRepository } from './drizzle-category-repository.js'
import { DrizzleFinancialEntryRepository } from './drizzle-financial-entry-repository.js'
import { DrizzleInstallmentPlanRepository } from './drizzle-installment-plan-repository.js'
import { DrizzleMonthlyPeriodRepository } from './drizzle-monthly-period-repository.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

describe('DrizzleInstallmentTransactionRunner', () => {
  it('abre exatamente uma transação por chamada', async () => {
    const db = new FakeDrizzleDb([])
    const runner = new DrizzleInstallmentTransactionRunner(db as unknown as DrizzleDb)

    await runner.run(async () => 'ok')

    expect(db.transactionCalls).toBe(1)
  })

  it('o contexto passado a work() contém instâncias reais dos quatro repositórios esperados', async () => {
    const db = new FakeDrizzleDb([])
    const runner = new DrizzleInstallmentTransactionRunner(db as unknown as DrizzleDb)

    await runner.run(async (context) => {
      expect(context.installmentPlans).toBeInstanceOf(DrizzleInstallmentPlanRepository)
      expect(context.entries).toBeInstanceOf(DrizzleFinancialEntryRepository)
      expect(context.periods).toBeInstanceOf(DrizzleMonthlyPeriodRepository)
      expect(context.categories).toBeInstanceOf(DrizzleCategoryRepository)
      return null
    })
  })

  it('devolve o valor produzido por work()', async () => {
    const db = new FakeDrizzleDb([])
    const runner = new DrizzleInstallmentTransactionRunner(db as unknown as DrizzleDb)

    const result = await runner.run(async () => ({ ok: true }))

    expect(result).toEqual({ ok: true })
  })

  it('propaga o erro lançado por work() sem envolvê-lo (nunca mascara um erro de domínio como erro de persistência)', async () => {
    const db = new FakeDrizzleDb([])
    const runner = new DrizzleInstallmentTransactionRunner(db as unknown as DrizzleDb)

    class MarkerError extends Error {}

    await expect(
      runner.run(async () => {
        throw new MarkerError('falha de negócio dentro da transação')
      }),
    ).rejects.toBeInstanceOf(MarkerError)
  })
})
