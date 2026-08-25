import type { Category } from '../category/category.js'
import {
  CategoryEntryTypeMismatchError,
  ClosedPeriodError,
  HouseholdMismatchError,
  InactiveCategoryError,
  InactiveHouseholdMemberError,
  InvalidDateError,
  InvalidStatusTransitionError,
  MissingRealizationDataError,
  PeriodInReviewError,
  UnexpectedRealizationDataError,
} from '../errors/domain-errors.js'
import type { HouseholdMember } from '../household-member/household-member.js'
import { assertPositiveMoney, type Money } from '../money/money.js'
import type { MonthlyPeriod } from '../monthly-period/monthly-period.js'
import type { FinancialEntry, FinancialEntryStatus, FinancialEntryType } from './financial-entry.js'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Valida formato YYYY-MM-DD e que a data é um dia de calendário real. */
export function assertValidDate(value: string, fieldName: string): void {
  if (!DATE_PATTERN.test(value)) {
    throw new InvalidDateError(`${fieldName} deve estar no formato YYYY-MM-DD. Recebido: "${value}".`)
  }
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const isRealCalendarDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  if (!isRealCalendarDate) {
    throw new InvalidDateError(`${fieldName} não é uma data de calendário válida: "${value}".`)
  }
}

/**
 * Contexto de entidades relacionadas necessário para criar/alterar uma
 * movimentação — quem chama a regra é responsável por buscá-las nos
 * repositórios antes.
 */
export interface FinancialEntryContext {
  period: MonthlyPeriod
  category: Category
  member?: HouseholdMember | null
}

function assertHouseholdConsistency(householdId: number, context: FinancialEntryContext): void {
  if (context.period.householdId !== householdId) {
    throw new HouseholdMismatchError('O período informado não pertence ao mesmo household da movimentação.')
  }
  if (context.category.householdId !== householdId) {
    throw new HouseholdMismatchError('A categoria informada não pertence ao mesmo household da movimentação.')
  }
  if (context.member && context.member.householdId !== householdId) {
    throw new HouseholdMismatchError('O membro responsável informado não pertence ao mesmo household da movimentação.')
  }
}

function assertCategoryUsable(category: Category, entryType: FinancialEntryType): void {
  if (category.status !== 'active') {
    throw new InactiveCategoryError(`Categoria "${category.name}" está inativa e não pode ser usada em uma nova movimentação.`)
  }
  if (category.entryType !== entryType) {
    throw new CategoryEntryTypeMismatchError(
      `A categoria "${category.name}" é do tipo "${category.entryType}", incompatível com a movimentação do tipo "${entryType}".`,
    )
  }
}

function assertMemberUsable(member: HouseholdMember | null | undefined): void {
  if (member && member.status !== 'active') {
    throw new InactiveHouseholdMemberError('Membro responsável está inativo e não pode ser associado a uma nova movimentação.')
  }
}

/**
 * Uma competência fechada nunca permite alteração. Uma competência em
 * revisão bloqueia movimentações comuns, mas permite ajustes explícitos de
 * revisão (`allowReviewAdjustment: true`) — usado pelas operações de
 * estorno/correção/reativação.
 */
export function assertPeriodAllowsEntryChanges(
  period: MonthlyPeriod,
  options: { allowReviewAdjustment?: boolean } = {},
): void {
  if (period.status === 'closed') {
    throw new ClosedPeriodError('Não é possível criar, alterar, cancelar ou realizar movimentações em uma competência fechada.')
  }
  if (period.status === 'review' && !options.allowReviewAdjustment) {
    throw new PeriodInReviewError(
      'Competência em revisão não permite novas movimentações comuns — use uma operação explícita de ajuste de revisão.',
    )
  }
}

/**
 * Verifica os invariantes de dados de realização: `realized` deve ter
 * `actualAmount`/`realizationDate`; qualquer outro status não deve tê-los.
 */
export function assertFinancialEntryRealizationInvariants(entry: FinancialEntry): void {
  if (entry.status === 'realized') {
    if (entry.actualAmount === null) {
      throw new MissingRealizationDataError('Movimentação "realized" deve possuir actual_amount.')
    }
    if (entry.realizationDate === null) {
      throw new MissingRealizationDataError('Movimentação "realized" deve possuir realization_date.')
    }
  } else {
    if (entry.actualAmount !== null) {
      throw new UnexpectedRealizationDataError(`Movimentação "${entry.status}" não deve possuir actual_amount.`)
    }
    if (entry.realizationDate !== null) {
      throw new UnexpectedRealizationDataError(`Movimentação "${entry.status}" não deve possuir realization_date.`)
    }
  }
}

