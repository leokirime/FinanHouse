import { splitMoney, type Category, type FinancialEntry, type FinancialEntryStatus, type InstallmentPlan, type Money } from '@finanhouse/domain'
import { formatDatePtBrShort, parseIsoDate } from '../utils/format-date-pt-br.ts'
import { formatMoneyPtBr } from '../utils/format-money-pt-br.ts'
import { ENTRY_STATUS_LABELS } from './financial-entries-view-model.ts'

/** Invariante formal do domínio (`installment-rules.ts`) — nenhum máximo arbitrário é reproduzido aqui (correção da Sessão 12, revisão pré-merge do Bloco 04: um teto de 60 chegou a existir só no schema HTTP, sem requisito formal, e foi removido). */
export const INSTALLMENT_COUNT_MIN = 2

const monthYearFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1)
}

/** "2026-08-01" → "Agosto de 2026". */
export function formatReferenceMonthLabel(referenceMonth: string): string {
  return capitalize(monthYearFormatter.format(parseIsoDate(referenceMonth)))
}

/** Valor de `<input type="month">` ("2026-08") → competência civil do domínio ("2026-08-01"). */
export function monthInputValueToReferenceMonth(monthInputValue: string): string {
  return `${monthInputValue}-01`
}

/** Competência civil do domínio ("2026-08-01") → valor de `<input type="month">` ("2026-08"). */
export function referenceMonthToMonthInputValue(referenceMonth: string): string {
  return referenceMonth.slice(0, 7)
}

export interface InstallmentPreview {
  perInstallmentLabel: string
  totalLabel: string
}

/**
 * Prévia visual da divisão — reutiliza `splitMoney` (mesmo algoritmo
 * determinístico do domínio/backend), então é numericamente idêntica ao que
 * a API vai persistir. Ainda assim, é só decorativa: nunca usada para montar
 * o corpo do `POST` (que sempre envia `totalAmount`/`installmentCount`
 * brutos) — a resposta real da API continua sendo a única fonte de verdade
 * (Sessão 12, Bloco 05, seção 17 do prompt).
 */
export function buildInstallmentPreview(totalAmount: Money, installmentCount: number): InstallmentPreview | null {
  if (!Number.isInteger(installmentCount) || installmentCount < INSTALLMENT_COUNT_MIN) return null
  const parts = splitMoney(totalAmount, installmentCount)
  const first = parts[0]
  if (first === undefined) return null
  return { perInstallmentLabel: formatMoneyPtBr(first), totalLabel: formatMoneyPtBr(totalAmount) }
}

export interface InstallmentPlanProgress {
  realizedCount: number
  totalCount: number
  label: string
  /** Derivado — nunca persistido (seção 2/9 do ajuste pós-validação visual do Bloco 06: "concluído" nunca é um status gravado em `installment_plans`). `true` somente quando TODAS as `installmentCount` parcelas foram realizadas; uma parcela ausente/cancelada/excluída nunca é tratada como equivalente a realizada. */
  isCompleted: boolean
}

/**
 * Progresso derivado das `FinancialEntry` relacionadas — nunca um campo
 * persistido separadamente no plano (seção 9 do prompt do Bloco 05).
 * `totalCount` vem sempre de `plan.installmentCount` (autoritativo, do
 * próprio plano) — nunca da contagem de parcelas já carregadas, que podem
 * ainda não refletir uma criação recém-concluída nesta mesma sessão.
 */
export function buildInstallmentPlanProgress(plan: InstallmentPlan, entries: FinancialEntry[]): InstallmentPlanProgress {
  const realizedCount = entries.filter((entry) => entry.installmentPlanId === plan.id && entry.status === 'realized').length
  return {
    realizedCount,
    totalCount: plan.installmentCount,
    label: `${realizedCount} de ${plan.installmentCount} parcelas realizadas`,
    isCompleted: realizedCount === plan.installmentCount,
  }
}

