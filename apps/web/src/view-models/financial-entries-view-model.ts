import type { Category, FinancialEntry, FinancialEntryStatus, FinancialEntryType } from '@finanhouse/domain'
import { formatDatePtBrShort } from '../utils/format-date-pt-br.ts'
import { formatMoneyPtBr } from '../utils/format-money-pt-br.ts'

export type EntryTypeFilter = 'all' | FinancialEntryType
export type EntryStatusFilter = 'all' | FinancialEntryStatus
export type EntryCategoryFilter = 'all' | number

export interface FinancialEntriesFilters {
  type: EntryTypeFilter
  status: EntryStatusFilter
  categoryId: EntryCategoryFilter
  search: string
}

export const DEFAULT_FINANCIAL_ENTRIES_FILTERS: FinancialEntriesFilters = {
  type: 'all',
  status: 'all',
  categoryId: 'all',
  search: '',
}

export const ENTRY_STATUS_LABELS: Record<FinancialEntryStatus, string> = {
  planned: 'Planejado',
  pending: 'Pendente',
  realized: 'Realizado',
  cancelled: 'Cancelado',
}

export interface FinancialEntryRowViewModel {
  id: number
  description: string
  categoryId: number
  categoryName: string
  entryType: FinancialEntryType
  status: FinancialEntryStatus
  statusLabel: string
  expectedAmountLabel: string
  actualAmountLabel: string | null
  dueDateLabel: string | null
  realizationDateLabel: string | null
  responsibleLabel: string | null
  /** planned|pending */
  canEdit: boolean
  /** planned → pending */
  canMarkPending: boolean
  /** planned|pending → realized */
  canRealize: boolean
  /** planned|pending|realized (não cancelled) — exclusão real e permanente (Bloco 20; ajustada para também alcançar `realized` após revisão do usuário — competência aberta é responsabilidade do backend) */
  canDelete: boolean
  /** cancelled → planned */
  canReactivate: boolean
  /** realized → pending (estorno) */
  canRevertRealization: boolean
  /** Motivo pelo qual a movimentação não pode ser editada, para exibir na UI (null quando `canEdit` é `true`). */
  editBlockedReason: string | null
  /**
   * Rótulo visual "Parcela N/Total" (ou só "Parcela N" quando o total do
   * plano não está disponível) — `null` para lançamento avulso
   * (`installmentPlanId`/`installmentNumber` ambos `null`). Puramente
   * decorativo: nunca persiste, nunca é inferido a partir da descrição, e o
   * total nunca é recalculado aqui — vem exclusivamente de
   * `InstallmentPlan.installmentCount` via `installmentCountsByPlanId`
   * (Sessão 12, Bloco 06).
   */
  installmentLabel: string | null
}

function categoryName(categories: Category[], categoryId: number): string {
  return categories.find((category) => category.id === categoryId)?.name ?? 'Sem categoria'
}

function editBlockedReason(entry: FinancialEntry): string | null {
  if (entry.status === 'realized') return 'Movimentações realizadas não podem ser editadas diretamente — estorne antes.'
  if (entry.status === 'cancelled') return 'Movimentações canceladas não podem ser editadas — reative antes.'
  return null
}

/** `installmentPlanId → installmentCount` — metadado exclusivamente visual (nunca usado em cálculo), tipicamente de `useInstallmentPlans().plans`. */
export type InstallmentCountsByPlanId = ReadonlyMap<number, number>

function installmentLabel(entry: FinancialEntry, installmentCountsByPlanId?: InstallmentCountsByPlanId): string | null {
  if (entry.installmentPlanId === null || entry.installmentNumber === null) return null
  const total = installmentCountsByPlanId?.get(entry.installmentPlanId)
  return total !== undefined ? `Parcela ${entry.installmentNumber}/${total}` : `Parcela ${entry.installmentNumber}`
}

export function buildFinancialEntryRow(
  entry: FinancialEntry,
  categories: Category[],
  installmentCountsByPlanId?: InstallmentCountsByPlanId,
): FinancialEntryRowViewModel {
  const editable = entry.status === 'planned' || entry.status === 'pending'
  return {
    id: entry.id,
    description: entry.description,
    categoryId: entry.categoryId,
    categoryName: categoryName(categories, entry.categoryId),
    entryType: entry.entryType,
    status: entry.status,
    statusLabel: ENTRY_STATUS_LABELS[entry.status],
    expectedAmountLabel: formatMoneyPtBr(entry.expectedAmount),
    actualAmountLabel: entry.actualAmount !== null ? formatMoneyPtBr(entry.actualAmount) : null,
    dueDateLabel: entry.dueDate ? formatDatePtBrShort(entry.dueDate) : null,
    realizationDateLabel: entry.realizationDate ? formatDatePtBrShort(entry.realizationDate) : null,
    responsibleLabel: entry.responsibleMemberId !== null ? `Membro #${entry.responsibleMemberId}` : null,
    canEdit: editable,
    canMarkPending: entry.status === 'planned',
    canRealize: entry.status === 'planned' || entry.status === 'pending',
    canDelete: entry.status !== 'cancelled',
    canReactivate: entry.status === 'cancelled',
    canRevertRealization: entry.status === 'realized',
    editBlockedReason: editBlockedReason(entry),
    installmentLabel: installmentLabel(entry, installmentCountsByPlanId),
  }
}

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

export function filterFinancialEntries(
  entries: FinancialEntry[],
  categories: Category[],
  currentPeriodId: number,
  filters: FinancialEntriesFilters,
): FinancialEntry[] {
  const search = normalize(filters.search)

  return entries.filter((entry) => {
    if (entry.periodId !== currentPeriodId) return false
    if (filters.type !== 'all' && entry.entryType !== filters.type) return false
    if (filters.status !== 'all' && entry.status !== filters.status) return false
    if (filters.categoryId !== 'all' && entry.categoryId !== filters.categoryId) return false
    if (search) {
      const category = categories.find((candidate) => candidate.id === entry.categoryId)
      const haystack = normalize(`${entry.description} ${category?.name ?? ''}`)
      if (!haystack.includes(search)) return false
    }
    return true
  })
}