export interface CreateFinancialEntryInput {
  id: number
  householdId: number
  periodId: number
  categoryId: number
  responsibleMemberId: number | null
  createdByUserId: number
  entryType: FinancialEntryType
  description: string
  expectedAmount: Money
  dueDate: string | null
  notes: string | null
  /** Vínculo com um `InstallmentPlan` (Sessão 12, Bloco 04) — omitido por todo lançamento avulso, sempre `null`/`null` por padrão. Nunca um preenchido sem o outro. */
  installmentPlanId?: number | null
  installmentNumber?: number | null
}

export function createFinancialEntry(input: CreateFinancialEntryInput, context: FinancialEntryContext): FinancialEntry {
  assertPeriodAllowsEntryChanges(context.period)
  assertHouseholdConsistency(input.householdId, context)
  assertCategoryUsable(context.category, input.entryType)
  assertMemberUsable(context.member)
  assertPositiveMoney(input.expectedAmount, 'expected_amount')
  if (input.dueDate) assertValidDate(input.dueDate, 'due_date')

  const entry: FinancialEntry = {
    id: input.id,
    householdId: input.householdId,
    periodId: input.periodId,
    categoryId: input.categoryId,
    responsibleMemberId: input.responsibleMemberId,
    createdByUserId: input.createdByUserId,
    entryType: input.entryType,
    status: 'planned',
    description: input.description,
    expectedAmount: input.expectedAmount,
    actualAmount: null,
    dueDate: input.dueDate,
    realizationDate: null,
    notes: input.notes,
    installmentPlanId: input.installmentPlanId ?? null,
    installmentNumber: input.installmentNumber ?? null,
  }
  assertFinancialEntryRealizationInvariants(entry)
  return entry
}

export interface UpdateFinancialEntryChanges {
  description?: string
  expectedAmount?: Money
  dueDate?: string | null
  notes?: string | null
  categoryId?: number
  responsibleMemberId?: number | null
}

/** Só permite editar movimentações "planned" ou "pending" — realized/cancelled exigem operações dedicadas. */
export function updateFinancialEntry(
  entry: FinancialEntry,
  changes: UpdateFinancialEntryChanges,
  context: FinancialEntryContext,
): FinancialEntry {
  assertPeriodAllowsEntryChanges(context.period)
  if (entry.status === 'realized' || entry.status === 'cancelled') {
    throw new InvalidStatusTransitionError(
      `Não é possível editar diretamente uma movimentação com status "${entry.status}". Use as operações de estorno/reativação.`,
    )
  }
  assertHouseholdConsistency(entry.householdId, context)
  if (changes.categoryId !== undefined) {
    assertCategoryUsable(context.category, entry.entryType)
  }
  if (changes.responsibleMemberId !== undefined) {
    assertMemberUsable(context.member)
  }
  if (changes.expectedAmount !== undefined) {
    assertPositiveMoney(changes.expectedAmount, 'expected_amount')
  }
  if (changes.dueDate) {
    assertValidDate(changes.dueDate, 'due_date')
  }

  const updated: FinancialEntry = { ...entry, ...changes }
  assertFinancialEntryRealizationInvariants(updated)
  return updated
}

/** planned → pending (fluxo normal de confirmação). */
export function markFinancialEntryAsPending(entry: FinancialEntry, period: MonthlyPeriod): FinancialEntry {
  assertPeriodAllowsEntryChanges(period)
  if (entry.status !== 'planned') {
    throw new InvalidStatusTransitionError(
      `Só é possível marcar como "pending" a partir de "planned". Status atual: "${entry.status}".`,
    )
  }
  const updated: FinancialEntry = { ...entry, status: 'pending' }
  assertFinancialEntryRealizationInvariants(updated)
  return updated
}

export interface RealizeFinancialEntryInput {
  actualAmount?: Money
  realizationDate?: string
}

/** planned|pending → realized. Exige actual_amount e realization_date. */
export function realizeFinancialEntry(
  entry: FinancialEntry,
  period: MonthlyPeriod,
  input: RealizeFinancialEntryInput,
): FinancialEntry {
  assertPeriodAllowsEntryChanges(period)
  if (entry.status !== 'planned' && entry.status !== 'pending') {
    throw new InvalidStatusTransitionError(
      `Só é possível realizar uma movimentação a partir de "planned" ou "pending". Status atual: "${entry.status}".`,
    )
  }
  if (input.actualAmount === undefined || input.actualAmount === null) {
    throw new MissingRealizationDataError('Para realizar uma movimentação, actual_amount é obrigatório.')
  }
  if (!input.realizationDate) {
    throw new MissingRealizationDataError('Para realizar uma movimentação, realization_date é obrigatório.')
  }
  assertPositiveMoney(input.actualAmount, 'actual_amount')
  assertValidDate(input.realizationDate, 'realization_date')

  const updated: FinancialEntry = {
    ...entry,
    status: 'realized',
    actualAmount: input.actualAmount,
    realizationDate: input.realizationDate,
  }
  assertFinancialEntryRealizationInvariants(updated)
  return updated
}

