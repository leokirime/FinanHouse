import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createDrizzleRepositories } from './create-drizzle-repositories.js'
import { DrizzleCategoryBudgetRepository } from './drizzle-category-budget-repository.js'
import { DrizzleCategoryRepository } from './drizzle-category-repository.js'
import { DrizzleFinancialEntryRepository } from './drizzle-financial-entry-repository.js'
import { DrizzleHouseholdMemberRepository } from './drizzle-household-member-repository.js'
import { DrizzleMonthlyPeriodRepository } from './drizzle-monthly-period-repository.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('createDrizzleRepositories', () => {
  it('devolve exatamente as cinco portas existentes no contrato do projeto', () => {
    const db = new FakeDrizzleDb([])
    const repositories = createDrizzleRepositories(db as unknown as DrizzleDb)

    expect(repositories.entries).toBeInstanceOf(DrizzleFinancialEntryRepository)
    expect(repositories.periods).toBeInstanceOf(DrizzleMonthlyPeriodRepository)
    expect(repositories.categories).toBeInstanceOf(DrizzleCategoryRepository)
    expect(repositories.members).toBeInstanceOf(DrizzleHouseholdMemberRepository)
    expect(repositories.budgets).toBeInstanceOf(DrizzleCategoryBudgetRepository)
    expect(Object.keys(repositories).sort()).toEqual(['budgets', 'categories', 'entries', 'members', 'periods'])
  })

  it('não abre conexão ao ser chamada — apenas compõe repositórios sobre a instância recebida', () => {
    const db = new FakeDrizzleDb([])
    expect(() => createDrizzleRepositories(db as unknown as DrizzleDb)).not.toThrow()
  })
})

describe('ausência de conexão durante a importação dos repositórios Drizzle', () => {
  const files = [
    'create-drizzle-repositories.ts',
    'drizzle-category-repository.ts',
    'drizzle-household-member-repository.ts',
    'drizzle-monthly-period-repository.ts',
    'drizzle-financial-entry-repository.ts',
    'drizzle-category-budget-repository.ts',
  ]

  it.each(files)('%s não chama mysql.createPool/createConnection nem drizzle() no escopo do módulo', (file) => {
    const source = readFileSync(path.join(__dirname, file), 'utf8')
    expect(source).not.toMatch(/^\s*(mysql\.createPool|mysql\.createConnection|drizzle)\(/m)
    expect(source).not.toContain('process.loadEnvFile')
  })
})

describe('ausência de upsert nos repositórios graváveis', () => {
  const writableRepositoryFiles = ['drizzle-financial-entry-repository.ts', 'drizzle-monthly-period-repository.ts', 'drizzle-category-budget-repository.ts']

  it.each(writableRepositoryFiles)(
    '%s nunca usa onDuplicateKeyUpdate — escrita sempre escopada por household via INSERT/UPDATE explícitos',
    (file) => {
      const source = readFileSync(path.join(__dirname, file), 'utf8')
      expect(source).not.toContain('onDuplicateKeyUpdate')
    },
  )
})