export type InstallmentPlanStatusFilter = 'active' | 'completed' | 'all'

export const DEFAULT_INSTALLMENT_PLAN_STATUS_FILTER: InstallmentPlanStatusFilter = 'active'

export const INSTALLMENT_PLAN_STATUS_FILTER_LABELS: Record<InstallmentPlanStatusFilter, string> = {
  active: 'Em andamento',
  completed: 'Concluídos',
  all: 'Todos',
}

/**
 * Regra única de "em andamento vs. concluído" — centralizada aqui para não
 * ser reimplementada em cada componente (seção 5 do ajuste pós-validação
 * visual do Bloco 06). Nunca exclui plano/parcela nem altera cálculo
 * financeiro — apenas decide o que aparece na visão padrão de Parcelamentos.
 */
export function filterInstallmentPlansByStatus(
  plans: InstallmentPlan[],
  entries: FinancialEntry[],
  filter: InstallmentPlanStatusFilter,
): InstallmentPlan[] {
  if (filter === 'all') return plans
  return plans.filter((plan) => buildInstallmentPlanProgress(plan, entries).isCompleted === (filter === 'completed'))
}

export interface InstallmentPlanRowViewModel {
  id: number
  description: string
  categoryName: string
  totalAmountLabel: string
  installmentCount: number
  approxInstallmentLabel: string
  firstReferenceMonthLabel: string
  dueDay: number
  progress: InstallmentPlanProgress
}

export function buildInstallmentPlanRow(plan: InstallmentPlan, categories: Category[], entries: FinancialEntry[]): InstallmentPlanRowViewModel {
  const preview = buildInstallmentPreview(plan.totalAmount, plan.installmentCount)
  return {
    id: plan.id,
    description: plan.description,
    categoryName: categories.find((category) => category.id === plan.categoryId)?.name ?? 'Sem categoria',
    totalAmountLabel: formatMoneyPtBr(plan.totalAmount),
    installmentCount: plan.installmentCount,
    approxInstallmentLabel: preview ? `${preview.perInstallmentLabel} (aprox.)` : '—',
    firstReferenceMonthLabel: formatReferenceMonthLabel(plan.firstReferenceMonth),
    dueDay: plan.dueDay,
    progress: buildInstallmentPlanProgress(plan, entries),
  }
}

export function buildInstallmentPlanRows(plans: InstallmentPlan[], categories: Category[], entries: FinancialEntry[]): InstallmentPlanRowViewModel[] {
  return [...plans].sort((a, b) => b.id - a.id).map((plan) => buildInstallmentPlanRow(plan, categories, entries))
}

export interface InstallmentRowViewModel {
  id: number
  installmentNumber: number | null
  totalCount: number
  amountLabel: string
  dueDateLabel: string | null
  status: FinancialEntryStatus
  statusLabel: string
  /** planned|pending → realized — mesma regra de `financial-entries-view-model.ts` (`canRealize`), nunca reimplementada como transição paralela (ajuste pós-validação visual: integração Parcelamentos ↔ Lançamentos). */
  canRealize: boolean
}

/** Parcelas de UM plano, ordenadas por número — mesma semântica de status de qualquer `FinancialEntry` (seção 10 do prompt: "não criar semântica diferente"). */
export function buildInstallmentRows(plan: InstallmentPlan, installments: FinancialEntry[]): InstallmentRowViewModel[] {
  return [...installments]
    .sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0))
    .map((entry) => ({
      id: entry.id,
      installmentNumber: entry.installmentNumber,
      canRealize: entry.status === 'planned' || entry.status === 'pending',
      totalCount: plan.installmentCount,
      amountLabel: formatMoneyPtBr(entry.expectedAmount),
      dueDateLabel: entry.dueDate ? formatDatePtBrShort(entry.dueDate) : null,
      status: entry.status,
      statusLabel: ENTRY_STATUS_LABELS[entry.status],
    }))
}
