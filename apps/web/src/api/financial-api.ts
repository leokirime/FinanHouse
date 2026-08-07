import type { Category, CategoryBudget, FinancialEntry, HouseholdMember, Money, MonthlyPeriod } from '@finanhouse/domain'
import { apiRequest } from './api-client.ts'
import type { ApiConfig } from './api-config.ts'
import {
  categoryBudgetFromDto,
  categoryFromDto,
  financialEntryFromDto,
  householdMemberFromDto,
  monthlyPeriodFromDto,
  moneyToDto,
} from './financial-api.mappers.ts'
import type {
  CategoryBudgetDto,
  CategoryDto,
  CreateFinancialEntryRequest,
  FinancialEntryDto,
  HouseholdMemberDto,
  MonthlyPeriodDto,
  PutCategoryBudgetRequest,
  UpdateFinancialEntryRequest,
} from './financial-api.types.ts'

function scopedPath(config: ApiConfig, path: string): string {
  return `/api/v1/households/${config.householdId}${path}`
}

export interface HealthStatus {
  status: string
}

export async function checkHealth(config: ApiConfig, signal?: AbortSignal): Promise<HealthStatus> {
  return apiRequest<HealthStatus>(config, '/health', { signal })
}

export async function checkReady(config: ApiConfig, signal?: AbortSignal): Promise<HealthStatus> {
  return apiRequest<HealthStatus>(config, '/ready', { signal })
}

export async function listCategories(config: ApiConfig, signal?: AbortSignal): Promise<Category[]> {
  const dtos = await apiRequest<CategoryDto[]>(config, scopedPath(config, '/categories'), { signal })
  return dtos.map(categoryFromDto)
}

export async function listMembers(config: ApiConfig, signal?: AbortSignal): Promise<HouseholdMember[]> {
  const dtos = await apiRequest<HouseholdMemberDto[]>(config, scopedPath(config, '/members'), { signal })
  return dtos.map(householdMemberFromDto)
}

export async function listPeriods(config: ApiConfig, signal?: AbortSignal): Promise<MonthlyPeriod[]> {
  const dtos = await apiRequest<MonthlyPeriodDto[]>(config, scopedPath(config, '/periods'), { signal })
  return dtos.map(monthlyPeriodFromDto)
}

/** Idempotente: cria (201) se a competência ainda não existe, ou devolve a existente (200). Nunca cria duplicata. */
export async function ensurePeriod(config: ApiConfig, referenceMonth: string, signal?: AbortSignal): Promise<MonthlyPeriod> {
  // O schema AJV do corpo é `{ type: 'object', additionalProperties: false }` — precisa de um
  // objeto vazio explícito (nunca "sem corpo"), ou o Fastify rejeita antes do handler rodar.
  const dto = await apiRequest<MonthlyPeriodDto>(config, scopedPath(config, `/periods/${referenceMonth}`), { method: 'PUT', body: {}, signal })
  return monthlyPeriodFromDto(dto)
}

export async function listEntries(config: ApiConfig, options: { periodId?: number; signal?: AbortSignal } = {}): Promise<FinancialEntry[]> {
  const dtos = await apiRequest<FinancialEntryDto[]>(config, scopedPath(config, '/entries'), {
    query: { periodId: options.periodId },
    signal: options.signal,
  })
  return dtos.map(financialEntryFromDto)
}

export interface CreateEntryInput {
  periodId: number
  categoryId: number
  responsibleMemberId: number | null
  entryType: FinancialEntry['entryType']
  description: string
  expectedAmount: Money
  dueDate: string | null
  notes: string | null
}

/** `createdByUserId` nunca é enviado — vem da sessão autenticada no backend (Bloco 19, DT-14); um cliente não consegue mais forjar outro usuário. */
export async function createEntry(config: ApiConfig, input: CreateEntryInput, signal?: AbortSignal): Promise<FinancialEntry> {
  const body: CreateFinancialEntryRequest = {
    periodId: input.periodId,
    categoryId: input.categoryId,
    responsibleMemberId: input.responsibleMemberId,
    entryType: input.entryType,
    description: input.description,
    expectedAmount: moneyToDto(input.expectedAmount),
    dueDate: input.dueDate,
    notes: input.notes,
  }
  const dto = await apiRequest<FinancialEntryDto>(config, scopedPath(config, '/entries'), { method: 'POST', body, signal })
  return financialEntryFromDto(dto)
}

