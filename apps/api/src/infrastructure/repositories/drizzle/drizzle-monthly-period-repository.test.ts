import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { MonthlyPeriod as MonthlyPeriodRow } from '../../../db/types.js'
import { DrizzleMonthlyPeriodRepository } from './drizzle-monthly-period-repository.js'
import { DuplicateRecordError, HouseholdScopeViolationError, PersistenceError } from './persistence-errors.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

function newPeriodInput(overrides: Partial<Parameters<DrizzleMonthlyPeriodRepository['create']>[0]> = {}) {
  return {
    householdId: 10,
    referenceMonth: '2026-09-01',
    status: 'open' as const,
    closedAt: null,
    closedByUserId: null,
    ...overrides,
  }
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

  describe('create() — id sempre gerado pelo AUTO_INCREMENT nativo, nunca calculado em código (DT-15)', () => {
    it('insere sem fornecer id e devolve o id real gerado pelo insertId do banco', async () => {
      const { repository, db } = repositoryWith([])
      const period = await repository.create(newPeriodInput())

      expect(db.insertedValues[0]).not.toHaveProperty('id')
      expect(period.id).toBeTypeOf('number')
      expect(period.referenceMonth).toBe('2026-09-01')
    })

    it('duas chamadas sequenciais de create() (duas competências abertas seguidas) recebem ids diferentes', async () => {
      const { repository } = repositoryWith([])
      const first = await repository.create(newPeriodInput({ referenceMonth: '2026-07-01' }))
      const second = await repository.create(newPeriodInput({ referenceMonth: '2026-08-01' }))
      expect(first.id).not.toBe(second.id)
    })

    it('create() sempre executa um INSERT novo — nunca vira um UPDATE disfarçado', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1 })])
      await repository.create(newPeriodInput({ referenceMonth: '2026-10-01' }))
      expect(db.insertedValues).toHaveLength(1)
      expect(db.insertedValues[0]?.referenceMonth).toBe('2026-10-01')
    })

    it('falha no INSERT propaga PersistenceError sanitizado e não devolve competência parcial', async () => {
      const { repository } = repositoryWith([], new Error('falha simulada de conexão'))
      await expect(repository.create(newPeriodInput())).rejects.toBeInstanceOf(PersistenceError)
    })

    it('conflito de (household_id, reference_month) gera erro de duplicidade, não sobrescrita silenciosa — proteção preservada do índice único (DT-17)', async () => {
      const { repository } = repositoryWith([], {
        code: 'ER_DUP_ENTRY',
        sqlMessage: "Duplicate entry '10-2026-07-01' for key 'monthly_periods.monthly_periods_household_reference_month_unique'",
      })
      await expect(repository.create(newPeriodInput({ referenceMonth: '2026-07-01' }))).rejects.toBeInstanceOf(DuplicateRecordError)
    })
  })

  describe('update() — nunca cria, nunca sobrescreve household', () => {
    it('atualiza uma competência existente no household correto', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1, householdId: 10, status: 'open' })])
      const updated = await repository.update({
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

    it('rejeita atualizar um id inexistente — update() nunca cria', async () => {
      const { repository, db } = repositoryWith([])
      await expect(
        repository.update({
          id: 999,
          householdId: 10,
          referenceMonth: '2026-07-01',
          status: 'open',
          closedAt: null,
          closedByUserId: null,
        }),
      ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
      expect(db.insertedValues).toHaveLength(0)
    })

    it('rejeita atualizar competência com ID que pertence a outro household — nunca altera o household de um registro existente', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1, householdId: 10 })])
      await expect(
        repository.update({
          id: 1,
          householdId: 20,
          referenceMonth: '2026-07-01',
          status: 'open',
          closedAt: null,
          closedByUserId: null,
        }),
      ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
      expect(db.insertedValues).toHaveLength(0)
    })

    it('propaga PersistenceError sanitizado quando update falha', async () => {
      const { repository } = repositoryWith([buildRow({ id: 1, householdId: 10 })], new Error('falha simulada'))
      await expect(
        repository.update({
          id: 1,
          householdId: 10,
          referenceMonth: '2026-07-01',
          status: 'review',
          closedAt: null,
          closedByUserId: null,
        }),
      ).rejects.toBeInstanceOf(PersistenceError)
    })
  })

  it('o código real (fora de comentários) nunca consulta information_schema nem calcula MAX(id) — o id vem exclusivamente do insertId do banco', () => {
    const source = readFileSync(path.resolve(__dirname, 'drizzle-monthly-period-repository.ts'), 'utf-8')
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

    expect(codeOnly).not.toMatch(/information_schema/i)
    expect(codeOnly).not.toMatch(/MAX\(\s*id\s*\)/i)
    expect(codeOnly).not.toMatch(/nextId/i)
    expect(codeOnly).toMatch(/insertId/)
  })
})
