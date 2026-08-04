import type {
  CategoryBudgetRepository,
  CategoryRepository,
  FinancialEntryRepository,
  HouseholdMemberRepository,
  MonthlyPeriodRepository,
} from '../../../application/ports/index.js'
import { DrizzleCategoryBudgetRepository } from './drizzle-category-budget-repository.js'
import { DrizzleCategoryRepository } from './drizzle-category-repository.js'
import { DrizzleFinancialEntryRepository } from './drizzle-financial-entry-repository.js'
import { DrizzleHouseholdMemberRepository } from './drizzle-household-member-repository.js'
import { DrizzleMonthlyPeriodRepository } from './drizzle-monthly-period-repository.js'
import type { DrizzleDb } from './types.js'

export interface DrizzleRepositories {
  entries: FinancialEntryRepository
  periods: MonthlyPeriodRepository
  categories: CategoryRepository
  members: HouseholdMemberRepository
  budgets: CategoryBudgetRepository
}

/**
 * Fábrica explícita para produção/runtime — separada dos módulos puros
 * acima. Recebe uma instância de banco já criada (`drizzle(pool)`, ver
 * `apps/api/src/db/pool.ts`) ou uma transaction (`db.transaction(async (tx)
 * => createDrizzleRepositories(tx))`) e devolve exatamente as quatro portas
 * de repositório existentes no contrato do projeto — nada mais. Não abre
 * conexão, não é singleton: cabe a quem monta a aplicação decidir o ciclo de
 * vida da instância de banco.
 */
export function createDrizzleRepositories(db: DrizzleDb): DrizzleRepositories {
  return {
    entries: new DrizzleFinancialEntryRepository(db),
    periods: new DrizzleMonthlyPeriodRepository(db),
    categories: new DrizzleCategoryRepository(db),
    members: new DrizzleHouseholdMemberRepository(db),
    budgets: new DrizzleCategoryBudgetRepository(db),
  }
}
