import type { HouseholdMember } from '@finanhouse/domain'
import { eq } from 'drizzle-orm'
import type { HouseholdMemberRepository } from '../../../application/ports/household-member-repository.js'
import { householdMembers } from '../../../db/schema/index.js'
import { toDomainHouseholdMember } from './mappers/household-member-mapper.js'
import { translatePersistenceError } from './persistence-errors.js'
import type { DrizzleDb } from './types.js'

/**
 * Adaptador Drizzle real da porta `HouseholdMemberRepository` — somente
 * leitura, espelhando a porta. Recebe a instância de banco por injeção de
 * dependência; nunca abre conexão própria.
 */
export class DrizzleHouseholdMemberRepository implements HouseholdMemberRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: number): Promise<HouseholdMember | null> {
    try {
      const rows = await this.db.select().from(householdMembers).where(eq(householdMembers.id, id)).limit(1)
      return rows[0] ? toDomainHouseholdMember(rows[0]) : null
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async findByHousehold(householdId: number): Promise<HouseholdMember[]> {
    try {
      const rows = await this.db.select().from(householdMembers).where(eq(householdMembers.householdId, householdId))
      return rows.map(toDomainHouseholdMember)
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async findByUserId(userId: number): Promise<HouseholdMember[]> {
    try {
      const rows = await this.db.select().from(householdMembers).where(eq(householdMembers.userId, userId))
      return rows.map(toDomainHouseholdMember)
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }
}
