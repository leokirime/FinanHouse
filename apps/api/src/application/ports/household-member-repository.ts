import type { HouseholdMember } from '@finanhouse/domain'

export interface HouseholdMemberRepository {
  findById(id: number): Promise<HouseholdMember | null>
  findByHousehold(householdId: number): Promise<HouseholdMember[]>
  /** Memberships de um usuário em qualquer household — usado no login para resolver o household autorizado (Bloco 19, DT-14). */
  findByUserId(userId: number): Promise<HouseholdMember[]>
}
