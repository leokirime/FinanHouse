import type { HouseholdMember } from '@finanhouse/domain'

export interface HouseholdMemberRepository {
  findById(id: number): Promise<HouseholdMember | null>
  findByHousehold(householdId: number): Promise<HouseholdMember[]>
}
