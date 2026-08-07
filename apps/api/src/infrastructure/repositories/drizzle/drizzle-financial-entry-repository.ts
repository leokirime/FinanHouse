import type { FinancialEntry } from '@finanhouse/domain'
import { and, eq, sql } from 'drizzle-orm'
import type { FinancialEntryRepository } from '../../../application/ports/financial-entry-repository.js'
import { financialEntries } from '../../../db/schema/index.js'
import { toDomainFinancialEntry, toPersistenceFinancialEntry } from './mappers/financial-entry-mapper.js'
import { HouseholdScopeViolationError, translatePersistenceError } from './persistence-errors.js'
import type { DrizzleDb } from './types.js'

/**
 * Adaptador Drizzle real da porta `FinancialEntryRepository`. Recebe a
 * instância de banco (ou transaction compatível) por injeção de
 * dependência; nunca abre conexão própria. A FK composta e a CHECK do
 * membro responsável (DT-09) continuam sendo a última barreira de
 * integridade — este repositório apenas preenche a coluna auxiliar
 * corretamente (`toPersistenceFinancialEntry`), nunca a expõe de volta.
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

  /**
   * Cria (INSERT simples, nunca upsert) ou atualiza uma movimentação
   * existente. Um upsert via `ON DUPLICATE KEY UPDATE` foi deliberadamente
   * evitado: no MySQL, qualquer índice único (não só a chave primária) pode
   * disparar o ramo de update, e a atualização resultante não fica limitada
   * por `household_id` — poderia sobrescrever silenciosamente um registro de
   * outro household em caso de colisão de `id`, ou mascarar um conflito de
   * unicidade legítimo como uma atualização. Em vez disso: existência e
   * household são verificados explicitamente antes de decidir entre INSERT e
   * UPDATE, e o UPDATE sempre usa `WHERE id = ? AND household_id = ?` — o
   * household de um registro existente nunca pode ser alterado por esta
   * operação.
   */
  async save(entry: FinancialEntry): Promise<FinancialEntry> {
    try {
      const values = toPersistenceFinancialEntry(entry)

      const existing = await this.db
        .select({ householdId: financialEntries.householdId })
        .from(financialEntries)
        .where(eq(financialEntries.id, entry.id))
        .limit(1)

      if (existing.length === 0) {
        await this.db.insert(financialEntries).values(values)
        return entry
      }

      if (existing[0]?.householdId !== entry.householdId) {
        throw new HouseholdScopeViolationError(
          `Movimentação ${entry.id} pertence a outro household — escrita bloqueada (o household de um registro existente nunca pode ser alterado).`,
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

  /**
   * Próximo valor de `AUTO_INCREMENT` da tabela — reserva o ID antes do
   * `save`, seguindo o mesmo contrato do repositório em memória (a porta
   * separa `nextId()` de `save()` porque o domínio constrói a entidade com o
   * `id` já definido). RISCO DE CONCORRÊNCIA DOCUMENTADO: esta leitura via
   * `information_schema` não reserva o valor atomicamente — sob múltiplos
   * escritores concorrentes, duas chamadas podem observar o mesmo próximo
   * valor antes de qualquer INSERT ocorrer, causando colisão de `id`
   * (detectada como `ER_DUP_ENTRY` no INSERT seguinte, nunca como corrupção
   * silenciosa, mas ainda assim uma falha visível ao usuário). Aceitável no
   * escopo atual (aplicação de um único usuário/household, sem escritores
   * concorrentes) — NÃO deve ser tratada como estratégia definitiva de
   * geração de ID em um cenário de produção com concorrência real; nesse
   * caso, a alternativa correta é confiar no AUTO_INCREMENT nativo do INSERT
   * (via `ResultSetHeader.insertId`) e reestruturar a porta para não exigir
   * um `id` pré-conhecido antes da escrita.
   */
  async nextId(): Promise<number> {
    try {
      // `db.execute` é tipado estaticamente como `[ResultSetHeader, FieldPacket[]]` (voltado a
      // DML) mesmo para SELECT — em tempo de execução, o mysql2 retorna `[RowDataPacket[],
      // FieldPacket[]]`. O cast reflete a mesma forma já usada pelos scripts de auditoria
      // (`connection.query(...)` em `apps/api/scripts/db-audit-schema.ts`).
      const [rows] = (await this.db.execute(
        sql`SELECT AUTO_INCREMENT AS nextId FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'financial_entries'`,
      )) as unknown as [Array<{ nextId: number }>, unknown]
      return Number(rows[0]?.nextId ?? 1)
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }
}
