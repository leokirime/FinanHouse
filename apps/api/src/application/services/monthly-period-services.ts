import {
  type CloseMonthlyPeriodInput,
  closeMonthlyPeriod,
  type MonthlyPeriod,
  type OpenMonthlyPeriodInput,
  openMonthlyPeriod,
  PeriodNotFoundError,
  reopenMonthlyPeriod,
  reopenMonthlyPeriodFromReview,
  startMonthlyPeriodReview,
} from '@finanhouse/domain'
import type { FinancialEntryRepository } from '../ports/financial-entry-repository.js'
import type { MonthlyPeriodRepository } from '../ports/monthly-period-repository.js'

export interface MonthlyPeriodServiceDependencies {
  periods: MonthlyPeriodRepository
  entries: FinancialEntryRepository
}

async function loadPeriod(deps: MonthlyPeriodServiceDependencies, id: number): Promise<MonthlyPeriod> {
  const period = await deps.periods.findById(id)
  if (!period) throw new PeriodNotFoundError(`Competência ${id} não encontrada.`)
  return period
}

export class OpenMonthlyPeriodService {
  constructor(private readonly deps: MonthlyPeriodServiceDependencies) {}

  async execute(input: Omit<OpenMonthlyPeriodInput, 'id'>): Promise<MonthlyPeriod> {
    const id = await this.deps.periods.nextId()
    const period = openMonthlyPeriod({ ...input, id })
    return this.deps.periods.save(period)
  }
}

export class StartMonthlyPeriodReviewService {
  constructor(private readonly deps: MonthlyPeriodServiceDependencies) {}

  async execute(id: number): Promise<MonthlyPeriod> {
    const period = await loadPeriod(this.deps, id)
    return this.deps.periods.save(startMonthlyPeriodReview(period))
  }
}

/** review → open (voltar para edição comum, sem fechar). */
export class ReopenMonthlyPeriodFromReviewService {
  constructor(private readonly deps: MonthlyPeriodServiceDependencies) {}

  async execute(id: number): Promise<MonthlyPeriod> {
    const period = await loadPeriod(this.deps, id)
    return this.deps.periods.save(reopenMonthlyPeriodFromReview(period))
  }
}

export class CloseMonthlyPeriodService {
  constructor(private readonly deps: MonthlyPeriodServiceDependencies) {}

  async execute(id: number, input: CloseMonthlyPeriodInput): Promise<MonthlyPeriod> {
    const period = await loadPeriod(this.deps, id)
    const entries = await this.deps.entries.findByPeriod(id)
    return this.deps.periods.save(closeMonthlyPeriod(period, entries, input))
  }
}

/** closed → review (reabertura explícita de uma competência já fechada). */
export class ReopenMonthlyPeriodService {
  constructor(private readonly deps: MonthlyPeriodServiceDependencies) {}

  async execute(id: number): Promise<MonthlyPeriod> {
    const period = await loadPeriod(this.deps, id)
    return this.deps.periods.save(reopenMonthlyPeriod(period))
  }
}
