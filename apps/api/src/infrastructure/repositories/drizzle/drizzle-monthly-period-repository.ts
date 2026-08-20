import type { MonthlyPeriod } from '@finanhouse/domain'
import { and, eq } from 'drizzle-orm'
import type { ResultSetHeader } from 'mysql2/promise'
import type { MonthlyPeriodRepository } from '../../../application/ports/monthly-period-repository.js'
import { monthlyPeriods } from '../../../db/schema/index.js'
import { toDomainMonthlyPeriod, toPersistenceMonthlyPeriod, toPersistenceNewMonthlyPeriod } from './mappers/monthly-period-mapper.js'
import { HouseholdScopeViolationError, translatePersistenceError } from './persistence-errors.js'
import type { DrizzleDb } from './types.js'

/**
 * Adaptador Drizzle real da porta `MonthlyPeriodRepository`. Recebe a
 * instância de banco (ou transaction compatível) por injeção de
 * dependência; nunca abre conexão própria.
 *
 * CORRIGIDO (rodada de correção/hardening pré-Bloco 04, DT-15): a versão
 * anterior usava `nextId()` (lendo `information_schema.TABLES.AUTO_INCREMENT`)
 * + um único `save()` que fazia `INSERT` ou `UPDATE` dependendo da
 * existência prévia do `id`. `create()` agora faz um `INSERT` sem `id`,
 * deixando o `AUTO_INCREMENT` nativo do MySQL gerá-lo (`ResultSetHeader.insertId`);
 * `update()` só toca uma competência já existente, nunca cria implicitamente.
 * Um `INSERT` via `create()` que colida com
 * `monthly_periods_household_reference_month_unique` continua falhando como
 * conflito de unicidade (`ER_DUP_ENTRY`, traduzido pelo `translatePersistenceError`),
 * exatamente como antes — nenhuma mudança nessa proteção.
 */
export class DrizzleMonthlyPeriodRepository implements MonthlyPeriodRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: number): Promise<MonthlyPeriod | null> {
    try {
      const rows = await this.db.select().from(monthlyPeriods).where(eq(monthlyPeriods.id, id)).limit(1)
      return rows[0] ? toDomainMonthlyPeriod(rows[0]) : null
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async findByHouseholdAndReferenceMonth(householdId: number, referenceMonth: string): Promise<MonthlyPeriod | null> {
    try {
      const rows = await this.db
        .select()
        .from(monthlyPeriods)
        .where(and(eq(monthlyPeriods.householdId, householdId), eq(monthlyPeriods.referenceMonth, referenceMonth)))
        .limit(1)
      return rows[0] ? toDomainMonthlyPeriod(rows[0]) : null
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async findByHousehold(householdId: number): Promise<MonthlyPeriod[]> {
    try {
      const rows = await this.db.select().from(monthlyPeriods).where(eq(monthlyPeriods.householdId, householdId))
      return rows.map(toDomainMonthlyPeriod)
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  /** Sempre insere uma linha nova — nunca fornece `id`; o valor real vem de `ResultSetHeader.insertId`, lido de volta pelo próprio banco de forma atômica. */
  async create(period: Omit<MonthlyPeriod, 'id'>): Promise<MonthlyPeriod> {
    try {
      const values = toPersistenceNewMonthlyPeriod(period)
      const [result] = (await this.db.insert(monthlyPeriods).values(values)) as unknown as [ResultSetHeader, unknown]
      return { id: result.insertId, ...period }
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  /** Nunca cria: só atualiza uma competência já existente do mesmo household — `WHERE id = ? AND household_id = ?`. */
  async update(period: MonthlyPeriod): Promise<MonthlyPeriod> {
    try {
      const values = toPersistenceMonthlyPeriod(period)

      const existing = await this.db
        .select({ householdId: monthlyPeriods.householdId })
        .from(monthlyPeriods)
        .where(eq(monthlyPeriods.id, period.id))
        .limit(1)

      if (existing.length === 0 || existing[0]?.householdId !== period.householdId) {
        throw new HouseholdScopeViolationError(
          `Competência ${period.id} não existe ou pertence a outro household — atualização bloqueada (update() nunca cria implicitamente).`,
        )
      }

      await this.db
        .update(monthlyPeriods)
        .set({
          referenceMonth: values.referenceMonth,
          status: values.status,
          closedAt: values.closedAt,
          closedByUserId: values.closedByUserId,
        })
        .where(and(eq(monthlyPeriods.id, period.id), eq(monthlyPeriods.householdId, period.householdId)))

      return period
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }
}
