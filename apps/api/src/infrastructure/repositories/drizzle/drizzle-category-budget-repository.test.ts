import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { CategoryBudget as CategoryBudgetRow } from '../../../db/types.js'
import { DrizzleCategoryBudgetRepository } from './drizzle-category-budget-repository.js'
import { DuplicateRecordError, HouseholdScopeViolationError, PersistenceError } from './persistence-errors.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function buildRow(overrides: Partial<CategoryBudgetRow> = {}): CategoryBudgetRow {
  return {
    id: 1,
    householdId: 10,
    periodId: 5,
    categoryId: 3,
    limitAmount: '1500.00',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function repositoryWith(rows: CategoryBudgetRow[] = [], failWith?: unknown) {
  const db = new FakeDrizzleDb(rows, failWith)
  return { repository: new DrizzleCategoryBudgetRepository(db as unknown as DrizzleDb), db }
}

function newBudgetInput(overrides: Partial<Parameters<DrizzleCategoryBudgetRepository['create']>[0]> = {}) {
  return {
    householdId: 10,
    periodId: 5,
    categoryId: 3,
    limitAmount: 150000n,
    ...overrides,
  }
}

describe('DrizzleCategoryBudgetRepository', () => {
  it('findById retorna o limite mapeado quando encontrado', async () => {
    const { repository } = repositoryWith([buildRow({ id: 4, limitAmount: '2000.00' })])
    const budget = await repository.findById(4)
    expect(budget?.limitAmount).toBe(200000n)
  })

  it('findByHouseholdAndPeriod isola por household e competência simultaneamente', async () => {
    const { repository } = repositoryWith([
      buildRow({ id: 1, householdId: 10, periodId: 5 }),
      buildRow({ id: 2, householdId: 10, periodId: 6 }),
      buildRow({ id: 3, householdId: 20, periodId: 5 }),
    ])
    const budgets = await repository.findByHouseholdAndPeriod(10, 5)
    expect(budgets).toHaveLength(1)
    expect(budgets[0]?.id).toBe(1)
  })

  it('findByHouseholdPeriodAndCategory filtra pelas três dimensões', async () => {
    const { repository } = repositoryWith([
      buildRow({ id: 1, householdId: 10, periodId: 5, categoryId: 3 }),
      buildRow({ id: 2, householdId: 10, periodId: 5, categoryId: 4 }),
    ])
    const budget = await repository.findByHouseholdPeriodAndCategory(10, 5, 4)
    expect(budget?.id).toBe(2)
  })

  it('propaga PersistenceError sanitizado quando findById falha', async () => {
    const { repository } = repositoryWith([], new Error('falha simulada'))
    await expect(repository.findById(1)).rejects.toBeInstanceOf(PersistenceError)
  })

  describe('create() — id sempre gerado pelo AUTO_INCREMENT nativo, nunca calculado em código (DT-15)', () => {
    it('insere sem fornecer id e devolve o id real gerado pelo insertId do banco', async () => {
      const { repository, db } = repositoryWith([])
      const budget = await repository.create(newBudgetInput())

      expect(db.insertedValues[0]).not.toHaveProperty('id')
      expect(budget.id).toBeTypeOf('number')
      expect(db.insertedValues[0]?.limitAmount).toBe('1500.00')
    })

    it('duas chamadas sequenciais de create() recebem ids diferentes', async () => {
      const { repository } = repositoryWith([])
      const first = await repository.create(newBudgetInput({ categoryId: 3 }))
      const second = await repository.create(newBudgetInput({ categoryId: 4 }))
      expect(first.id).not.toBe(second.id)
    })

    it('create() sempre executa um INSERT novo — nunca vira um UPDATE disfarçado', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1 })])
      await repository.create(newBudgetInput({ categoryId: 9 }))
      expect(db.insertedValues).toHaveLength(1)
    })

    it('falha no INSERT propaga PersistenceError sanitizado e não devolve limite parcial', async () => {
      const { repository } = repositoryWith([], new Error('falha simulada de conexão'))
      await expect(repository.create(newBudgetInput())).rejects.toBeInstanceOf(PersistenceError)
    })

    it('conflito de unicidade (household+período+categoria) gera erro de duplicidade, não sobrescrita silenciosa', async () => {
      const { repository } = repositoryWith([], {
        code: 'ER_DUP_ENTRY',
        sqlMessage: "Duplicate entry '10-5-3' for key 'category_budgets.category_budgets_household_period_category_unique'",
      })
      await expect(repository.create(newBudgetInput())).rejects.toBeInstanceOf(DuplicateRecordError)
    })
  })

  describe('update() — nunca cria, nunca sobrescreve household', () => {
    it('atualiza um limite existente do mesmo household', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1, householdId: 10, limitAmount: '1500.00' })])
      const updated = await repository.update({ id: 1, householdId: 10, periodId: 5, categoryId: 3, limitAmount: 999900n })
      expect(updated.limitAmount).toBe(999900n)
      expect(db.insertedValues[0]?.limitAmount).toBe('9999.00')
    })

    it('rejeita atualizar um id inexistente — update() nunca cria', async () => {
      const { repository, db } = repositoryWith([])
      await expect(
        repository.update({ id: 999, householdId: 10, periodId: 5, categoryId: 3, limitAmount: 100000n }),
      ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
      expect(db.insertedValues).toHaveLength(0)
    })

    it('rejeita atualizar limite com ID que pertence a outro household — nunca altera o household de um registro existente', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1, householdId: 10 })])
      await expect(
        repository.update({ id: 1, householdId: 20, periodId: 5, categoryId: 3, limitAmount: 100000n }),
      ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
      expect(db.insertedValues).toHaveLength(0)
    })

    it('propaga PersistenceError sanitizado quando update falha', async () => {
      const { repository } = repositoryWith([buildRow({ id: 1, householdId: 10 })], new Error('falha simulada'))
      await expect(
        repository.update({ id: 1, householdId: 10, periodId: 5, categoryId: 3, limitAmount: 100000n }),
      ).rejects.toBeInstanceOf(PersistenceError)
    })
  })

  it('remove exclui o limite pelo id', async () => {
    const { repository } = repositoryWith([buildRow({ id: 1 }), buildRow({ id: 2, categoryId: 4 })])
    await repository.remove(1)
    const remaining = await repository.findByHouseholdAndPeriod(10, 5)
    expect(remaining.map((budget) => budget.id)).toEqual([2])
  })

  it('o código real (fora de comentários) nunca consulta information_schema nem calcula MAX(id) — o id vem exclusivamente do insertId do banco', () => {
    const source = readFileSync(path.resolve(__dirname, 'drizzle-category-budget-repository.ts'), 'utf-8')
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

    expect(codeOnly).not.toMatch(/information_schema/i)
    expect(codeOnly).not.toMatch(/MAX\(\s*id\s*\)/i)
    expect(codeOnly).not.toMatch(/nextId/i)
    expect(codeOnly).toMatch(/insertId/)
  })
})
