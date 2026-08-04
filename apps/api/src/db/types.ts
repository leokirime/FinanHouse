import type { categories, categoryBudgets, financialEntries, householdMembers, households, monthlyPeriods, users } from './schema/index.js'

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Household = typeof households.$inferSelect
export type NewHousehold = typeof households.$inferInsert

export type HouseholdMember = typeof householdMembers.$inferSelect
export type NewHouseholdMember = typeof householdMembers.$inferInsert

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert

export type MonthlyPeriod = typeof monthlyPeriods.$inferSelect
export type NewMonthlyPeriod = typeof monthlyPeriods.$inferInsert

export type FinancialEntry = typeof financialEntries.$inferSelect
export type NewFinancialEntry = typeof financialEntries.$inferInsert

export type CategoryBudget = typeof categoryBudgets.$inferSelect
export type NewCategoryBudget = typeof categoryBudgets.$inferInsert
