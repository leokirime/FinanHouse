import {
  FIXTURE_CURRENT_PERIOD_ID,
  FIXTURE_HOUSEHOLD_ID,
  FIXTURE_PREVIOUS_PERIOD_ID,
  fixtureCategories,
  fixtureCategoryBudgets,
  fixtureFinancialEntries,
  fixtureHouseholdMembers,
  fixtureMonthlyPeriods,
} from '../data/dashboard-fixtures.ts'
import type { FinanceDemoState } from './finance-demo-types.ts'

/**
 * Constrói o estado inicial do modo demonstrativo a partir das fixtures do
 * Bloco 06 — chamado uma única vez, na inicialização do `FinanceDemoProvider`
 * (e sempre que ele é remontado, ex.: recarregar a página). Uma cópia nova é
 * criada a cada chamada para que o array de fixtures original nunca seja
 * mutado pelo reducer.
 */
export function createInitialFinanceDemoState(): FinanceDemoState {
  const maxEntryId = fixtureFinancialEntries.reduce((max, entry) => Math.max(max, entry.id), 0)
  const maxBudgetId = fixtureCategoryBudgets.reduce((max, budget) => Math.max(max, budget.id), 0)
  return {
    householdId: FIXTURE_HOUSEHOLD_ID,
    categories: [...fixtureCategories],
    members: [...fixtureHouseholdMembers],
    periods: [...fixtureMonthlyPeriods],
    entries: [...fixtureFinancialEntries],
    categoryBudgets: [...fixtureCategoryBudgets],
    currentPeriodId: FIXTURE_CURRENT_PERIOD_ID,
    previousPeriodId: FIXTURE_PREVIOUS_PERIOD_ID,
    nextEntryId: maxEntryId + 1,
    nextBudgetId: maxBudgetId + 1,
    actionError: null,
    lastActionMessage: null,
  }
}
