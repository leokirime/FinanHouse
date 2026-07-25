import {
  calculateMonthlySummary,
  compareMonthlyPeriods,
  type MonthlySummary,
  type PeriodComparison,
} from '@finanhouse/domain'
import type { FinancialEntryRepository } from '../ports/financial-entry-repository.js'

export interface SummaryServiceDependencies {
  entries: FinancialEntryRepository
}

export class CalculateMonthlySummaryService {
  constructor(private readonly deps: SummaryServiceDependencies) {}

  async execute(periodId: number): Promise<MonthlySummary> {
    const entries = await this.deps.entries.findByPeriod(periodId)
    return calculateMonthlySummary(periodId, entries)
  }
}

export class CompareMonthlyPeriodsService {
  constructor(private readonly deps: SummaryServiceDependencies) {}

  async execute(previousPeriodId: number, currentPeriodId: number): Promise<PeriodComparison> {
    const [previousEntries, currentEntries] = await Promise.all([
      this.deps.entries.findByPeriod(previousPeriodId),
      this.deps.entries.findByPeriod(currentPeriodId),
    ])
    return compareMonthlyPeriods(
      { periodId: previousPeriodId, entries: previousEntries },
      { periodId: currentPeriodId, entries: currentEntries },
    )
  }
}
