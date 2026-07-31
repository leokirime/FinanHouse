export const EXPECTED_APPLICATION_TABLES = [
  'categories',
  'financial_entries',
  'household_members',
  'households',
  'monthly_periods',
  'users',
] as const

export const MIGRATIONS_TABLE_NAME = '__drizzle_migrations'

export class SchemaAuditError extends Error {}

export type AuditPhase = 'before' | 'after'

const PHASE_FLAG_PREFIX = '--phase='

/**
 * Extrai a fase (`before`/`after`) dos argumentos de linha de comando.
 * Puro — não lê `process.argv` diretamente.
 */
export function parseAuditPhase(argv: string[]): AuditPhase {
  const flag = argv.find((value) => value.startsWith(PHASE_FLAG_PREFIX))
  const phase = flag?.slice(PHASE_FLAG_PREFIX.length)
  if (phase !== 'before' && phase !== 'after') {
    throw new SchemaAuditError('Uso: --phase=before ou --phase=after.')
  }
  return phase
}

export interface AuditEnvironmentInput {
  environment: string
  database: string
}

/**
 * Restrição adicional, mais estrita que `resolveDatabaseConfig`: a
 * auditoria de schema só pode ser executada contra desenvolvimento
 * (`finanhouse_dev`) — nunca `test`, nunca `production`, nunca outro banco.
 */
export function assertAuditEnvironmentAllowed(input: AuditEnvironmentInput): void {
  if (input.environment !== 'development') {
    throw new SchemaAuditError('db:audit:schema só pode ser executado com DATABASE_ENV=development.')
  }
  if (input.database !== 'finanhouse_dev') {
    throw new SchemaAuditError('db:audit:schema só pode ser executado com DATABASE_NAME=finanhouse_dev.')
  }
}

export interface BeforeStateInput {
  existingApplicationTables: string[]
  migrationsTableExists: boolean
}

/**
 * Estado esperado antes da migration inicial: nenhuma das seis tabelas da
 * aplicação existe e o journal de migrations ainda não foi criado.
 */
export function assertBeforeState(input: BeforeStateInput): void {
  const present = EXPECTED_APPLICATION_TABLES.filter((table) => input.existingApplicationTables.includes(table))
  if (present.length > 0) {
    throw new SchemaAuditError(
      `Estado inesperado antes da migration: ${present.length} de ${EXPECTED_APPLICATION_TABLES.length} tabela(s) da aplicação já existe(m) (${present.join(', ')}). Nenhuma migration deve ser aplicada sobre um banco parcialmente preenchido.`,
    )
  }
  if (input.migrationsTableExists) {
    throw new SchemaAuditError(`Estado inesperado antes da migration: tabela de journal "${MIGRATIONS_TABLE_NAME}" já existe.`)
  }
}

export interface AfterStateInput {
  existingApplicationTables: string[]
  migrationsRows: Array<{ hash: string }>
  rowCounts: Record<string, number>
}

/**
 * Estado esperado depois da migration inicial: as seis tabelas existem, o
 * journal registra ao menos uma migration aplicada, e nenhuma tabela da
 * aplicação contém registros (schema aplicado, nenhum dado inserido).
 */
export function assertAfterState(input: AfterStateInput): void {
  const missing = EXPECTED_APPLICATION_TABLES.filter((table) => !input.existingApplicationTables.includes(table))
  if (missing.length > 0) {
    throw new SchemaAuditError(`Schema incompleto após a migration: tabela(s) ausente(s): ${missing.join(', ')}.`)
  }

  if (input.migrationsRows.length === 0) {
    throw new SchemaAuditError(`Nenhuma migration registrada na tabela de journal "${MIGRATIONS_TABLE_NAME}".`)
  }

  const withData = EXPECTED_APPLICATION_TABLES.filter((table) => (input.rowCounts[table] ?? 0) > 0)
  if (withData.length > 0) {
    throw new SchemaAuditError(
      `Estado inesperado após a migration: tabela(s) com registros quando zero era esperado: ${withData.join(', ')}.`,
    )
  }
}
