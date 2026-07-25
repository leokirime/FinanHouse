import { relations } from 'drizzle-orm'
import { categories } from './schema/categories.js'
import { financialEntries } from './schema/financial-entries.js'
import { householdMembers } from './schema/household-members.js'
import { households } from './schema/households.js'
import { monthlyPeriods } from './schema/monthly-periods.js'
import { users } from './schema/users.js'

export const usersRelations = relations(users, ({ many }) => ({
  createdHouseholds: many(households),
  memberships: many(householdMembers),
}))

export const householdsRelations = relations(households, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [households.createdByUserId],
    references: [users.id],
  }),
  members: many(householdMembers),
  categories: many(categories),
  monthlyPeriods: many(monthlyPeriods),
  financialEntries: many(financialEntries),
}))

export const householdMembersRelations = relations(householdMembers, ({ one, many }) => ({
  household: one(households, {
    fields: [householdMembers.householdId],
    references: [households.id],
  }),
  user: one(users, {
    fields: [householdMembers.userId],
    references: [users.id],
  }),
  responsibleForEntries: many(financialEntries),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  household: one(households, {
    fields: [categories.householdId],
    references: [households.id],
  }),
  financialEntries: many(financialEntries),
}))

export const monthlyPeriodsRelations = relations(monthlyPeriods, ({ one, many }) => ({
  household: one(households, {
    fields: [monthlyPeriods.householdId],
    references: [households.id],
  }),
  closedBy: one(users, {
    fields: [monthlyPeriods.closedByUserId],
    references: [users.id],
  }),
  financialEntries: many(financialEntries),
}))

export const financialEntriesRelations = relations(financialEntries, ({ one }) => ({
  household: one(households, {
    fields: [financialEntries.householdId],
    references: [households.id],
  }),
  period: one(monthlyPeriods, {
    fields: [financialEntries.periodId],
    references: [monthlyPeriods.id],
  }),
  category: one(categories, {
    fields: [financialEntries.categoryId],
    references: [categories.id],
  }),
  responsibleMember: one(householdMembers, {
    fields: [financialEntries.responsibleMemberId],
    references: [householdMembers.id],
  }),
  createdBy: one(users, {
    fields: [financialEntries.createdByUserId],
    references: [users.id],
  }),
}))
