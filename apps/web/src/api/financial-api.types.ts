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
  installmentPlanId: number | null
  installmentNumber: number | null
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

/** Formato exato devolvido pela API (Sessão 12, Bloco 04) — dinheiro como string decimal, nunca `number`/`bigint`. */
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

/**
 * `createdByUserId`/`householdId` nunca fazem parte do corpo — vêm da sessão
 * autenticada no backend (mesmo padrão de `CreateFinancialEntryRequest`,
 * Bloco 19/DT-14, reafirmado para parcelamentos no Bloco 04).
 */
export interface CreateInstallmentPurchaseRequest {
  description: string
  categoryId: number
  totalAmount: string
  installmentCount: number
  firstReferenceMonth: string
  dueDay: number
}
