import {
  CategoryNotFoundError,
  createFinancialEntry,
  createInstallmentPlan,
  generateInstallments,
  HouseholdMismatchError,
  InstallmentPlanNotFoundError,
  openMonthlyPeriod,
  type FinancialEntry,
  type InstallmentPlan,
  type Money,
  type MonthlyPeriod,
} from '@finanhouse/domain'
import type { FinancialEntryRepository } from '../ports/financial-entry-repository.js'
import type { InstallmentPlanRepository } from '../ports/installment-plan-repository.js'
import type { InstallmentTransactionContext, InstallmentTransactionRunner } from '../ports/installment-transaction-runner.js'

export interface CreateInstallmentPurchaseInput {
  householdId: number
  description: string
  categoryId: number
  totalAmount: Money
  installmentCount: number
  firstReferenceMonth: string
  dueDay: number
  createdByUserId: number
}

export interface InstallmentPurchaseResult {
  plan: InstallmentPlan
  installments: FinancialEntry[]
}

/**
 * Resolve a `MonthlyPeriod` real de uma competência dentro da transação —
 * reutiliza se já existir, cria (sempre `open`, via `openMonthlyPeriod`,
 * mesma função de domínio usada por `OpenMonthlyPeriodService`) se ainda não
 * existir. Nenhuma restrição contra competências futuras: mesma política já
 * aplicada ao fluxo de abertura manual de competência (`PUT .../periods/:referenceMonth`).
 */
async function resolvePeriod(
  context: InstallmentTransactionContext,
  householdId: number,
  referenceMonth: string,
): Promise<MonthlyPeriod> {
  const existing = await context.periods.findByHouseholdAndReferenceMonth(householdId, referenceMonth)
  if (existing) return existing
  const { id: _draftId, ...draftPeriod } = openMonthlyPeriod({ id: 0, householdId, referenceMonth })
  return context.periods.create(draftPeriod)
}

/**
 * Orquestra a criação atômica de uma compra parcelada (RS-01, Sessão 12,
 * Bloco 04): `InstallmentPlan` + N `FinancialEntry` + eventuais `MonthlyPeriod`
 * novas, tudo dentro de uma única transação (`InstallmentTransactionRunner`).
 * Qualquer falha em qualquer etapa — categoria inválida, competência
 * fechada, erro de persistência em qualquer parcela — reverte a operação
 * inteira: nenhum plano, nenhuma parcela e nenhuma competência nova
 * sobrevive a um erro parcial.
 */
export class CreateInstallmentPurchaseService {
  constructor(private readonly deps: { transactionRunner: InstallmentTransactionRunner }) {}

  async execute(input: CreateInstallmentPurchaseInput): Promise<InstallmentPurchaseResult> {
    return this.deps.transactionRunner.run(async (context) => {
      // Validado explicitamente antes de criar qualquer linha — não confia somente na FK
      // composta do banco para dar um erro de negócio claro (Sessão 12, Bloco 04).
      const category = await context.categories.findById(input.categoryId)
      if (!category) {
        throw new CategoryNotFoundError(`Categoria ${input.categoryId} não encontrada.`)
      }
      if (category.householdId !== input.householdId) {
        throw new HouseholdMismatchError('A categoria informada não pertence ao mesmo household do parcelamento.')
      }

      // `id: 0` é um placeholder descartado — `createInstallmentPlan` exige `id` no input
      // (nunca usado em validação, só copiado para a entidade retornada); o `id` real vem
      // de `installmentPlans.create()`, gerado pelo AUTO_INCREMENT nativo do banco (DT-15).
      const { id: _draftPlanId, ...draftPlan } = createInstallmentPlan({
        id: 0,
        householdId: input.householdId,
        description: input.description,
        categoryId: input.categoryId,
        totalAmount: input.totalAmount,
        installmentCount: input.installmentCount,
        firstReferenceMonth: input.firstReferenceMonth,
        dueDay: input.dueDay,
        createdByUserId: input.createdByUserId,
        createdAt: new Date().toISOString(),
      })
      const plan = await context.installmentPlans.create(draftPlan)

      // Puro — nunca persiste nada; `plan.id` já é o id real gerado acima.
      const generated = generateInstallments(plan)

      const installments: FinancialEntry[] = []
      for (const installment of generated) {
        const period = await resolvePeriod(context, installment.householdId, installment.referenceMonth)

        // Reaproveita `createFinancialEntry` (mesma função usada por `CreateFinancialEntryService`):
        // valida a competência resolvida (`assertPeriodAllowsEntryChanges` — rejeita se a
        // competência já existia fechada/em revisão), a categoria e o valor, exatamente
        // como qualquer outro lançamento novo.
        const { id: _draftEntryId, ...draftEntry } = createFinancialEntry(
          {
            id: 0,
            householdId: installment.householdId,
            periodId: period.id,
            categoryId: installment.categoryId,
            responsibleMemberId: null,
            createdByUserId: installment.createdByUserId,
            entryType: installment.entryType,
            description: installment.description,
            expectedAmount: installment.expectedAmount,
            dueDate: installment.dueDate,
            notes: null,
            installmentPlanId: installment.installmentPlanId,
            installmentNumber: installment.installmentNumber,
          },
          { period, category },
        )
        installments.push(await context.entries.create(draftEntry))
      }

      return { plan, installments }
    })
  }
}

export interface InstallmentPlanReadDependencies {
  installmentPlans: InstallmentPlanRepository
  entries: FinancialEntryRepository
}

export class ListInstallmentPlansService {
  constructor(private readonly deps: InstallmentPlanReadDependencies) {}

  async execute(householdId: number): Promise<InstallmentPlan[]> {
    return this.deps.installmentPlans.findByHousehold(householdId)
  }
}

/** Sempre escopado por household — um plano de outro household é tratado como inexistente (404), nunca 403. */
export class GetInstallmentPlanDetailService {
  constructor(private readonly deps: InstallmentPlanReadDependencies) {}

  async execute(householdId: number, installmentPlanId: number): Promise<InstallmentPurchaseResult> {
    const plan = await this.deps.installmentPlans.findById(installmentPlanId)
    if (!plan || plan.householdId !== householdId) {
      throw new InstallmentPlanNotFoundError(`Parcelamento ${installmentPlanId} não encontrado para o household ${householdId}.`)
    }
    const installments = await this.deps.entries.findByInstallmentPlan(householdId, installmentPlanId)
    return { plan, installments }
  }
}
