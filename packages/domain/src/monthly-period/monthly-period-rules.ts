import type { FinancialEntry } from '../financial-entry/financial-entry.js'
import { assertFinancialEntryRealizationInvariants } from '../financial-entry/financial-entry-rules.js'
import { HouseholdMismatchError, InvalidDateError, InvalidPeriodTransitionError } from '../errors/domain-errors.js'
import type { MonthlyPeriod } from './monthly-period.js'

const REFERENCE_MONTH_PATTERN = /^\d{4}-\d{2}-01$/

/** reference_month deve representar sempre o primeiro dia de um mês (YYYY-MM-01). */
export function assertValidReferenceMonth(value: string): void {
  if (!REFERENCE_MONTH_PATTERN.test(value)) {
    throw new InvalidDateError(
      `reference_month deve representar o primeiro dia de um mês, no formato YYYY-MM-01. Recebido: "${value}".`,
    )
  }
  const month = Number(value.slice(5, 7))
  if (month < 1 || month > 12) {
    throw new InvalidDateError(`reference_month possui mês inválido: "${value}".`)
  }
}

export interface OpenMonthlyPeriodInput {
  id: number
  householdId: number
  referenceMonth: string
}

/** Cria uma nova competência mensal, sempre no status "open". */
export function openMonthlyPeriod(input: OpenMonthlyPeriodInput): MonthlyPeriod {
  assertValidReferenceMonth(input.referenceMonth)
  return {
    id: input.id,
    householdId: input.householdId,
    referenceMonth: input.referenceMonth,
    status: 'open',
    closedAt: null,
    closedByUserId: null,
  }
}

/** open → review. */
export function startMonthlyPeriodReview(period: MonthlyPeriod): MonthlyPeriod {
  if (period.status !== 'open') {
    throw new InvalidPeriodTransitionError(
      `Só é possível iniciar revisão a partir de "open". Status atual: "${period.status}".`,
    )
  }
  return { ...period, status: 'review' }
}

/** review → open. */
export function reopenMonthlyPeriodFromReview(period: MonthlyPeriod): MonthlyPeriod {
  if (period.status !== 'review') {
    throw new InvalidPeriodTransitionError(
      `Só é possível voltar para "open" a partir de "review". Status atual: "${period.status}".`,
    )
  }
  return { ...period, status: 'open' }
}

export interface CloseMonthlyPeriodInput {
  closedByUserId: number
  closedAt: string
}

/**
 * review → closed. Valida: competência está em "review"; toda movimentação
 * pertence a esta competência; toda movimentação respeita os invariantes de
 * realização (garantindo que os totais calculados a partir delas sejam
 * consistentes — ver `summaries/monthly-summary.ts`).
 */
export function closeMonthlyPeriod(
  period: MonthlyPeriod,
  entries: FinancialEntry[],
  input: CloseMonthlyPeriodInput,
): MonthlyPeriod {
  if (period.status !== 'review') {
    throw new InvalidPeriodTransitionError(`Fechamento só é permitido a partir de "review". Status atual: "${period.status}".`)
  }
  for (const entry of entries) {
    if (entry.periodId !== period.id) {
      throw new HouseholdMismatchError(
        `Movimentação ${entry.id} não pertence à competência ${period.id} e não pode ser considerada no fechamento.`,
      )
    }
    assertFinancialEntryRealizationInvariants(entry)
  }
  return { ...period, status: 'closed', closedAt: input.closedAt, closedByUserId: input.closedByUserId }
}

/** closed → review (reabertura explícita). */
export function reopenMonthlyPeriod(period: MonthlyPeriod): MonthlyPeriod {
  if (period.status !== 'closed') {
    throw new InvalidPeriodTransitionError(
      `Reabertura explícita só é permitida a partir de "closed". Status atual: "${period.status}".`,
    )
  }
  return { ...period, status: 'review', closedAt: null, closedByUserId: null }
}

export const MONTHLY_PERIOD_ALLOWED_TRANSITIONS: Record<MonthlyPeriod['status'], MonthlyPeriod['status'][]> = {
  open: ['review'],
  review: ['open', 'closed'],
  closed: ['review'],
}
