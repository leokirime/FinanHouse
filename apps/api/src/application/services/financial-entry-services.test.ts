import {
  ClosedPeriodError,
  type Category,
  type HouseholdMember,
  InvalidStatusTransitionError,
  parseMoney,
} from '@finanhouse/domain'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryCategoryRepository } from '../../infrastructure/repositories/memory/in-memory-category-repository.js'
import { InMemoryFinancialEntryRepository } from '../../infrastructure/repositories/memory/in-memory-financial-entry-repository.js'
import { InMemoryHouseholdMemberRepository } from '../../infrastructure/repositories/memory/in-memory-household-member-repository.js'
import { InMemoryMonthlyPeriodRepository } from '../../infrastructure/repositories/memory/in-memory-monthly-period-repository.js'
import {
  CancelFinancialEntryService,
  CreateFinancialEntryService,
  DeleteFinancialEntryService,
  MarkFinancialEntryAsPendingService,
  RealizeFinancialEntryService,
  ReopenFinancialEntryService,
} from './financial-entry-services.js'
import { OpenMonthlyPeriodService } from './monthly-period-services.js'

const HOUSEHOLD_ID = 1

const category: Category = { id: 1, householdId: HOUSEHOLD_ID, name: 'Mercado', entryType: 'expense', status: 'active' }
const member: HouseholdMember = { id: 1, householdId: HOUSEHOLD_ID, userId: 1, role: 'member', status: 'active' }

