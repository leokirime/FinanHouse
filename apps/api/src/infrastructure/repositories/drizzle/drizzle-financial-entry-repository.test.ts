import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import type { FinancialEntry as FinancialEntryRow } from '../../../db/types.js'
import { DrizzleFinancialEntryRepository } from './drizzle-financial-entry-repository.js'
import { HouseholdScopeViolationError, PersistenceError } from './persistence-errors.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function buildRow(overrides: Partial<FinancialEntryRow> = {}): FinancialEntryRow {
  return {
    id: 1,
    householdId: 10,
    periodId: 100,
    categoryId: 200,
    responsibleMemberId: null,
    responsibleMemberHouseholdId: null,
    createdByUserId: 300,
    entryType: 'expense',
    status: 'planned',
    description: 'Aluguel',
    expectedAmount: '1000.00',
    actualAmount: null,
    dueDate: null,
    realizationDate: null,
    notes: null,
    installmentPlanId: null,
    installmentNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function repositoryWith(rows: FinancialEntryRow[] = [], failWith?: unknown) {
  const db = new FakeDrizzleDb(rows, failWith)
  return { repository: new DrizzleFinancialEntryRepository(db as unknown as DrizzleDb), db }
}

function newEntryInput(overrides: Partial<Parameters<DrizzleFinancialEntryRepository['create']>[0]> = {}) {
  return {
    householdId: 10,
    periodId: 100,
    categoryId: 200,
    responsibleMemberId: null,
    createdByUserId: 300,
    entryType: 'expense' as const,
    status: 'planned' as const,
    description: 'Aluguel',
    expectedAmount: parseMoney('1000.00'),
    actualAmount: null,
    dueDate: null,
    realizationDate: null,
    notes: null,
    ...overrides,
  }
}

describe('DrizzleFinancialEntryRepository', () => {
  it('findByPeriod retorna as movimentações do período', async () => {
    const { repository } = repositoryWith([
      buildRow({ id: 1, periodId: 100 }),
      buildRow({ id: 2, periodId: 200 }),
    ])
    const entries = await repository.findByPeriod(100)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.id).toBe(1)
  })

  it('findByHousehold isola por household — nunca retorna movimentação de outro household', async () => {
    const { repository } = repositoryWith([
      buildRow({ id: 1, householdId: 10 }),
      buildRow({ id: 2, householdId: 20 }),
    ])
    const entries = await repository.findByHousehold(10)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.id).toBe(1)
  })

  it('mapeamento de leitura nunca expõe responsibleMemberHouseholdId ao domínio', async () => {
    const { repository } = repositoryWith([
      buildRow({ id: 1, responsibleMemberId: 50, responsibleMemberHouseholdId: 10 }),
    ])
    const entry = await repository.findById(1)
    expect(entry).not.toBeNull()
    expect('responsibleMemberHouseholdId' in (entry as object)).toBe(false)
  })

  it('propaga PersistenceError sanitizado para falha de leitura', async () => {
    const { repository } = repositoryWith([], new Error('connect ETIMEDOUT'))
    await expect(repository.findByHousehold(10)).rejects.toBeInstanceOf(PersistenceError)
  })

  describe('create() — id sempre gerado pelo AUTO_INCREMENT nativo, nunca calculado em código (DT-15)', () => {
    it('insere sem fornecer id e devolve o id real gerado pelo insertId do banco', async () => {
      const { repository, db } = repositoryWith([])
      const entry = await repository.create(newEntryInput())

      expect(db.insertedValues[0]).not.toHaveProperty('id')
      expect(entry.id).toBeTypeOf('number')
      expect(entry.description).toBe('Aluguel')
    })

    it('duas chamadas sequenciais de create() recebem ids diferentes', async () => {
      const { repository } = repositoryWith([])
      const first = await repository.create(newEntryInput({ description: 'Primeira' }))
      const second = await repository.create(newEntryInput({ description: 'Segunda' }))
      expect(first.id).not.toBe(second.id)
    })

    it('create() sempre executa um INSERT novo — nunca vira um UPDATE disfarçado', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1 })])
      await repository.create(newEntryInput({ description: 'Nova movimentação' }))
      expect(db.insertedValues).toHaveLength(1)
      expect(db.insertedValues[0]?.description).toBe('Nova movimentação')
    })

    it('movimentação sem responsável não preenche a coluna auxiliar', async () => {
      const { repository, db } = repositoryWith([])
      await repository.create(newEntryInput({ responsibleMemberId: null }))
      expect(db.insertedValues[0]?.responsibleMemberId).toBeNull()
      expect(db.insertedValues[0]?.responsibleMemberHouseholdId).toBeNull()
    })

    it('movimentação com responsável do mesmo household preenche a coluna auxiliar internamente', async () => {
      const { repository, db } = repositoryWith([])
      await repository.create(newEntryInput({ responsibleMemberId: 50 }))
      expect(db.insertedValues[0]?.responsibleMemberId).toBe(50)
      expect(db.insertedValues[0]?.responsibleMemberHouseholdId).toBe(10)
    })

    it('propaga HouseholdScopeViolationError quando o banco rejeita responsável de outro household', async () => {
      const { repository } = repositoryWith([], {
        code: 'ER_NO_REFERENCED_ROW_2',
        sqlMessage:
          'Cannot add or update a child row: a foreign key constraint fails (CONSTRAINT `financial_entries_responsible_member_household_fk`)',
      })
      await expect(repository.create(newEntryInput({ responsibleMemberId: 999 }))).rejects.toBeInstanceOf(HouseholdScopeViolationError)
    })

    it('falha no INSERT propaga PersistenceError sanitizado e não devolve movimentação parcial', async () => {
      const { repository } = repositoryWith([], new Error('falha simulada de conexão'))
      await expect(repository.create(newEntryInput())).rejects.toBeInstanceOf(PersistenceError)
    })

    it('create() de uma movimentação comum continua funcionando normalmente mesmo com parcelas de um InstallmentPlan já persistidas (Sessão 12, Bloco 03)', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1, installmentPlanId: 7, installmentNumber: 2 })])
      const entry = await repository.create(newEntryInput({ description: 'Movimentação avulsa' }))
      expect(entry.description).toBe('Movimentação avulsa')
      expect(db.insertedValues[0]).not.toHaveProperty('installmentPlanId')
    })
  })

  describe('leitura de linhas com installmentPlanId/installmentNumber preenchidos (Sessão 12, Bloco 03)', () => {
    it('findById nunca falha ao ler uma parcela — installmentPlanId/installmentNumber não fazem parte do tipo de domínio, mas sua presença na linha não quebra o mapeamento', async () => {
      const { repository } = repositoryWith([buildRow({ id: 1, installmentPlanId: 7, installmentNumber: 2 })])
      const entry = await repository.findById(1)
      expect(entry).not.toBeNull()
      expect(entry?.id).toBe(1)
    })
  })

  describe('update() — nunca cria, nunca sobrescreve household', () => {
    it('atualiza uma movimentação existente no household correto', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1, householdId: 10, status: 'planned' })])
      const updated = await repository.update({
        id: 1,
        householdId: 10,
        periodId: 100,
        categoryId: 200,
        responsibleMemberId: null,
        createdByUserId: 300,
        entryType: 'expense',
        status: 'pending',
        description: 'Aluguel',
        expectedAmount: parseMoney('1000.00'),
        actualAmount: null,
        dueDate: null,
        realizationDate: null,
        notes: null,
      })
      expect(updated.status).toBe('pending')
      expect(db.insertedValues[0]?.status).toBe('pending')
    })

    it('atualização que remove o responsável zera também a coluna auxiliar', async () => {
      const { repository, db } = repositoryWith([
        buildRow({ id: 1, responsibleMemberId: 50, responsibleMemberHouseholdId: 10 }),
      ])
      await repository.update({
        id: 1,
        householdId: 10,
        periodId: 100,
        categoryId: 200,
        responsibleMemberId: null,
        createdByUserId: 300,
        entryType: 'expense',
        status: 'planned',
        description: 'Aluguel',
        expectedAmount: parseMoney('1000.00'),
        actualAmount: null,
        dueDate: null,
        realizationDate: null,
        notes: null,
      })
      expect(db.insertedValues[0]?.responsibleMemberId).toBeNull()
      expect(db.insertedValues[0]?.responsibleMemberHouseholdId).toBeNull()
    })

    it('rejeita atualizar um id inexistente — update() nunca cria', async () => {
      const { repository, db } = repositoryWith([])
      await expect(
        repository.update({
          id: 999,
          householdId: 10,
          periodId: 100,
          categoryId: 200,
          responsibleMemberId: null,
          createdByUserId: 300,
          entryType: 'expense',
          status: 'planned',
          description: 'Não existe',
          expectedAmount: parseMoney('1000.00'),
          actualAmount: null,
          dueDate: null,
          realizationDate: null,
          notes: null,
        }),
      ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
      expect(db.insertedValues).toHaveLength(0)
    })

    it('rejeita atualizar um id que pertence a outro household — nunca altera o household de um registro existente', async () => {
      const { repository, db } = repositoryWith([buildRow({ id: 1, householdId: 10 })])
      await expect(
        repository.update({
          id: 1,
          householdId: 20,
          periodId: 100,
          categoryId: 200,
          responsibleMemberId: null,
          createdByUserId: 300,
          entryType: 'expense',
          status: 'planned',
          description: 'Tentativa de gravação cruzada',
          expectedAmount: parseMoney('1000.00'),
          actualAmount: null,
          dueDate: null,
          realizationDate: null,
          notes: null,
        }),
      ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
      expect(db.insertedValues).toHaveLength(0)
    })

    it('falha na leitura de existência propaga PersistenceError sanitizado', async () => {
      const { repository } = repositoryWith([], new Error('falha simulada'))
      await expect(
        repository.update({
          id: 1,
          householdId: 10,
          periodId: 100,
          categoryId: 200,
          responsibleMemberId: null,
          createdByUserId: 300,
          entryType: 'expense',
          status: 'planned',
          description: 'Aluguel',
          expectedAmount: parseMoney('1000.00'),
          actualAmount: null,
          dueDate: null,
          realizationDate: null,
          notes: null,
        }),
      ).rejects.toBeInstanceOf(PersistenceError)
    })
  })

  describe('remove()', () => {
    it('exclui permanentemente uma movimentação do household correto', async () => {
      const { repository } = repositoryWith([buildRow({ id: 1, householdId: 10 })])
      await repository.remove(1, 10)
      expect(await repository.findById(1)).toBeNull()
    })

    it('nunca exclui um registro de outro household, mesmo com o mesmo id', async () => {
      const { repository } = repositoryWith([buildRow({ id: 1, householdId: 20 })])
      await repository.remove(1, 10)
      expect(await repository.findById(1)).not.toBeNull()
    })

    it('propaga PersistenceError sanitizado para falha do banco', async () => {
      const { repository } = repositoryWith([buildRow({ id: 1, householdId: 10 })], new Error('connect ETIMEDOUT'))
      await expect(repository.remove(1, 10)).rejects.toBeInstanceOf(PersistenceError)
    })
  })

  it('o código real (fora de comentários) nunca consulta information_schema nem calcula MAX(id) — o id vem exclusivamente do insertId do banco', () => {
    const source = readFileSync(path.resolve(__dirname, 'drizzle-financial-entry-repository.ts'), 'utf-8')
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

    expect(codeOnly).not.toMatch(/information_schema/i)
    expect(codeOnly).not.toMatch(/MAX\(\s*id\s*\)/i)
    expect(codeOnly).not.toMatch(/nextId/i)
    expect(codeOnly).toMatch(/insertId/)
  })
})
