import { CategoryNotFoundError, HouseholdMismatchError, InstallmentPlanNotFoundError, parseMoney, type Category } from '@finanhouse/domain'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryCategoryRepository } from '../../infrastructure/repositories/memory/in-memory-category-repository.js'
import { InMemoryFinancialEntryRepository } from '../../infrastructure/repositories/memory/in-memory-financial-entry-repository.js'
import { InMemoryInstallmentPlanRepository } from '../../infrastructure/repositories/memory/in-memory-installment-plan-repository.js'
import { InMemoryInstallmentTransactionRunner } from '../../infrastructure/repositories/memory/in-memory-installment-transaction-runner.js'
import { InMemoryMonthlyPeriodRepository } from '../../infrastructure/repositories/memory/in-memory-monthly-period-repository.js'
import {
  CreateInstallmentPurchaseService,
  GetInstallmentPlanDetailService,
  ListInstallmentPlansService,
  type CreateInstallmentPurchaseInput,
} from './installment-purchase-services.js'

const HOUSEHOLD_ID = 1
const OTHER_HOUSEHOLD_ID = 2
const USER_A = 100

const category: Category = { id: 1, householdId: HOUSEHOLD_ID, name: 'Móveis', entryType: 'expense', status: 'active' }
const otherHouseholdCategory: Category = { id: 2, householdId: OTHER_HOUSEHOLD_ID, name: 'Outra', entryType: 'expense', status: 'active' }

function baseInput(overrides: Partial<CreateInstallmentPurchaseInput> = {}): CreateInstallmentPurchaseInput {
  return {
    householdId: HOUSEHOLD_ID,
    description: 'Sofá',
    categoryId: category.id,
    totalAmount: parseMoney('3000.00'),
    installmentCount: 10,
    firstReferenceMonth: '2026-08-01',
    dueDay: 10,
    createdByUserId: USER_A,
    ...overrides,
  }
}