/** planned|pending → cancelled. "realized" não pode ser cancelada diretamente — estorne antes. */
export function cancelFinancialEntry(entry: FinancialEntry, period: MonthlyPeriod): FinancialEntry {
  assertPeriodAllowsEntryChanges(period)
  if (entry.status !== 'planned' && entry.status !== 'pending') {
    throw new InvalidStatusTransitionError(
      `Uma movimentação "${entry.status}" não pode ser cancelada diretamente. Status atual: "${entry.status}".`,
    )
  }
  const updated: FinancialEntry = { ...entry, status: 'cancelled', actualAmount: null, realizationDate: null }
  assertFinancialEntryRealizationInvariants(updated)
  return updated
}

/**
 * Valida se uma movimentação pode ser excluída (removida permanentemente,
 * não uma transição de status) — nunca transforma nem retorna a entidade,
 * apenas autoriza ou rejeita; quem chama é responsável por de fato remover
 * do repositório. Competência precisa estar aberta (mesma regra de
 * `cancelFinancialEntry`/`assertPeriodAllowsEntryChanges`, sem ajuste de
 * revisão). Diferente do cancelamento, `realized` TAMBÉM pode ser excluída
 * diretamente: um lançamento incorretamente marcado como realizado ainda
 * pode ter sido um erro de cadastro, e a competência aberta é justamente o
 * período em que corrigir esse tipo de engano é esperado — não faz sentido
 * obrigar um estorno prévio só para depois excluir. `cancelled` permanece
 * fora do conjunto elegível: um registro já cancelado tem "Reativar" como o
 * único caminho de volta (mesmo raciocínio de sempre passar por uma
 * operação nomeada explícita, nunca uma exclusão direta de um estado que já
 * é, em si, o resultado de uma ação destrutiva anterior).
 */
export function assertFinancialEntryDeletable(entry: FinancialEntry, period: MonthlyPeriod): void {
  assertPeriodAllowsEntryChanges(period)
  if (entry.status === 'cancelled') {
    throw new InvalidStatusTransitionError(
      `Uma movimentação "${entry.status}" não pode ser excluída diretamente. Status atual: "${entry.status}".`,
    )
  }
}

/** realized → pending (estorno explícito). Limpa actual_amount/realization_date. */
export function revertFinancialEntryRealization(entry: FinancialEntry, period: MonthlyPeriod): FinancialEntry {
  assertPeriodAllowsEntryChanges(period, { allowReviewAdjustment: true })
  if (entry.status !== 'realized') {
    throw new InvalidStatusTransitionError(`Estorno só é permitido a partir de "realized". Status atual: "${entry.status}".`)
  }
  const updated: FinancialEntry = { ...entry, status: 'pending', actualAmount: null, realizationDate: null }
  assertFinancialEntryRealizationInvariants(updated)
  return updated
}

/** pending → planned (correção explícita). */
export function correctFinancialEntryToPlanned(entry: FinancialEntry, period: MonthlyPeriod): FinancialEntry {
  assertPeriodAllowsEntryChanges(period, { allowReviewAdjustment: true })
  if (entry.status !== 'pending') {
    throw new InvalidStatusTransitionError(
      `Correção para "planned" só é permitida a partir de "pending". Status atual: "${entry.status}".`,
    )
  }
  const updated: FinancialEntry = { ...entry, status: 'planned' }
  assertFinancialEntryRealizationInvariants(updated)
  return updated
}

/** cancelled → planned (reativação explícita). */
export function reactivateFinancialEntry(entry: FinancialEntry, period: MonthlyPeriod): FinancialEntry {
  assertPeriodAllowsEntryChanges(period, { allowReviewAdjustment: true })
  if (entry.status !== 'cancelled') {
    throw new InvalidStatusTransitionError(
      `Reativação só é permitida a partir de "cancelled". Status atual: "${entry.status}".`,
    )
  }
  const updated: FinancialEntry = { ...entry, status: 'planned' }
  assertFinancialEntryRealizationInvariants(updated)
  return updated
}

/**
 * Documenta o mapa completo de transições permitidas — usado por testes para
 * garantir que toda transição proibida realmente lança erro. Não é usado
 * como fonte de decisão pelas funções acima (cada uma valida seu próprio
 * "from" explicitamente), para que operações como estorno/correção/reativação
 * continuem exigindo a chamada nomeada correta, não uma transição genérica.
 */
export const FINANCIAL_ENTRY_ALLOWED_TRANSITIONS: Record<FinancialEntryStatus, FinancialEntryStatus[]> = {
  planned: ['pending', 'realized', 'cancelled'],
  pending: ['realized', 'cancelled', 'planned'],
  realized: ['pending'],
  cancelled: ['planned'],
}
