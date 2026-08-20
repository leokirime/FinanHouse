import { InvalidInstallmentPlanError } from '../errors/domain-errors.js'
import { assertPositiveMoney, splitMoney, type Money } from '../money/money.js'
import { assertValidReferenceMonth } from '../monthly-period/monthly-period-rules.js'
import type { GeneratedInstallment, InstallmentPlan } from './installment-plan.js'

const MIN_INSTALLMENT_COUNT = 2
const MIN_DUE_DAY = 1
const MAX_DUE_DAY = 31

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function referenceMonthParts(referenceMonth: string): { year: number; month: number } {
  return { year: Number(referenceMonth.slice(0, 4)), month: Number(referenceMonth.slice(5, 7)) }
}

/** Último dia de calendário real do mês (fevereiro/bissexto incluído) — `month` 1–12. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function assertValidDueDay(dueDay: number): void {
  if (!Number.isInteger(dueDay) || dueDay < MIN_DUE_DAY || dueDay > MAX_DUE_DAY) {
    throw new InvalidInstallmentPlanError(`due_day deve ser um número inteiro entre ${MIN_DUE_DAY} e ${MAX_DUE_DAY}. Recebido: ${dueDay}.`)
  }
}

/**
 * Avança `referenceMonth` em `months` meses, por aritmética de ano/mês —
 * nunca somando uma quantidade fixa de dias (que quebraria em meses de
 * tamanhos diferentes). Usada para gerar as competências sucessivas de um
 * plano de parcelamento. Ex.: `addMonthsToReferenceMonth('2026-08-01', 5)`
 * → `'2027-01-01'` (dezembro → janeiro, virada de ano).
 */
export function addMonthsToReferenceMonth(referenceMonth: string, months: number): string {
  assertValidReferenceMonth(referenceMonth)
  if (!Number.isInteger(months)) {
    throw new InvalidInstallmentPlanError(`months deve ser um número inteiro. Recebido: ${months}.`)
  }
  const { year, month } = referenceMonthParts(referenceMonth)
  const zeroBasedTotal = month - 1 + months
  const yearOffset = Math.floor(zeroBasedTotal / 12)
  const newMonth = ((zeroBasedTotal % 12) + 12) % 12
  return `${year + yearOffset}-${pad2(newMonth + 1)}-01`
}

/**
 * Resolve a data de vencimento real de uma parcela: `min(dueDay, último dia
 * válido do mês daquela competência)` — nunca produz uma data de calendário
 * inválida (ex.: "31 de abril" vira "30 de abril"; fevereiro respeita ano
 * bissexto).
 */
export function resolveInstallmentDueDate(referenceMonth: string, dueDay: number): string {
  assertValidReferenceMonth(referenceMonth)
  assertValidDueDay(dueDay)
  const { year, month } = referenceMonthParts(referenceMonth)
  const day = Math.min(dueDay, lastDayOfMonth(year, month))
  return `${year}-${pad2(month)}-${pad2(day)}`
}

export interface CreateInstallmentPlanInput {
  id: number
  householdId: number
  description: string
  categoryId: number
  totalAmount: Money
  installmentCount: number
  firstReferenceMonth: string
  /** Obrigatório (1–31) — todo parcelamento neste MVP tem vencimento definido. */
  dueDay: number
  createdByUserId: number
  /** ISO 8601 — quem chama fornece (ex.: `new Date().toISOString()` na camada de aplicação, Bloco 04); nunca gerado dentro do domínio. Ver `InstallmentPlan.createdAt`. */
  createdAt: string
}

/**
 * Cria um novo `InstallmentPlan` — valida os invariantes de entrada
 * (Sessão 12, Bloco 01/02): `installmentCount >= 2` (um parcelamento de 1x
 * não é parcelamento — usa o fluxo de lançamento avulso já existente),
 * `totalAmount > 0`, `dueDay` obrigatório entre 1 e 31, e
 * `firstReferenceMonth` num formato de competência válido. Nunca persiste
 * nada — quem chama é responsável por gravar o plano retornado.
 */
export function createInstallmentPlan(input: CreateInstallmentPlanInput): InstallmentPlan {
  if (!Number.isInteger(input.installmentCount) || input.installmentCount < MIN_INSTALLMENT_COUNT) {
    throw new InvalidInstallmentPlanError(
      `installment_count deve ser um número inteiro maior ou igual a ${MIN_INSTALLMENT_COUNT}. Recebido: ${input.installmentCount}.`,
    )
  }
  assertPositiveMoney(input.totalAmount, 'total_amount')
  assertValidReferenceMonth(input.firstReferenceMonth)
  assertValidDueDay(input.dueDay)

  return {
    id: input.id,
    householdId: input.householdId,
    description: input.description,
    categoryId: input.categoryId,
    totalAmount: input.totalAmount,
    installmentCount: input.installmentCount,
    firstReferenceMonth: input.firstReferenceMonth,
    dueDay: input.dueDay,
    createdByUserId: input.createdByUserId,
    createdAt: input.createdAt,
  }
}

/**
 * Gera as `installmentCount` parcelas conceituais de um plano — nunca
 * persiste nada (ver `GeneratedInstallment`). Garante, por construção, os
 * invariantes de geração: exatamente N parcelas, numeradas `1..N` sem
 * lacuna, soma dos valores igual a `totalAmount` (via `splitMoney`),
 * competências avançando exatamente um mês por parcela, datas de vencimento
 * sempre válidas, mesmo `householdId`/`installmentPlanId` em todas, status
 * inicial `planned` — cada parcela é um objeto independente, sem nenhuma
 * referência compartilhada que permita uma alteração posterior numa parcela
 * afetar as demais.
 */
export function generateInstallments(plan: InstallmentPlan): GeneratedInstallment[] {
  const amounts = splitMoney(plan.totalAmount, plan.installmentCount)

  const installments: GeneratedInstallment[] = []
  for (let index = 0; index < plan.installmentCount; index++) {
    const referenceMonth = addMonthsToReferenceMonth(plan.firstReferenceMonth, index)
    installments.push({
      installmentPlanId: plan.id,
      installmentNumber: index + 1,
      householdId: plan.householdId,
      categoryId: plan.categoryId,
      description: plan.description,
      entryType: 'expense',
      expectedAmount: amounts[index]!,
      referenceMonth,
      dueDate: resolveInstallmentDueDate(referenceMonth, plan.dueDay),
      status: 'planned',
      createdByUserId: plan.createdByUserId,
    })
  }
  return installments
}
