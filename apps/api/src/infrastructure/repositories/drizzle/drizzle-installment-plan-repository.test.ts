import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { InstallmentPlan as InstallmentPlanRow } from '../../../db/types.js'
import { DrizzleInstallmentPlanRepository } from './drizzle-installment-plan-repository.js'
import { PersistenceError } from './persistence-errors.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function buildRow(overrides: Partial<InstallmentPlanRow> = {}): InstallmentPlanRow {
  return {
    id: 1,
    householdId: 100,
    description: 'Sofá',
    categoryId: 200,
    totalAmount: '1000.00',
    installmentCount: 10,
    firstReferenceMonth: '2026-08-01',
    dueDay: 5,
    createdByUserId: 300,
    createdAt: new Date('2026-08-01T12:00:00Z'),
    ...overrides,
  }
}

function repositoryWith(rows: InstallmentPlanRow[] = [], failWith?: unknown) {
  const db = new FakeDrizzleDb(rows, failWith)
  return { repository: new DrizzleInstallmentPlanRepository(db as unknown as DrizzleDb), db }
}

function newPlanInput(overrides: Partial<Omit<InstallmentPlanRow, 'id' | 'totalAmount' | 'createdAt'>> = {}) {
  return {
    householdId: 100,
    description: 'Geladeira',
    categoryId: 200,
    totalAmount: 250000n,
    installmentCount: 5,
    firstReferenceMonth: '2026-09-01',
    dueDay: 10,
    createdByUserId: 300,
    createdAt: '2026-08-20T00:00:00.000Z',
    ...overrides,
  }
}

describe('DrizzleInstallmentPlanRepository', () => {
  describe('findById', () => {
    it('retorna o plano mapeado quando encontrado', async () => {
      const { repository } = repositoryWith([buildRow({ id: 5, description: 'TV' })])
      const plan = await repository.findById(5)
      expect(plan?.id).toBe(5)
      expect(plan?.description).toBe('TV')
    })

    it('devolve null quando não encontrado', async () => {
      const { repository } = repositoryWith([buildRow({ id: 1 })])
      expect(await repository.findById(999)).toBeNull()
    })

    it('propaga PersistenceError sanitizado quando a leitura falha', async () => {
      const { repository } = repositoryWith([], new Error('falha simulada'))
      await expect(repository.findById(1)).rejects.toBeInstanceOf(PersistenceError)
    })
  })

  describe('findByHousehold', () => {
    it('retorna apenas os planos do household pedido — nunca de outro household', async () => {
      const { repository } = repositoryWith([
        buildRow({ id: 1, householdId: 100 }),
        buildRow({ id: 2, householdId: 200 }),
      ])
      const plans = await repository.findByHousehold(100)
      expect(plans).toHaveLength(1)
      expect(plans[0]?.householdId).toBe(100)
    })

    it('devolve lista vazia quando o household não tem planos', async () => {
      const { repository } = repositoryWith([buildRow({ id: 1, householdId: 100 })])
      expect(await repository.findByHousehold(999)).toEqual([])
    })
  })

  describe('create() — id sempre gerado pelo AUTO_INCREMENT nativo, nunca calculado em código', () => {
    it('insere sem fornecer id e devolve o id real gerado pelo insertId do banco', async () => {
      const { repository, db } = repositoryWith([])
      const plan = await repository.create(newPlanInput())

      expect(db.insertedValues[0]).not.toHaveProperty('id')
      expect(plan.id).toBeTypeOf('number')
      expect(plan.description).toBe('Geladeira')
      expect(plan.dueDay).toBe(10)
    })

    it('duas chamadas sequenciais de create() (dois parcelamentos seguidos) recebem ids diferentes', async () => {
      const { repository } = repositoryWith([])
      const first = await repository.create(newPlanInput({ description: 'Sofá' }))
      const second = await repository.create(newPlanInput({ description: 'Geladeira' }))
      expect(first.id).not.toBe(second.id)
    })

    it('dois households criando planos não colidem — cada um recebe seu próprio id', async () => {
      const { repository } = repositoryWith([])
      const own = await repository.create(newPlanInput({ householdId: 100 }))
      const other = await repository.create(newPlanInput({ householdId: 200 }))
      expect(own.id).not.toBe(other.id)
      expect(own.householdId).toBe(100)
      expect(other.householdId).toBe(200)
    })

    it('create() sempre executa um INSERT novo — nunca um UPDATE sobre uma linha existente', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1 })])
      await repository.create(newPlanInput({ description: 'Novo plano' }))
      expect(db.insertedValues).toHaveLength(1)
      expect(db.insertedValues[0]?.description).toBe('Novo plano')
    })

    it('falha no INSERT propaga PersistenceError sanitizado e não devolve plano parcial', async () => {
      const { repository } = repositoryWith([], new Error('falha simulada de conexão'))
      await expect(repository.create(newPlanInput())).rejects.toBeInstanceOf(PersistenceError)
    })
  })

  it('o código real (fora de comentários) nunca consulta information_schema nem calcula MAX(id) — o id vem exclusivamente do insertId do banco', () => {
    const source = readFileSync(path.resolve(__dirname, 'drizzle-installment-plan-repository.ts'), 'utf-8')
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

    expect(codeOnly).not.toMatch(/information_schema/i)
    expect(codeOnly).not.toMatch(/MAX\(\s*id\s*\)/i)
    expect(codeOnly).not.toMatch(/nextId/i)
    expect(codeOnly).toMatch(/insertId/)
  })
})