describe('CreateInstallmentPurchaseService / leitura de InstallmentPlan (RS-01, Sessão 12, Bloco 04)', () => {
  let installmentPlans: InMemoryInstallmentPlanRepository
  let entries: InMemoryFinancialEntryRepository
  let periods: InMemoryMonthlyPeriodRepository
  let categories: InMemoryCategoryRepository
  let createService: CreateInstallmentPurchaseService
  let readDeps: { installmentPlans: InMemoryInstallmentPlanRepository; entries: InMemoryFinancialEntryRepository }

  beforeEach(() => {
    installmentPlans = new InMemoryInstallmentPlanRepository()
    entries = new InMemoryFinancialEntryRepository()
    periods = new InMemoryMonthlyPeriodRepository()
    categories = new InMemoryCategoryRepository()
    categories.seed([category, otherHouseholdCategory])
    const transactionRunner = new InMemoryInstallmentTransactionRunner(installmentPlans, entries, periods, categories)
    createService = new CreateInstallmentPurchaseService({ transactionRunner })
    readDeps = { installmentPlans, entries }
  })

  describe('Caso A — sucesso', () => {
    it('cria 1 InstallmentPlan + 10 FinancialEntry, soma exata do total, competências resolvidas', async () => {
      const { plan, installments } = await createService.execute(baseInput())

      expect(installments).toHaveLength(10)
      const sum = installments.reduce((total, entry) => total + entry.expectedAmount, 0n)
      expect(sum).toBe(parseMoney('3000.00'))

      const persistedPlan = await installmentPlans.findById(plan.id)
      expect(persistedPlan).not.toBeNull()
      const persistedEntries = await entries.findByInstallmentPlan(HOUSEHOLD_ID, plan.id)
      expect(persistedEntries).toHaveLength(10)

      // Julho não é usado (plano começa em agosto); agosto/2026 a maio/2027 (10 competências).
      const referenceMonths = (await periods.findByHousehold(HOUSEHOLD_ID)).map((p) => p.referenceMonth).sort()
      expect(referenceMonths).toEqual([
        '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01',
        '2027-01-01', '2027-02-01', '2027-03-01', '2027-04-01', '2027-05-01',
      ])
    })

    it('cada parcela tem status planned, entryType expense, actualAmount/realizationDate nulos, installmentNumber 1..N sem lacuna', () => {
      return createService.execute(baseInput()).then(({ installments }) => {
        const numbers = installments.map((e) => e.installmentNumber).sort((a, b) => (a ?? 0) - (b ?? 0))
        expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        for (const entry of installments) {
          expect(entry.status).toBe('planned')
          expect(entry.entryType).toBe('expense')
          expect(entry.actualAmount).toBeNull()
          expect(entry.realizationDate).toBeNull()
          expect(entry.responsibleMemberId).toBeNull()
        }
      })
    })
  })

  describe('Caso B — falha ao criar o plano: rollback total', () => {
    it('0 plano, 0 parcelas, 0 período após a falha', async () => {
      installmentPlans.create = async () => {
        throw new Error('falha simulada ao inserir o plano')
      }

      await expect(createService.execute(baseInput())).rejects.toThrow('falha simulada ao inserir o plano')

      expect(await installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
      expect(await entries.findByHousehold(HOUSEHOLD_ID)).toEqual([])
      expect(await periods.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    })
  })

  describe('Caso C — falha na parcela 1: rollback total', () => {
    it('0 plano, 0 parcelas, 0 período após a falha', async () => {
      let calls = 0
      const originalCreate = entries.create.bind(entries)
      entries.create = async (entry) => {
        calls += 1
        if (calls === 1) throw new Error('falha simulada na parcela 1')
        return originalCreate(entry)
      }

      await expect(createService.execute(baseInput())).rejects.toThrow('falha simulada na parcela 1')

      expect(await installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
      expect(await entries.findByHousehold(HOUSEHOLD_ID)).toEqual([])
      expect(await periods.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    })
  })

  describe('Caso D — falha em parcela intermediária (6/10): rollback total', () => {
    it('0 plano, 0 parcelas (nem as 5 já criadas antes da falha), 0 período', async () => {
      let calls = 0
      const originalCreate = entries.create.bind(entries)
      entries.create = async (entry) => {
        calls += 1
        if (calls === 6) throw new Error('falha simulada na parcela 6')
        return originalCreate(entry)
      }

      await expect(createService.execute(baseInput())).rejects.toThrow('falha simulada na parcela 6')

      expect(await installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
      expect(await entries.findByHousehold(HOUSEHOLD_ID)).toEqual([])
      expect(await periods.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    })
  })

  describe('Caso E — falha na última parcela (10/10): rollback total', () => {
    it('0 plano, 0 parcelas (nem as 9 já criadas antes da falha), 0 período', async () => {
      let calls = 0
      const originalCreate = entries.create.bind(entries)
      entries.create = async (entry) => {
        calls += 1
        if (calls === 10) throw new Error('falha simulada na parcela 10')
        return originalCreate(entry)
      }

      await expect(createService.execute(baseInput())).rejects.toThrow('falha simulada na parcela 10')

      expect(await installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
      expect(await entries.findByHousehold(HOUSEHOLD_ID)).toEqual([])
      expect(await periods.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    })
  })

  describe('Caso F — falha ao criar competência: rollback total', () => {
    it('0 plano, 0 parcelas, 0 período novo — inclusive a competência que já existia antes é preservada intacta', async () => {
      const preExistingPeriod = await periods.create({
        householdId: HOUSEHOLD_ID,
        referenceMonth: '2026-08-01',
        status: 'open',
        closedAt: null,
        closedByUserId: null,
      })
      periods.create = async () => {
        throw new Error('falha simulada ao criar competência')
      }

      await expect(createService.execute(baseInput())).rejects.toThrow('falha simulada ao criar competência')

      expect(await installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
      expect(await entries.findByHousehold(HOUSEHOLD_ID)).toEqual([])
      expect(await periods.findByHousehold(HOUSEHOLD_ID)).toEqual([preExistingPeriod])
    })
  })

  describe('Caso G — categoria de outro household: nenhuma escrita', () => {
    it('rejeita com HouseholdMismatchError antes de criar qualquer linha', async () => {
      await expect(createService.execute(baseInput({ categoryId: otherHouseholdCategory.id }))).rejects.toBeInstanceOf(
        HouseholdMismatchError,
      )

      expect(await installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
      expect(await entries.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    })

    it('categoria inexistente: rejeita com CategoryNotFoundError, nenhuma escrita', async () => {
      await expect(createService.execute(baseInput({ categoryId: 999 }))).rejects.toBeInstanceOf(CategoryNotFoundError)
      expect(await installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    })
  })

  describe('Divisão de valores — integração com o domínio (splitMoney)', () => {
    it('R$ 1000,00 / 3 parcelas: 333.33 + 333.33 + 333.34, soma persistida exatamente 1000.00', async () => {
      const { installments } = await createService.execute(
        baseInput({ totalAmount: parseMoney('1000.00'), installmentCount: 3 }),
      )
      const sorted = [...installments].sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0))
      expect(sorted.map((e) => e.expectedAmount)).toEqual([parseMoney('333.33'), parseMoney('333.33'), parseMoney('333.34')])
      expect(sorted.reduce((total, e) => total + e.expectedAmount, 0n)).toBe(parseMoney('1000.00'))
    })
  })

  describe('Datas — virada de ano e dueDay em meses de tamanhos diferentes', () => {
    it('dezembro → janeiro: competências avançam por aritmética de ano/mês, nunca por soma de dias', async () => {
      const { installments } = await createService.execute(
        baseInput({ installmentCount: 3, firstReferenceMonth: '2026-12-01', dueDay: 15 }),
      )
      const referenceMonths = installments
        .sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0))
        .map((e) => e.dueDate)
      expect(referenceMonths).toEqual(['2026-12-15', '2027-01-15', '2027-02-15'])
    })

    it('dueDay 31: resolvido para o último dia válido de cada mês (janeiro 31, fevereiro 28, fevereiro bissexto 29, abril 30)', async () => {
      const { installments: nonLeap } = await createService.execute(
        baseInput({ installmentCount: 2, firstReferenceMonth: '2027-01-01', dueDay: 31 }),
      )
      const nonLeapDates = nonLeap.sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0)).map((e) => e.dueDate)
      expect(nonLeapDates).toEqual(['2027-01-31', '2027-02-28'])

      installmentPlans.reset()
      entries.reset()
      periods.reset()
      const { installments: leap } = await createService.execute(
        baseInput({ installmentCount: 4, firstReferenceMonth: '2028-01-01', dueDay: 31 }),
      )
      const leapDates = leap.sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0)).map((e) => e.dueDate)
      expect(leapDates).toEqual(['2028-01-31', '2028-02-29', '2028-03-31', '2028-04-30'])
    })
  })

  describe('Household — visibilidade compartilhada, autoria, e isolamento entre households', () => {
    it('membro A cria; household é o proprietário (não createdByUserId); membro B do mesmo household consegue ler', async () => {
      const { plan } = await createService.execute(baseInput({ createdByUserId: USER_A }))

      expect(plan.householdId).toBe(HOUSEHOLD_ID)
      expect(plan.createdByUserId).toBe(USER_A)

      // "Membro B" só precisa do mesmo householdId para ler — createdByUserId nunca é usado como filtro de visibilidade.
      const detail = await new GetInstallmentPlanDetailService(readDeps).execute(HOUSEHOLD_ID, plan.id)
      expect(detail.plan.id).toBe(plan.id)
      expect(detail.installments).toHaveLength(10)
    })

    it('household externo não consegue ler — 404 (InstallmentPlanNotFoundError), nunca vaza dado de outro household', async () => {
      const { plan } = await createService.execute(baseInput())

      await expect(new GetInstallmentPlanDetailService(readDeps).execute(OTHER_HOUSEHOLD_ID, plan.id)).rejects.toBeInstanceOf(
        InstallmentPlanNotFoundError,
      )
    })

    it('ListInstallmentPlansService isola por household', async () => {
      await createService.execute(baseInput())
      await createService.execute(baseInput({ householdId: OTHER_HOUSEHOLD_ID, categoryId: otherHouseholdCategory.id }))

      const plansForHousehold = await new ListInstallmentPlansService(readDeps).execute(HOUSEHOLD_ID)
      expect(plansForHousehold).toHaveLength(1)
      expect(plansForHousehold[0]?.householdId).toBe(HOUSEHOLD_ID)
    })
  })

  describe('Compatibilidade com lançamento avulso — nunca vira parcelamento', () => {
    it('uma FinancialEntry criada fora de um InstallmentPlan continua com installmentPlanId/installmentNumber nulos', async () => {
      const avulso = await entries.create({
        householdId: HOUSEHOLD_ID,
        periodId: 1,
        categoryId: category.id,
        responsibleMemberId: null,
        createdByUserId: USER_A,
        entryType: 'expense',
        status: 'planned',
        description: 'Compras do mês',
        expectedAmount: parseMoney('50.00'),
        actualAmount: null,
        dueDate: null,
        realizationDate: null,
        notes: null,
        installmentPlanId: null,
        installmentNumber: null,
      })
      expect(avulso.installmentPlanId).toBeNull()
      expect(avulso.installmentNumber).toBeNull()
    })
  })
})
