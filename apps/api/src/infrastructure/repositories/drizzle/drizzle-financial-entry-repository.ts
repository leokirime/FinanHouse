import type { FinancialEntry } from '@finanhouse/domain'
import { and, eq } from 'drizzle-orm'
import type { ResultSetHeader } from 'mysql2/promise'
import type { FinancialEntryRepository } from '../../../application/ports/financial-entry-repository.js'
import { financialEntries } from '../../../db/schema/index.js'
import { toDomainFinancialEntry, toPersistenceFinancialEntry, toPersistenceNewFinancialEntry } from './mappers/financial-entry-mapper.js'
import { HouseholdScopeViolationError, translatePersistenceError } from './persistence-errors.js'
import type { DrizzleDb } from './types.js'

/**
 * Adaptador Drizzle real da porta `FinancialEntryRepository`. Recebe a
 * instância de banco (ou transaction compatível) por injeção de
 * dependência; nunca abre conexão própria. A FK composta e a CHECK do
 * membro responsável (DT-09) continuam sendo a última barreira de
 * integridade — este repositório apenas preenche a coluna auxiliar
 * corretamente (`toPersistenceFinancialEntry`/`toPersistenceNewFinancialEntry`),
 * nunca a expõe de volta.
 *
 * CORRIGIDO (rodada de correção/hardening pré-Bloco 04, DT-15): a versão
 * anterior usava `nextId()` (lendo `information_schema.TABLES.AUTO_INCREMENT`)
 * + um único `save()` que fazia `INSERT` ou `UPDATE` dependendo da
 * existência prévia do `id` — exatamente o padrão já corrigido em
 * `DrizzleAuthSessionRepository`. `create()` agora faz um `INSERT` sem `id`,
 * deixando o `AUTO_INCREMENT` nativo do MySQL gerá-lo (`ResultSetHeader.insertId`);
 * `update()` só toca uma movimentação já existente, nunca cria implicitamente.
 * `nextId()` foi removido inteiramente da porta e desta implementação.
 */
export class DrizzleFinancialEntryRepository implements FinancialEntryRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findById(id: number): Promise<FinancialEntry | null> {
    try {
      const rows = await this.db.select().from(financialEntries).where(eq(financialEntries.id, id)).limit(1)
      return rows[0] ? toDomainFinancialEntry(rows[0]) : null
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async findByPeriod(periodId: number): Promise<FinancialEntry[]> {
    try {
      const rows = await this.db.select().from(financialEntries).where(eq(financialEntries.periodId, periodId))
      return rows.map(toDomainFinancialEntry)
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async findByHousehold(householdId: number): Promise<FinancialEntry[]> {
    try {
      const rows = await this.db.select().from(financialEntries).where(eq(financialEntries.householdId, householdId))
      return rows.map(toDomainFinancialEntry)
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  /** Sempre insere uma linha nova — nunca fornece `id`; o valor real vem de `ResultSetHeader.insertId`, lido de volta pelo próprio banco de forma atômica. */
  async create(entry: Omit<FinancialEntry, 'id'>): Promise<FinancialEntry> {
    try {
      const values = toPersistenceNewFinancialEntry(entry)
      const [result] = (await this.db.insert(financialEntries).values(values)) as unknown as [ResultSetHeader, unknown]
      return { id: result.insertId, ...entry }
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  /** Nunca cria: só atualiza uma movimentação já existente do mesmo household — `WHERE id = ? AND household_id = ?`. */
  async update(entry: FinancialEntry): Promise<FinancialEntry> {
    try {
      const values = toPersistenceFinancialEntry(entry)

      const existing = await this.db
        .select({ householdId: financialEntries.householdId })
        .from(financialEntries)
        .where(eq(financialEntries.id, entry.id))
        .limit(1)

      if (existing.length === 0 || existing[0]?.householdId !== entry.householdId) {
        throw new HouseholdScopeViolationError(
          `Movimentação ${entry.id} não existe ou pertence a outro household — atualização bloqueada (update() nunca cria implicitamente).`,
        )
      }

      await this.db
        .update(financialEntries)
        .set({
          periodId: values.periodId,
          categoryId: values.categoryId,
          responsibleMemberId: values.responsibleMemberId,
          responsibleMemberHouseholdId: values.responsibleMemberHouseholdId,
          createdByUserId: values.createdByUserId,
          entryType: values.entryType,
          status: values.status,
          description: values.description,
          expectedAmount: values.expectedAmount,
          actualAmount: values.actualAmount,
          dueDate: values.dueDate,
          realizationDate: values.realizationDate,
          notes: values.notes,
        })
        .where(and(eq(financialEntries.id, entry.id), eq(financialEntries.householdId, entry.householdId)))

      return entry
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  /** Remove permanentemente (nunca soft delete) — `WHERE id = ? AND household_id = ?`, nunca remove um registro de outro household mesmo que `id` colida. */
  async remove(id: number, householdId: number): Promise<void> {
    try {
      await this.db.delete(financialEntries).where(and(eq(financialEntries.id, id), eq(financialEntries.householdId, householdId)))
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }
}
