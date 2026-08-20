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
    // `id: 0` é um placeholder descartado — `openMonthlyPeriod` exige `id` no input (nunca usado em
    // validação, só copiado para a entidade retornada); o `id` real vem de `periods.create()`,
    // gerado pelo AUTO_INCREMENT nativo do banco (DT-15), nunca calculado aqui. Uma colisão
    // concorrente na mesma competência (household_id + reference_month) continua protegida pelo
    // índice único da tabela — falha como DuplicateRecordError (409), nunca como sobrescrita
    // silenciosa; nenhuma lógica de nova leitura/retry foi adicionada (ver DT-17).
    const { id: _placeholder, ...draft } = openMonthlyPeriod({ ...input, id: 0 })
    return this.deps.periods.create(draft)
  }
}

export class StartMonthlyPeriodReviewService {
  constructor(private readonly deps: MonthlyPeriodServiceDependencies) {}

  async execute(id: number): Promise<MonthlyPeriod> {
    const period = await loadPeriod(this.deps, id)
    return this.deps.periods.update(startMonthlyPeriodReview(period))
  }
}

/** review → open (voltar para edição comum, sem fechar). */
export class ReopenMonthlyPeriodFromReviewService {
  constructor(private readonly deps: MonthlyPeriodServiceDependencies) {}

  async execute(id: number): Promise<MonthlyPeriod> {
    const period = await loadPeriod(this.deps, id)
    return this.deps.periods.update(reopenMonthlyPeriodFromReview(period))
  }
}

export class CloseMonthlyPeriodService {
  constructor(private readonly deps: MonthlyPeriodServiceDependencies) {}

  async execute(id: number, input: CloseMonthlyPeriodInput): Promise<MonthlyPeriod> {
    const period = await loadPeriod(this.deps, id)
    const entries = await this.deps.entries.findByPeriod(id)
    return this.deps.periods.update(closeMonthlyPeriod(period, entries, input))
  }
}

/** closed → review (reabertura explícita de uma competência já fechada). */
export class ReopenMonthlyPeriodService {
  constructor(private readonly deps: MonthlyPeriodServiceDependencies) {}

  async execute(id: number): Promise<MonthlyPeriod> {
    const period = await loadPeriod(this.deps, id)
    return this.deps.periods.update(reopenMonthlyPeriod(period))
  }
}
