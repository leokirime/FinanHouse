import { EXPECTED_APPLICATION_TABLES, SchemaAuditError } from './schema-audit.js'

export { assertAuditEnvironmentAllowed, parseAuditPhase, SchemaAuditError } from './schema-audit.js'
export type { AuditPhase } from './schema-audit.js'

export const OLD_SIMPLE_FK_NAME = 'financial_entries_responsible_member_id_household_members_id_fk'
export const NEW_COMPOSITE_FK_NAME = 'financial_entries_responsible_member_household_fk'
export const PARENT_UNIQUE_INDEX_NAME = 'household_members_id_household_id_unique'
export const CHILD_INDEX_NAME = 'financial_entries_responsible_member_household_idx'
export const CHECK_CONSTRAINT_NAME = 'financial_entries_responsible_member_household_check'
export const AUXILIARY_COLUMN_NAME = 'responsible_member_household_id'

export interface ResponsibleMemberBeforeStateInput {
  existingApplicationTables: string[]
  migrationsRows: Array<{ hash: string }>
  rowCounts: Record<string, number>
  auxiliaryColumnExists: boolean
  oldSimpleForeignKeyExists: boolean
  newCompositeForeignKeyExists: boolean
}

/**
 * Estado esperado antes da migration incremental de integridade: schema da
 * migration inicial completo e intocado (seis tabelas, uma migration no
 * journal, tabelas vazias), FK simples antiga ainda presente, nenhum
 * vestígio da correção (coluna auxiliar/FK composta) ainda existente.
 */
export function assertResponsibleMemberBeforeState(input: ResponsibleMemberBeforeStateInput): void {
  const missing = EXPECTED_APPLICATION_TABLES.filter((table) => !input.existingApplicationTables.includes(table))
  if (missing.length > 0) {
    throw new SchemaAuditError(`Tabela(s) da aplicação ausente(s) antes da correção: ${missing.join(', ')}.`)
  }

  if (input.migrationsRows.length !== 1) {
    throw new SchemaAuditError(
      `Esperada exatamente 1 migration registrada antes da correção; encontradas ${input.migrationsRows.length}.`,
    )
  }

  const withData = EXPECTED_APPLICATION_TABLES.filter((table) => (input.rowCounts[table] ?? 0) > 0)
  if (withData.length > 0) {
    throw new SchemaAuditError(`Tabela(s) com registros antes da correção, quando zero era esperado: ${withData.join(', ')}.`)
  }

  if (input.auxiliaryColumnExists) {
    throw new SchemaAuditError(`Coluna auxiliar "${AUXILIARY_COLUMN_NAME}" já existe antes da migration — estado inesperado.`)
  }

  if (!input.oldSimpleForeignKeyExists) {
    throw new SchemaAuditError(`FK simples antiga "${OLD_SIMPLE_FK_NAME}" não encontrada — estado inesperado antes da correção.`)
  }

  if (input.newCompositeForeignKeyExists) {
    throw new SchemaAuditError(`FK composta "${NEW_COMPOSITE_FK_NAME}" já existe antes da migration — estado inesperado.`)
  }
}

export interface ResponsibleMemberAfterStateInput {
  existingApplicationTables: string[]
  migrationsRows: Array<{ hash: string }>
  rowCounts: Record<string, number>
  auxiliaryColumnExists: boolean
  auxiliaryColumnNullable: boolean
  parentUniqueIndexExists: boolean
  childIndexExists: boolean
  oldSimpleForeignKeyExists: boolean
  newCompositeForeignKeyExists: boolean
  newForeignKeyDeleteRule: string | null
  checkConstraintExists: boolean
}

/**
 * Estado esperado depois da migration incremental de integridade: schema
 * completo com a correção aplicada, journal com duas migrations, tabelas
 * continuam vazias (nenhum dado inserido por esta correção estrutural).
 */
export function assertResponsibleMemberAfterState(input: ResponsibleMemberAfterStateInput): void {
  const missing = EXPECTED_APPLICATION_TABLES.filter((table) => !input.existingApplicationTables.includes(table))
  if (missing.length > 0) {
    throw new SchemaAuditError(`Tabela(s) da aplicação ausente(s) depois da correção: ${missing.join(', ')}.`)
  }

  if (input.migrationsRows.length !== 2) {
    throw new SchemaAuditError(
      `Esperadas exatamente 2 migrations registradas depois da correção; encontradas ${input.migrationsRows.length}.`,
    )
  }

  const withData = EXPECTED_APPLICATION_TABLES.filter((table) => (input.rowCounts[table] ?? 0) > 0)
  if (withData.length > 0) {
    throw new SchemaAuditError(`Tabela(s) com registros depois da correção, quando zero era esperado: ${withData.join(', ')}.`)
  }

  if (!input.auxiliaryColumnExists) {
    throw new SchemaAuditError(`Coluna auxiliar "${AUXILIARY_COLUMN_NAME}" ausente depois da migration.`)
  }

  if (!input.auxiliaryColumnNullable) {
    throw new SchemaAuditError(`Coluna auxiliar "${AUXILIARY_COLUMN_NAME}" não é nullable depois da migration.`)
  }

  if (!input.parentUniqueIndexExists) {
    throw new SchemaAuditError(`household_members não tem "${PARENT_UNIQUE_INDEX_NAME}" depois da migration.`)
  }

  if (!input.childIndexExists) {
    throw new SchemaAuditError(`Índice "${CHILD_INDEX_NAME}" das colunas filhas da FK composta ausente depois da migration.`)
  }

  if (input.oldSimpleForeignKeyExists) {
    throw new SchemaAuditError(`FK simples antiga "${OLD_SIMPLE_FK_NAME}" ainda existe depois da migration.`)
  }

  if (!input.newCompositeForeignKeyExists) {
    throw new SchemaAuditError(`FK composta "${NEW_COMPOSITE_FK_NAME}" ausente depois da migration.`)
  }

  // RESTRICT, não SET NULL: o MySQL 8 proíbe SET NULL/CASCADE em FK sobre coluna também usada
  // em CHECK constraint (erro 3823, ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN) —
  // ver DT-09.
  if (input.newForeignKeyDeleteRule !== 'RESTRICT') {
    throw new SchemaAuditError(
      `DELETE_RULE da FK composta "${NEW_COMPOSITE_FK_NAME}" deveria ser RESTRICT; encontrado "${input.newForeignKeyDeleteRule}".`,
    )
  }

  if (!input.checkConstraintExists) {
    throw new SchemaAuditError(`CHECK constraint "${CHECK_CONSTRAINT_NAME}" ausente depois da migration.`)
  }
}
