import type { HouseholdMember } from '@finanhouse/domain'

export interface HouseholdMemberDto {
  id: number
  householdId: number
  userId: number
  role: string
  status: string
}

export function toHouseholdMemberDto(member: HouseholdMember): HouseholdMemberDto {
  return {
    id: member.id,
    householdId: member.householdId,
    userId: member.userId,
    role: member.role,
    status: member.status,
  }
}
