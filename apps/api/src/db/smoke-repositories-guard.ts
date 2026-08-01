/**
 * Regras puras (sem conexão) do smoke-test transacional dos repositórios
 * Drizzle reais (`apps/api/scripts/db-smoke-repositories.ts`). Segue o mesmo
 * padrão de composição de `schema-audit.ts`/`responsible-member-integrity-audit.ts`:
 * lógica pura aqui, orquestração de I/O só no script.
 */
export class SmokeGuardError extends Error {}

export interface SmokeEnvironmentInput {
  environment: string
  database: string
  confirmFlag: string | undefined
}

/**
 * Exige simultaneamente ambiente de desenvolvimento, banco `finanhouse_dev`
 * e a confirmação explícita `CONFIRM_REPOSITORY_SMOKE=true` — nenhuma das
 * três sozinha é suficiente para autorizar a escrita transacional.
 */
export function assertSmokeEnvironmentAllowed(input: SmokeEnvironmentInput): void {
  if (input.environment !== 'development') {
    throw new SmokeGuardError('db:smoke:repositories só pode ser executado com DATABASE_ENV=development.')
  }
  if (input.database !== 'finanhouse_dev') {
    throw new SmokeGuardError('db:smoke:repositories só pode ser executado com DATABASE_NAME=finanhouse_dev.')
  }
  if (input.confirmFlag !== 'true') {
    throw new SmokeGuardError('CONFIRM_REPOSITORY_SMOKE=true é obrigatório para executar o smoke-test transacional.')
  }
}

export interface SmokeMigrationsInput {
  migrationsRows: Array<{ hash: string }>
}

/** Exige as duas migrations já aplicadas (0000 e 0001) — o smoke pressupõe o schema completo do Bloco 13. */
export function assertSmokeMigrationsPresent(input: SmokeMigrationsInput): void {
  if (input.migrationsRows.length < 2) {
    throw new SmokeGuardError(
      `São necessárias ao menos 2 migrations aplicadas (0000 e 0001) para o smoke-test — encontradas: ${input.migrationsRows.length}.`,
    )
  }
}

export interface SmokeRowCountsInput {
  rowCounts: Record<string, number>
}

/** O smoke nunca começa sobre dado real: todas as tabelas precisam estar vazias antes de abrir a transação. */
export function assertSmokeStartingEmpty(input: SmokeRowCountsInput): void {
  const withData = Object.entries(input.rowCounts).filter(([, count]) => count > 0)
  if (withData.length > 0) {
    throw new SmokeGuardError(
      `Tabela(s) com registros antes do smoke — não é seguro continuar: ${withData.map(([table]) => table).join(', ')}.`,
    )
  }
}

export interface SmokeResidualDataInput {
  before: Record<string, number>
  after: Record<string, number>
}

/** Depois do rollback intencional, as contagens precisam voltar exatamente aos valores anteriores à transação. */
export function assertNoResidualData(input: SmokeResidualDataInput): void {
  const tables = new Set([...Object.keys(input.before), ...Object.keys(input.after)])
  const mismatched = [...tables].filter((table) => (input.before[table] ?? 0) !== (input.after[table] ?? 0))
  if (mismatched.length > 0) {
    throw new SmokeGuardError(`Dado residual detectado após o rollback em: ${mismatched.join(', ')}.`)
  }
}
