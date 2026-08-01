import { HOUSEHOLD_MEMBER_ROLES, HOUSEHOLD_MEMBER_STATUSES, type HouseholdMember } from '@finanhouse/domain'
import type { HouseholdMember as HouseholdMemberRow } from '../../../../db/types.js'
import { assertKnownValue } from './enum-guard.js'

/** Somente leitura: a porta `HouseholdMemberRepository` não define `save`/`nextId`. */
export function toDomainHouseholdMember(row: HouseholdMemberRow): HouseholdMember {
  return {
    id: row.id,
    householdId: row.householdId,
    userId: row.userId,
    role: assertKnownValue(row.role, HOUSEHOLD_MEMBER_ROLES, 'household_members.role'),
    status: assertKnownValue(row.status, HOUSEHOLD_MEMBER_STATUSES, 'household_members.status'),
  }
}