export interface UpdateEntryInput {
  description?: string
  categoryId?: number
  responsibleMemberId?: number | null
  expectedAmount?: Money
  dueDate?: string | null
  notes?: string | null
}

export async function updateEntry(config: ApiConfig, entryId: number, changes: UpdateEntryInput, signal?: AbortSignal): Promise<FinancialEntry> {
  const body: UpdateFinancialEntryRequest = {
    ...(changes.description !== undefined ? { description: changes.description } : {}),
    ...(changes.categoryId !== undefined ? { categoryId: changes.categoryId } : {}),
    ...(changes.responsibleMemberId !== undefined ? { responsibleMemberId: changes.responsibleMemberId } : {}),
    ...(changes.expectedAmount !== undefined ? { expectedAmount: moneyToDto(changes.expectedAmount) } : {}),
    ...(changes.dueDate !== undefined ? { dueDate: changes.dueDate } : {}),
    ...(changes.notes !== undefined ? { notes: changes.notes } : {}),
  }
  const dto = await apiRequest<FinancialEntryDto>(config, scopedPath(config, `/entries/${entryId}`), { method: 'PUT', body, signal })
  return financialEntryFromDto(dto)
}

async function transitionEntry(config: ApiConfig, entryId: number, action: string, body?: unknown, signal?: AbortSignal): Promise<FinancialEntry> {
  const dto = await apiRequest<FinancialEntryDto>(config, scopedPath(config, `/entries/${entryId}/${action}`), { method: 'POST', body, signal })
  return financialEntryFromDto(dto)
}

export const markEntryPending = (config: ApiConfig, entryId: number, signal?: AbortSignal) => transitionEntry(config, entryId, 'mark-pending', undefined, signal)

export function realizeEntry(config: ApiConfig, entryId: number, actualAmount: Money, realizationDate: string, signal?: AbortSignal) {
  return transitionEntry(config, entryId, 'realize', { actualAmount: moneyToDto(actualAmount), realizationDate }, signal)
}

export const cancelEntry = (config: ApiConfig, entryId: number, signal?: AbortSignal) => transitionEntry(config, entryId, 'cancel', undefined, signal)

export const revertEntryRealization = (config: ApiConfig, entryId: number, signal?: AbortSignal) =>
  transitionEntry(config, entryId, 'revert-realization', undefined, signal)

export const reactivateEntry = (config: ApiConfig, entryId: number, signal?: AbortSignal) => transitionEntry(config, entryId, 'reopen', undefined, signal)

/** Exclusão real e permanente (Bloco 20, substitui o cancelamento como ação destrutiva disponível ao usuário) — nunca soft delete. */
export async function deleteEntry(config: ApiConfig, entryId: number, signal?: AbortSignal): Promise<void> {
  await apiRequest<void>(config, scopedPath(config, `/entries/${entryId}`), { method: 'DELETE', signal })
}

export async function listBudgets(config: ApiConfig, referenceMonth: string, signal?: AbortSignal): Promise<CategoryBudget[]> {
  const dtos = await apiRequest<CategoryBudgetDto[]>(config, scopedPath(config, `/periods/${referenceMonth}/budgets`), { signal })
  return dtos.map(categoryBudgetFromDto)
}

/** Idempotente: cria (201) se o limite ainda não existe para a categoria, ou atualiza o existente (200). */
export async function putBudget(config: ApiConfig, referenceMonth: string, categoryId: number, limitAmount: Money, signal?: AbortSignal): Promise<CategoryBudget> {
  const body: PutCategoryBudgetRequest = { limitAmount: moneyToDto(limitAmount) }
  const dto = await apiRequest<CategoryBudgetDto>(config, scopedPath(config, `/periods/${referenceMonth}/budgets/${categoryId}`), {
    method: 'PUT',
    body,
    signal,
  })
  return categoryBudgetFromDto(dto)
}

export async function deleteBudget(config: ApiConfig, referenceMonth: string, categoryId: number, signal?: AbortSignal): Promise<void> {
  await apiRequest<void>(config, scopedPath(config, `/periods/${referenceMonth}/budgets/${categoryId}`), { method: 'DELETE', signal })
}
