import type { MonthlyPeriod } from '@finanhouse/domain'
import { and, eq, sql } from 'drizzle-orm'
import type { MonthlyPeriodRepository } from '../../../application/ports/monthly-period-repository.js'
import { monthlyPeriods } from '../../../db/schema/index.js'
import { toDomainMonthlyPeriod, toPersistenceMonthlyPeriod } from './mappers/monthly-period-mapper.js'
import { HouseholdScopeViolationError, translatePersistenceError } from './persistence-errors.js'
import type { DrizzleDb } from './types.js'

/**
 * Adaptador Drizzle real da porta `MonthlyPeriodRepository`. Recebe a
 * instância de banco (ou transaction compatível) por injeção de
 * dependência; nunca abre conexão própria.
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

  /**
   * Cria (INSERT simples, nunca upsert) ou atualiza uma competência
   * existente. Ver o comentário equivalente em
   * `drizzle-financial-entry-repository.ts#save` sobre por que
   * `ON DUPLICATE KEY UPDATE` foi deliberadamente evitado: aqui o risco é
   * ainda mais concreto, porque `monthly_periods` tem um índice único
   * adicional (`household_id + reference_month`) além da chave primária — um
   * upsert por essa unique key colidiria de forma completamente alheia ao
   * `id`, mascarando um conflito legítimo de competência duplicada como uma
   * atualização. Em vez disso: existência e household são verificados
   * explicitamente antes de decidir entre INSERT e UPDATE, e o UPDATE sempre
   * usa `WHERE id = ? AND household_id = ?` — o household de uma competência
   * existente nunca pode ser alterado por esta operação, e um INSERT que
   * colida com `monthly_periods_household_reference_month_unique` continua
   * falhando como conflito de unicidade (`ER_DUP_ENTRY`), nunca como
   * atualização silenciosa.
   */
  async save(period: MonthlyPeriod): Promise<MonthlyPeriod> {
    try {
      const values = toPersistenceMonthlyPeriod(period)

      const existing = await this.db
        .select({ householdId: monthlyPeriods.householdId })
        .from(monthlyPeriods)
        .where(eq(monthlyPeriods.id, period.id))
        .limit(1)

      if (existing.length === 0) {
        await this.db.insert(monthlyPeriods).values(values)
        return period
      }

      if (existing[0]?.householdId !== period.householdId) {
        throw new HouseholdScopeViolationError(
          `Competência ${period.id} pertence a outro household — escrita bloqueada (o household de um registro existente nunca pode ser alterado).`,
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

  /**
   * Próximo valor de `AUTO_INCREMENT` da tabela — reserva o ID antes do
   * `save`, seguindo o mesmo contrato do repositório em memória (`nextId()`
   * separado de `save()`). RISCO DE CONCORRÊNCIA DOCUMENTADO: ver o
   * comentário equivalente em `drizzle-financial-entry-repository.ts#nextId`
   * — esta leitura via `information_schema` não reserva o valor
   * atomicamente; aceitável apenas no escopo atual (um único
   * usuário/household, sem escritores concorrentes), nunca como estratégia
   * definitiva para um cenário de produção com concorrência real.
   */
  async nextId(): Promise<number> {
    try {
      // Ver comentário equivalente em `drizzle-financial-entry-repository.ts` sobre o cast de `db.execute`.
      const [rows] = (await this.db.execute(
        sql`SELECT AUTO_INCREMENT AS nextId FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'monthly_periods'`,
      )) as unknown as [Array<{ nextId: number }>, unknown]
      return Number(rows[0]?.nextId ?? 1)
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }
}
