import { parseMoney } from '@finanhouse/domain'
import { describe, expect, it } from 'vitest'
import type { FinancialEntry as FinancialEntryRow } from '../../../db/types.js'
import { DrizzleFinancialEntryRepository } from './drizzle-financial-entry-repository.js'
import { HouseholdScopeViolationError, PersistenceError } from './persistence-errors.js'
import { FakeDrizzleDb } from './test-support/fake-drizzle-db.js'
import type { DrizzleDb } from './types.js'

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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function repositoryWith(rows: FinancialEntryRow[] = [], failWith?: unknown) {
  const db = new FakeDrizzleDb(rows, failWith)
  return { repository: new DrizzleFinancialEntryRepository(db as unknown as DrizzleDb), db }
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

  it('save de movimentação sem responsável não preenche a coluna auxiliar', async () => {
    const { repository, db } = repositoryWith([])
    await repository.save({
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

  it('save de movimentação com responsável do mesmo household preenche a coluna auxiliar internamente', async () => {
    const { repository, db } = repositoryWith([])
    await repository.save({
      id: 1,
      householdId: 10,
      periodId: 100,
      categoryId: 200,
      responsibleMemberId: 50,
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
    expect(db.insertedValues[0]?.responsibleMemberId).toBe(50)
    expect(db.insertedValues[0]?.responsibleMemberHouseholdId).toBe(10)
  })

  it('atualização que remove o responsável zera também a coluna auxiliar', async () => {
    const { repository, db } = repositoryWith([
      buildRow({ id: 1, responsibleMemberId: 50, responsibleMemberHouseholdId: 10 }),
    ])
    await repository.save({
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

  it('mapeamento de leitura nunca expõe responsibleMemberHouseholdId ao domínio', async () => {
    const { repository } = repositoryWith([
      buildRow({ id: 1, responsibleMemberId: 50, responsibleMemberHouseholdId: 10 }),
    ])
    const entry = await repository.findById(1)
    expect(entry).not.toBeNull()
    expect('responsibleMemberHouseholdId' in (entry as object)).toBe(false)
  })

  it('nextId lê o próximo AUTO_INCREMENT via information_schema', async () => {
    const { repository, db } = repositoryWith([])
    db.executeRows = [{ nextId: 7 }]
    expect(await repository.nextId()).toBe(7)
  })

  it('propaga HouseholdScopeViolationError quando o banco rejeita responsável de outro household', async () => {
    const { repository } = repositoryWith([], {
      code: 'ER_NO_REFERENCED_ROW_2',
      sqlMessage:
        'Cannot add or update a child row: a foreign key constraint fails (CONSTRAINT `financial_entries_responsible_member_household_fk`)',
    })
    await expect(
      repository.save({
        id: 1,
        householdId: 10,
        periodId: 100,
        categoryId: 200,
        responsibleMemberId: 999,
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
    ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
  })

  it('propaga PersistenceError sanitizado para falha de leitura', async () => {
    const { repository } = repositoryWith([], new Error('connect ETIMEDOUT'))
    await expect(repository.findByHousehold(10)).rejects.toBeInstanceOf(PersistenceError)
  })

  it('salva movimentação existente no household correto (atualização, sem upsert)', async () => {
    const { repository, db } = repositoryWith([buildRow({ id: 1, householdId: 10, status: 'planned' })])
    const updated = await repository.save({
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
    // Ramo de UPDATE, não de INSERT: `insertedValues` do fake só registra o resultado final via `.update().set()`.
    expect(db.insertedValues[0]?.status).toBe('pending')
  })

  it('rejeita salvar com ID que pertence a outro household', async () => {
    const { repository } = repositoryWith([buildRow({ id: 1, householdId: 10 })])
    await expect(
      repository.save({
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
  })

  it('impede a troca de household de uma movimentação existente', async () => {
    const { repository, db } = repositoryWith([buildRow({ id: 5, householdId: 10 })])
    await expect(
      repository.save({
        id: 5,
        householdId: 99,
        periodId: 100,
        categoryId: 200,
        responsibleMemberId: null,
        createdByUserId: 300,
        entryType: 'expense',
        status: 'planned',
        description: 'Tentativa de mover household',
        expectedAmount: parseMoney('1000.00'),
        actualAmount: null,
        dueDate: null,
        realizationDate: null,
        notes: null,
      }),
    ).rejects.toBeInstanceOf(HouseholdScopeViolationError)
    // O household original nunca é sobrescrito.
    expect(db.insertedValues).toHaveLength(0)
  })
})
