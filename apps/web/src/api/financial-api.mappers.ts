import { formatMoney, parseMoney, type Category, type CategoryBudget, type FinancialEntry, type HouseholdMember, type Money, type MonthlyPeriod } from '@finanhouse/domain'
import type { CategoryBudgetDto, CategoryDto, FinancialEntryDto, HouseholdMemberDto, MonthlyPeriodDto } from './financial-api.types.ts'

/** Fronteira dinheiro (string decimal ↔ `Money`/`bigint`) — sempre via `parseMoney`/`formatMoney`, nunca `Number()`/`parseFloat`. */
export function moneyFromDto(value: string): Money {
  return parseMoney(value)
}

export function moneyToDto(value: Money): string {
  return formatMoney(value)
}

export function categoryFromDto(dto: CategoryDto): Category {
  return { id: dto.id, householdId: dto.householdId, name: dto.name, entryType: dto.entryType, status: dto.status }
}

export function householdMemberFromDto(dto: HouseholdMemberDto): HouseholdMember {
  return { id: dto.id, householdId: dto.householdId, userId: dto.userId, role: dto.role, status: dto.status }
}

export function monthlyPeriodFromDto(dto: MonthlyPeriodDto): MonthlyPeriod {
  return {
    id: dto.id,
    householdId: dto.householdId,
    referenceMonth: dto.referenceMonth,
    status: dto.status,
    closedAt: dto.closedAt,
    closedByUserId: dto.closedByUserId,
  }
}

export function categoryBudgetFromDto(dto: CategoryBudgetDto): CategoryBudget {
  return { id: dto.id, householdId: dto.householdId, periodId: dto.periodId, categoryId: dto.categoryId, limitAmount: moneyFromDto(dto.limitAmount) }
}

export function financialEntryFromDto(dto: FinancialEntryDto): FinancialEntry {
  return {
    id: dto.id,
    householdId: dto.householdId,
    periodId: dto.periodId,
    categoryId: dto.categoryId,
    responsibleMemberId: dto.responsibleMemberId,
    createdByUserId: dto.createdByUserId,
    entryType: dto.entryType,
    status: dto.status,
    description: dto.description,
    expectedAmount: moneyFromDto(dto.expectedAmount),
    actualAmount: dto.actualAmount !== null ? moneyFromDto(dto.actualAmount) : null,
    dueDate: dto.dueDate,
    realizationDate: dto.realizationDate,
    notes: dto.notes,
    installmentPlanId: dto.installmentPlanId,
    installmentNumber: dto.installmentNumber,
  }
}
