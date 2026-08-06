/**
 * Regras puras (sem conexão) da auditoria da migration `auth_sessions`
 * (Bloco 19, DT-14). Mesmo raciocínio de `category-budgets-audit.ts` (Bloco
 * 18): o banco já tem dados estruturais reais (household/usuários/membros/
 * categorias/category_budgets) que precisam permanecer intactos — só
 * `auth_sessions` (e as duas colunas novas em `users`) devem mudar.
 */
export class AuthSessionsAuditError extends Error {}

export const PRE_EXISTING_APPLICATION_TABLES = [
  'households',
  'users',
  'household_members',
  'categories',
  'monthly_periods',
  'financial_entries',
  'category_budgets',
] as const

export interface AuthSessionsAuditEnvironmentInput {
  environment: string
  database: string
}

export function assertAuthSessionsAuditEnvironmentAllowed(input: AuthSessionsAuditEnvironmentInput): void {
  if (input.environment !== 'development') {
    throw new AuthSessionsAuditError('db:audit:auth-sessions só pode ser executado com DATABASE_ENV=development.')
  }
  if (input.database !== 'finanhouse_dev') {
    throw new AuthSessionsAuditError('db:audit:auth-sessions só pode ser executado com DATABASE_NAME=finanhouse_dev.')
  }
}

export interface BeforeStateInput {
  existingApplicationTables: string[]
  migrationsRows: Array<{ hash: string }>
}

/** Antes desta migration: as sete tabelas anteriores existem, `auth_sessions` ainda não, e exatamente 3 migrations estão registradas. */
export function assertAuthSessionsBeforeState(input: BeforeStateInput): void {
  const missing = PRE_EXISTING_APPLICATION_TABLES.filter((table) => !input.existingApplicationTables.includes(table))
  if (missing.length > 0) {
    throw new AuthSessionsAuditError(`Tabela(s) esperada(s) ausente(s) antes da migration: ${missing.join(', ')}.`)
  }
  if (input.existingApplicationTables.includes('auth_sessions')) {
    throw new AuthSessionsAuditError('Tabela auth_sessions já existe antes da migration — abortado para não sobrescrever um estado inesperado.')
  }
  if (input.migrationsRows.length !== 3) {
    throw new AuthSessionsAuditError(`Esperadas exatamente 3 migrations aplicadas antes desta (0000, 0001, 0002) — encontradas: ${input.migrationsRows.length}.`)
  }
}

export interface AfterStateInput {
  existingApplicationTables: string[]
  migrationsRows: Array<{ hash: string }>
  authSessionsRowCount: number
  usersWithPasswordConfiguredCount: number
}

/** Depois desta migration: as oito tabelas existem, 4 migrations registradas, `auth_sessions` vazia, nenhuma senha configurada ainda (script separado, autorização própria). */
export function assertAuthSessionsAfterState(input: AfterStateInput): void {
  const allExpected = [...PRE_EXISTING_APPLICATION_TABLES, 'auth_sessions']
  const missing = allExpected.filter((table) => !input.existingApplicationTables.includes(table))
  if (missing.length > 0) {
    throw new AuthSessionsAuditError(`Schema incompleto após a migration: tabela(s) ausente(s): ${missing.join(', ')}.`)
  }
  if (input.migrationsRows.length !== 4) {
    throw new AuthSessionsAuditError(`Esperadas exatamente 4 migrations registradas após esta — encontradas: ${input.migrationsRows.length}.`)
  }
  if (input.authSessionsRowCount !== 0) {
    throw new AuthSessionsAuditError(`auth_sessions deveria estar vazia após a migration — encontrados ${input.authSessionsRowCount} registro(s).`)
  }
  if (input.usersWithPasswordConfiguredCount !== 0) {
    throw new AuthSessionsAuditError(
      `Nenhum usuário deveria ter senha configurada só pela migration — encontrados ${input.usersWithPasswordConfiguredCount}. A migration nunca configura senha (script separado, autorização própria).`,
    )
  }
}

/** As sete tabelas pré-existentes nunca devem mudar de contagem só por esta migration ter sido aplicada. */
export function assertPreExistingCountsPreserved(before: Record<string, number>, after: Record<string, number>): void {
  const mismatched = PRE_EXISTING_APPLICATION_TABLES.filter((table) => (before[table] ?? 0) !== (after[table] ?? 0))
  if (mismatched.length > 0) {
    throw new AuthSessionsAuditError(`Contagem alterada em tabela(s) que deveriam permanecer intactas: ${mismatched.join(', ')}.`)
  }
}
