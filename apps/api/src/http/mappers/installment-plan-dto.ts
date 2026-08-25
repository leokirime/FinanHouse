import { formatMoney, type FinancialEntry, type InstallmentPlan } from '@finanhouse/domain'
import { toFinancialEntryDto, type FinancialEntryDto } from './financial-entry-dto.js'

export interface InstallmentPlanDto {
  id: number
  householdId: number
  description: string
  categoryId: number
  totalAmount: string
  installmentCount: number
  firstReferenceMonth: string
  dueDay: number
  createdByUserId: number
  createdAt: string
}

export interface InstallmentPurchaseDto {
  plan: InstallmentPlanDto
  installments: FinancialEntryDto[]
}

export function toInstallmentPlanDto(plan: InstallmentPlan): InstallmentPlanDto {
  return {
    id: plan.id,
    householdId: plan.householdId,
    description: plan.description,
    categoryId: plan.categoryId,
    totalAmount: formatMoney(plan.totalAmount),
    installmentCount: plan.installmentCount,
    firstReferenceMonth: plan.firstReferenceMonth,
    dueDay: plan.dueDay,
    createdByUserId: plan.createdByUserId,
    createdAt: plan.createdAt,
  }
}

export function toInstallmentPurchaseDto(plan: InstallmentPlan, installments: FinancialEntry[]): InstallmentPurchaseDto {
  return {
    plan: toInstallmentPlanDto(plan),
    installments: installments.map(toFinancialEntryDto),
  }
}
