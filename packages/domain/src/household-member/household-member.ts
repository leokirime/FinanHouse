export const HOUSEHOLD_MEMBER_ROLES = ['owner', 'member'] as const
export type HouseholdMemberRole = (typeof HOUSEHOLD_MEMBER_ROLES)[number]

export const HOUSEHOLD_MEMBER_STATUSES = ['active', 'inactive'] as const
export type HouseholdMemberStatus = (typeof HOUSEHOLD_MEMBER_STATUSES)[number]

export interface HouseholdMember {
  id: number
  householdId: number
  userId: number
  role: HouseholdMemberRole
  status: HouseholdMemberStatus
}
