import type { InstallmentPlan } from '@finanhouse/domain'
import { eq } from 'drizzle-orm'
import type { ResultSetHeader } from 'mysql2/promise'
import type { InstallmentPlanRepository } from '../../../application/ports/installment-plan-repository.js'
import { installmentPlans } from '../../../db/schema/index.js'
import { toDomainInstallmentPlan, toPersistenceNewInstallmentPlan } from './mappers/installment-plan-mapper.js'
import { translatePersistenceError } from './persistence-errors.js'
import type { DrizzleDb } from './types.js'

/**
 * Adaptador Drizzle real da porta `InstallmentPlanRepository`. Primeira
 * tabela nova desde a lição registrada em DT-15: `create()` faz um `INSERT`
 * sem `id`, deixando o `AUTO_INCREMENT` nativo do MySQL gerá-lo — o valor
 * real vem de `ResultSetHeader.insertId`, devolvido pelo próprio banco de
 * forma atômica, sem nenhuma leitura prévia sujeita a colisão. Nunca lê
 * `information_schema.TABLES.AUTO_INCREMENT`, nunca calcula `MAX(id) + 1`,
 * não tem `nextId()` — mesmo padrão de `DrizzleAuthSessionRepository`.
 *
 * `InstallmentPlan` é imutável como contrato nesta versão — não existe
 * `update()`/`remove()` nesta porta (Sessão 12, Bloco 01).
 */
export class DrizzleInstallmentPlanRepository implements InstallmentPlanRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: number): Promise<InstallmentPlan | null> {
    try {
      const rows = await this.db.select().from(installmentPlans).where(eq(installmentPlans.id, id)).limit(1)
      return rows[0] ? toDomainInstallmentPlan(rows[0]) : null
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async findByHousehold(householdId: number): Promise<InstallmentPlan[]> {
    try {
      const rows = await this.db.select().from(installmentPlans).where(eq(installmentPlans.householdId, householdId))
      return rows.map(toDomainInstallmentPlan)
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async create(plan: Omit<InstallmentPlan, 'id'>): Promise<InstallmentPlan> {
    try {
      const values = toPersistenceNewInstallmentPlan(plan)
      const [result] = (await this.db.insert(installmentPlans).values(values)) as unknown as [ResultSetHeader, unknown]
      return { id: result.insertId, ...plan }
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }
}
