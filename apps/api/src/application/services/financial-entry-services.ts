import {
  CategoryNotFoundError,
  type CreateFinancialEntryInput,
  type FinancialEntry,
  type FinancialEntryContext,
  FinancialEntryNotFoundError,
  HouseholdMemberNotFoundError,
  PeriodNotFoundError,
  type RealizeFinancialEntryInput,
  type UpdateFinancialEntryChanges,
  cancelFinancialEntry,
  correctFinancialEntryToPlanned,
  createFinancialEntry,
  markFinancialEntryAsPending,
  reactivateFinancialEntry,
  realizeFinancialEntry,
  revertFinancialEntryRealization,
  updateFinancialEntry,
} from '@finanhouse/domain'
import type { CategoryRepository } from '../ports/category-repository.js'
import type { FinancialEntryRepository } from '../ports/financial-entry-repository.js'
import type { HouseholdMemberRepository } from '../ports/household-member-repository.js'
import type { MonthlyPeriodRepository } from '../ports/monthly-period-repository.js'

/** Dependências comuns a todos os serviços de movimentação — injetadas por interface. */
export interface FinancialEntryServiceDependencies {
  entries: FinancialEntryRepository
  periods: MonthlyPeriodRepository
  categories: CategoryRepository
  members: HouseholdMemberRepository
}

async function loadContext(
  deps: FinancialEntryServiceDependencies,
  periodId: number,
  categoryId: number,
  memberId: number | null,
): Promise<FinancialEntryContext> {
  const period = await deps.periods.findById(periodId)
  if (!period) throw new PeriodNotFoundError(`Competência ${periodId} não encontrada.`)

  const category = await deps.categories.findById(categoryId)
  if (!category) throw new CategoryNotFoundError(`Categoria ${categoryId} não encontrada.`)

  const member = memberId === null ? null : await deps.members.findById(memberId)
  if (memberId !== null && !member) {
    throw new HouseholdMemberNotFoundError(`Membro responsável ${memberId} não encontrado.`)
  }

  return { period, category, member }
}

async function loadEntry(deps: FinancialEntryServiceDependencies, id: number): Promise<FinancialEntry> {
  const entry = await deps.entries.findById(id)
  if (!entry) throw new FinancialEntryNotFoundError(`Movimentação ${id} não encontrada.`)
  return entry
}

export class CreateFinancialEntryService {
  constructor(private readonly deps: FinancialEntryServiceDependencies) {}

  async execute(input: Omit<CreateFinancialEntryInput, 'id'>): Promise<FinancialEntry> {
    const context = await loadContext(this.deps, input.periodId, input.categoryId, input.responsibleMemberId)
    const id = await this.deps.entries.nextId()
    const entry = createFinancialEntry({ ...input, id }, context)
    return this.deps.entries.save(entry)
  }
}

export class UpdateFinancialEntryService {
  constructor(private readonly deps: FinancialEntryServiceDependencies) {}

  async execute(id: number, changes: UpdateFinancialEntryChanges): Promise<FinancialEntry> {
    const entry = await loadEntry(this.deps, id)
    const context = await loadContext(
      this.deps,
      entry.periodId,
      changes.categoryId ?? entry.categoryId,
      changes.responsibleMemberId !== undefined ? changes.responsibleMemberId : entry.responsibleMemberId,
    )
    const updated = updateFinancialEntry(entry, changes, context)
    return this.deps.entries.save(updated)
  }
}

export class MarkFinancialEntryAsPendingService {
  constructor(private readonly deps: FinancialEntryServiceDependencies) {}

  async execute(id: number): Promise<FinancialEntry> {
    const entry = await loadEntry(this.deps, id)
    const period = await this.deps.periods.findById(entry.periodId)
    if (!period) throw new PeriodNotFoundError(`Competência ${entry.periodId} não encontrada.`)
    return this.deps.entries.save(markFinancialEntryAsPending(entry, period))
  }
}

export class RealizeFinancialEntryService {
  constructor(private readonly deps: FinancialEntryServiceDependencies) {}

  async execute(id: number, input: RealizeFinancialEntryInput): Promise<FinancialEntry> {
    const entry = await loadEntry(this.deps, id)
    const period = await this.deps.periods.findById(entry.periodId)
    if (!period) throw new PeriodNotFoundError(`Competência ${entry.periodId} não encontrada.`)
    return this.deps.entries.save(realizeFinancialEntry(entry, period, input))
  }
}

export class CancelFinancialEntryService {
  constructor(private readonly deps: FinancialEntryServiceDependencies) {}

  async execute(id: number): Promise<FinancialEntry> {
    const entry = await loadEntry(this.deps, id)
    const period = await this.deps.periods.findById(entry.periodId)
    if (!period) throw new PeriodNotFoundError(`Competência ${entry.periodId} não encontrada.`)
    return this.deps.entries.save(cancelFinancialEntry(entry, period))
  }
}

/** Estorno explícito: realized → pending. */
export class RevertFinancialEntryRealizationService {
  constructor(private readonly deps: FinancialEntryServiceDependencies) {}

  async execute(id: number): Promise<FinancialEntry> {
    const entry = await loadEntry(this.deps, id)
    const period = await this.deps.periods.findById(entry.periodId)
    if (!period) throw new PeriodNotFoundError(`Competência ${entry.periodId} não encontrada.`)
    return this.deps.entries.save(revertFinancialEntryRealization(entry, period))
  }
}

/** Correção explícita: pending → planned. */
export class CorrectFinancialEntryToPlannedService {
  constructor(private readonly deps: FinancialEntryServiceDependencies) {}

  async execute(id: number): Promise<FinancialEntry> {
    const entry = await loadEntry(this.deps, id)
    const period = await this.deps.periods.findById(entry.periodId)
    if (!period) throw new PeriodNotFoundError(`Competência ${entry.periodId} não encontrada.`)
    return this.deps.entries.save(correctFinancialEntryToPlanned(entry, period))
  }
}

/** Reativação explícita: cancelled → planned. */
export class ReopenFinancialEntryService {
  constructor(private readonly deps: FinancialEntryServiceDependencies) {}

  async execute(id: number): Promise<FinancialEntry> {
    const entry = await loadEntry(this.deps, id)
    const period = await this.deps.periods.findById(entry.periodId)
    if (!period) throw new PeriodNotFoundError(`Competência ${entry.periodId} não encontrada.`)
    return this.deps.entries.save(reactivateFinancialEntry(entry, period))
  }
}
