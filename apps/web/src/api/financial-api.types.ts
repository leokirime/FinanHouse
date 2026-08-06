import type { CategoryEntryType, CategoryStatus, FinancialEntryStatus, FinancialEntryType, HouseholdMemberRole, HouseholdMemberStatus, MonthlyPeriodStatus } from '@finanhouse/domain'

/**
 * Formatos exatamente como saem da API (`Docs/03_contracts/contrato_api_http.md`,
 * seção 6) — dinheiro sempre string decimal, nunca `number`/`bigint`. Convertidos
 * para os tipos de domínio em `financial-api.mappers.ts`, nunca usados diretamente por componentes.
 */
export interface CategoryDto {
  id: number
  householdId: number
  name: string
  entryType: CategoryEntryType
  status: CategoryStatus
}

export interface HouseholdMemberDto {
  id: number
  householdId: number
  userId: number
  role: HouseholdMemberRole
  status: HouseholdMemberStatus
}

export interface MonthlyPeriodDto {
  id: number
  householdId: number
  referenceMonth: string
  status: MonthlyPeriodStatus
  closedAt: string | null
  closedByUserId: number | null
}

export interface FinancialEntryDto {
  id: number
  householdId: number
  periodId: number
  categoryId: number
  responsibleMemberId: number | null
  createdByUserId: number
  entryType: FinancialEntryType
  status: FinancialEntryStatus
  description: string
  expectedAmount: string
  actualAmount: string | null
  dueDate: string | null
  realizationDate: string | null
  notes: string | null
}

export interface CreateFinancialEntryRequest {
  periodId: number
  categoryId: number
  responsibleMemberId: number | null
  entryType: FinancialEntryType
  description: string
  expectedAmount: string
  dueDate: string | null
  notes: string | null
}

export interface UpdateFinancialEntryRequest {
  description?: string
  categoryId?: number
  responsibleMemberId?: number | null
  expectedAmount?: string
  dueDate?: string | null
  notes?: string | null
}

export interface RealizeFinancialEntryRequest {
  actualAmount: string
  realizationDate: string
}

export interface CategoryBudgetDto {
  id: number
  householdId: number
  periodId: number
  categoryId: number
  limitAmount: string
}

export interface PutCategoryBudgetRequest {
  limitAmount: string
}
