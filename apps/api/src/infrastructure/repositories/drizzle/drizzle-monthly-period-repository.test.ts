import { describe, expect, it } from 'vitest'
import type { MonthlyPeriod as MonthlyPeriodRow } from '../../../db/types.js'
import { DrizzleMonthlyPeriodRepository } from './drizzle-monthly-period-repository.js'
import { DuplicateRecordError, HouseholdScopeViolationError, PersistenceError } from './persistence-errors.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

function buildRow(overrides: Partial<MonthlyPeriodRow> = {}): MonthlyPeriodRow {
  return {
    id: 1,
    householdId: 10,
    referenceMonth: '2026-07-01',
    status: 'open',
    closedAt: null,
    closedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function repositoryWith(rows: MonthlyPeriodRow[] = [], failWith?: unknown) {
  const db = new FakeDrizzleDb(rows, failWith)
  return { repository: new DrizzleMonthlyPeriodRepository(db as unknown as DrizzleDb), db }
}

describe('DrizzleMonthlyPeriodRepository', () => {
  it('findById retorna o período mapeado quando encontrado', async () => {
    const { repository } = repositoryWith([buildRow({ id: 3, status: 'review' })])
    const period = await repository.findById(3)
    expect(period?.status).toBe('review')
  })

  it('findByHouseholdAndReferenceMonth filtra por household e competência simultaneamente', async () => {
    const { repository } = repositoryWith([
      buildRow({ id: 1, householdId: 10, referenceMonth: '2026-07-01' }),
      buildRow({ id: 2, householdId: 10, referenceMonth: '2026-08-01' }),
      buildRow({ id: 3, householdId: 20, referenceMonth: '2026-07-01' }),
    ])
    const period = await repository.findByHouseholdAndReferenceMonth(10, '2026-07-01')
    expect(period?.id).toBe(1)
  })

  it('findByHousehold isola por household — nunca retorna período de outro household', async () => {
    const { repository } = repositoryWith([
      buildRow({ id: 1, householdId: 10 }),
      buildRow({ id: 2, householdId: 20 }),
    ])
    const periods = await repository.findByHousehold(10)
    expect(periods).toHaveLength(1)
    expect(periods[0]?.id).toBe(1)
  })

  it('save insere um novo período e o devolve inalterado', async () => {
    const { repository, db } = repositoryWith([])
    const period = {
      id: 9,
      householdId: 10,
      referenceMonth: '2026-09-01',
      status: 'open' as const,
      closedAt: null,
      closedByUserId: null,
    }
    const saved = await repository.save(period)
    expect(saved).toEqual(period)
    expect(db.insertedValues).toHaveLength(1)
    expect(db.insertedValues[0]?.referenceMonth).toBe('2026-09-01')
  })

  it('nextId lê o próximo AUTO_INCREMENT via information_schema', async () => {
    const { repository, db } = repositoryWith([])
    db.executeRows = [{ nextId: 42 }]
    expect(await repository.nextId()).toBe(42)
  })

  it('nextId retorna 1 quando a tabela ainda não tem contador definido', async () => {
    const { repository, db } = repositoryWith([])
    db.executeRows = []
    expect(await repository.nextId()).toBe(1)
  })

  it('propaga PersistenceError sanitizado quando save falha', async () => {
    const { repository } = repositoryWith([], { code: 'ER_DUP_ENTRY' })
    await expect(
      repository.save({
        id: 1,
        householdId: 10,
        referenceMonth: '2026-07-01',
        status: 'open',
        closedAt: null,
        closedByUserId: null,
      }),
    ).rejects.toBeInstanceOf(PersistenceError)
  })

  it('salva competência existente no household correto (atualização, sem upsert)', async () => {
    const { repository, db } = repositoryWith([buildRow({ id: 1, householdId: 10, status: 'open' })])
    const updated = await repository.save({
      id: 1,
      householdId: 10,
      referenceMonth: '2026-07-01',
      status: 'review',
      closedAt: null,
      closedByUserId: null,
    })
    expect(updated.status).toBe('review')
    expect(db.insertedValues[0]?.status).toBe('review')
  })

  it('rejeita salvar competência com ID que pertence a outro household', async () => {
    const { repository } = repositoryWith([buildRow({ id: 1, householdId: 10 })])
    await expect(
      repository.save({
        id: 1,
        householdId: 20,
        referenceMonth: '2026-07-01',
        status: 'open',
        closedAt: null,
        closedByUserId: null,
      }),
    ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
  })

  it('conflito de (household_id, reference_month) gera erro de duplicidade, não atualização silenciosa', async () => {
    const { repository } = repositoryWith([], {
      code: 'ER_DUP_ENTRY',
      sqlMessage: "Duplicate entry '10-2026-07-01' for key 'monthly_periods.monthly_periods_household_reference_month_unique'",
    })
    await expect(
      repository.save({
        id: 99,
        householdId: 10,
        referenceMonth: '2026-07-01',
        status: 'open',
        closedAt: null,
        closedByUserId: null,
      }),
    ).rejects.toBeInstanceOf(DuplicateRecordError)
  })
})
