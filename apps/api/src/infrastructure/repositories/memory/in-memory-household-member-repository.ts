import type { HouseholdMember } from '@finanhouse/domain'
import type { HouseholdMemberRepository } from '../../../application/ports/household-member-repository.js'

export class InMemoryHouseholdMemberRepository implements HouseholdMemberRepository {
  private members = new Map<number, HouseholdMember>()

  async findById(id: number): Promise<HouseholdMember | null> {
    return this.members.get(id) ?? null
  }

  async findByHousehold(householdId: number): Promise<HouseholdMember[]> {
    return [...this.members.values()].filter((member) => member.householdId === householdId)
  }

  async findByUserId(userId: number): Promise<HouseholdMember[]> {
    return [...this.members.values()].filter((member) => member.userId === userId)
  }

  /** Popula o repositório para testes/desenvolvimento — não faz parte da interface do domínio. */
  seed(members: HouseholdMember[]): void {
    for (const member of members) this.members.set(member.id, member)
  }

  reset(): void {
    this.members.clear()
  }
}