describe('serviços de movimentação (repositórios em memória)', () => {
  const entries = new InMemoryFinancialEntryRepository()
  const periods = new InMemoryMonthlyPeriodRepository()
  const categories = new InMemoryCategoryRepository()
  const members = new InMemoryHouseholdMemberRepository()
  const deps = { entries, periods, categories, members }

  beforeEach(() => {
    entries.reset()
    periods.reset()
    categories.reset()
    members.reset()
    categories.seed([category])
    members.seed([member])
  })

  it('cria, marca como pendente, realiza e persiste uma movimentação de ponta a ponta', async () => {
    const period = await new OpenMonthlyPeriodService(deps).execute({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })

    const created = await new CreateFinancialEntryService(deps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: period.id,
      categoryId: category.id,
      responsibleMemberId: member.id,
      createdByUserId: 1,
      entryType: 'expense',
      description: 'Compras',
      expectedAmount: parseMoney('250.00'),
      dueDate: null,
      notes: null,
    })
    expect(created.status).toBe('planned')
    expect(await entries.findById(created.id)).toEqual(created)

    const pending = await new MarkFinancialEntryAsPendingService(deps).execute(created.id)
    expect(pending.status).toBe('pending')

    const realized = await new RealizeFinancialEntryService(deps).execute(created.id, {
      actualAmount: parseMoney('245.00'),
      realizationDate: '2026-07-10',
    })
    expect(realized.status).toBe('realized')
    expect(realized.actualAmount).toBe(parseMoney('245.00'))

    const persisted = await entries.findById(created.id)
    expect(persisted?.status).toBe('realized')
  })

  it('cancela e reativa uma movimentação', async () => {
    const period = await new OpenMonthlyPeriodService(deps).execute({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    const created = await new CreateFinancialEntryService(deps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: period.id,
      categoryId: category.id,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'expense',
      description: 'Compras',
      expectedAmount: parseMoney('50.00'),
      dueDate: null,
      notes: null,
    })

    const cancelled = await new CancelFinancialEntryService(deps).execute(created.id)
    expect(cancelled.status).toBe('cancelled')

    const reactivated = await new ReopenFinancialEntryService(deps).execute(created.id)
    expect(reactivated.status).toBe('planned')
  })

  it('propaga erro de domínio quando a competência está fechada', async () => {
    const period = await new OpenMonthlyPeriodService(deps).execute({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    const created = await new CreateFinancialEntryService(deps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: period.id,
      categoryId: category.id,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'expense',
      description: 'Compras',
      expectedAmount: parseMoney('50.00'),
      dueDate: null,
      notes: null,
    })

    const closedPeriod = { ...period, status: 'closed' as const }
    periods.seed([closedPeriod])

    await expect(new CancelFinancialEntryService(deps).execute(created.id)).rejects.toThrow(ClosedPeriodError)
  })

  it('propaga erro de transição inválida (realized não pode ser cancelada diretamente)', async () => {
    const period = await new OpenMonthlyPeriodService(deps).execute({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
    const created = await new CreateFinancialEntryService(deps).execute({
      householdId: HOUSEHOLD_ID,
      periodId: period.id,
      categoryId: category.id,
      responsibleMemberId: null,
      createdByUserId: 1,
      entryType: 'expense',
      description: 'Compras',
      expectedAmount: parseMoney('50.00'),
      dueDate: null,
      notes: null,
    })
    await new RealizeFinancialEntryService(deps).execute(created.id, {
      actualAmount: parseMoney('50.00'),
      realizationDate: '2026-07-10',
    })

    await expect(new CancelFinancialEntryService(deps).execute(created.id)).rejects.toThrow(InvalidStatusTransitionError)
  })

  describe('DeleteFinancialEntryService (Bloco 20 — substitui o cancelamento como ação destrutiva)', () => {
    it('exclui permanentemente uma movimentação "planned"', async () => {
      const period = await new OpenMonthlyPeriodService(deps).execute({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
      const created = await new CreateFinancialEntryService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: period.id,
        categoryId: category.id,
        responsibleMemberId: null,
        createdByUserId: 1,
        entryType: 'expense',
        description: 'Compras',
        expectedAmount: parseMoney('50.00'),
        dueDate: null,
        notes: null,
      })

      await new DeleteFinancialEntryService(deps).execute(created.id, HOUSEHOLD_ID)
      expect(await entries.findById(created.id)).toBeNull()
    })

    it('exclui permanentemente uma movimentação "pending"', async () => {
      const period = await new OpenMonthlyPeriodService(deps).execute({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
      const created = await new CreateFinancialEntryService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: period.id,
        categoryId: category.id,
        responsibleMemberId: null,
        createdByUserId: 1,
        entryType: 'expense',
        description: 'Compras',
        expectedAmount: parseMoney('50.00'),
        dueDate: null,
        notes: null,
      })
      await new MarkFinancialEntryAsPendingService(deps).execute(created.id)

      await new DeleteFinancialEntryService(deps).execute(created.id, HOUSEHOLD_ID)
      expect(await entries.findById(created.id)).toBeNull()
    })

    it('exclui permanentemente uma movimentação "realized" em competência aberta (ajuste pós-revisão do Bloco 20)', async () => {
      const period = await new OpenMonthlyPeriodService(deps).execute({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
      const created = await new CreateFinancialEntryService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: period.id,
        categoryId: category.id,
        responsibleMemberId: null,
        createdByUserId: 1,
        entryType: 'expense',
        description: 'Compras',
        expectedAmount: parseMoney('50.00'),
        dueDate: null,
        notes: null,
      })
      await new RealizeFinancialEntryService(deps).execute(created.id, { actualAmount: parseMoney('50.00'), realizationDate: '2026-07-10' })

      await new DeleteFinancialEntryService(deps).execute(created.id, HOUSEHOLD_ID)
      expect(await entries.findById(created.id)).toBeNull()
    })

    it('rejeita excluir uma movimentação "cancelled" — nunca remove do repositório (reativação é o único caminho de volta)', async () => {
      const period = await new OpenMonthlyPeriodService(deps).execute({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
      const created = await new CreateFinancialEntryService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: period.id,
        categoryId: category.id,
        responsibleMemberId: null,
        createdByUserId: 1,
        entryType: 'expense',
        description: 'Compras',
        expectedAmount: parseMoney('50.00'),
        dueDate: null,
        notes: null,
      })
      await new CancelFinancialEntryService(deps).execute(created.id)

      await expect(new DeleteFinancialEntryService(deps).execute(created.id, HOUSEHOLD_ID)).rejects.toThrow(InvalidStatusTransitionError)
      expect(await entries.findById(created.id)).not.toBeNull()
    })

    it('rejeita excluir em competência fechada — nunca remove do repositório', async () => {
      const period = await new OpenMonthlyPeriodService(deps).execute({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
      const created = await new CreateFinancialEntryService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: period.id,
        categoryId: category.id,
        responsibleMemberId: null,
        createdByUserId: 1,
        entryType: 'expense',
        description: 'Compras',
        expectedAmount: parseMoney('50.00'),
        dueDate: null,
        notes: null,
      })
      periods.seed([{ ...period, status: 'closed' as const }])

      await expect(new DeleteFinancialEntryService(deps).execute(created.id, HOUSEHOLD_ID)).rejects.toThrow(ClosedPeriodError)
      expect(await entries.findById(created.id)).not.toBeNull()
    })

    it('rejeita excluir uma movimentação "realized" em competência fechada — nunca remove do repositório', async () => {
      const period = await new OpenMonthlyPeriodService(deps).execute({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
      const created = await new CreateFinancialEntryService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: period.id,
        categoryId: category.id,
        responsibleMemberId: null,
        createdByUserId: 1,
        entryType: 'expense',
        description: 'Compras',
        expectedAmount: parseMoney('50.00'),
        dueDate: null,
        notes: null,
      })
      await new RealizeFinancialEntryService(deps).execute(created.id, { actualAmount: parseMoney('50.00'), realizationDate: '2026-07-10' })
      periods.seed([{ ...period, status: 'closed' as const }])

      await expect(new DeleteFinancialEntryService(deps).execute(created.id, HOUSEHOLD_ID)).rejects.toThrow(ClosedPeriodError)
      expect(await entries.findById(created.id)).not.toBeNull()
    })

    it('nunca exclui um registro de outro household, mesmo com o mesmo id', async () => {
      const period = await new OpenMonthlyPeriodService(deps).execute({ householdId: HOUSEHOLD_ID, referenceMonth: '2026-07-01' })
      const created = await new CreateFinancialEntryService(deps).execute({
        householdId: HOUSEHOLD_ID,
        periodId: period.id,
        categoryId: category.id,
        responsibleMemberId: null,
        createdByUserId: 1,
        entryType: 'expense',
        description: 'Compras',
        expectedAmount: parseMoney('50.00'),
        dueDate: null,
        notes: null,
      })

      await new DeleteFinancialEntryService(deps).execute(created.id, 999)
      expect(await entries.findById(created.id)).not.toBeNull()
    })
  })
})
