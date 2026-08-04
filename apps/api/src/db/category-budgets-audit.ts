/**
 * Regras puras (sem conexão) da auditoria da migration `category_budgets`
 * (Bloco 18, DT-13). Diferente de `schema-audit.ts`/
 * `responsible-member-integrity-audit.ts` — aquelas assumem banco vazio
 * antes/depois (fluxo de migration inicial); esta assume um banco JÁ COM
 * DADOS estruturais (household/usuários/membros/categorias do bootstrap do
 * Bloco 17) que precisam permanecer intactos, e que só `category_budgets`
 * deve passar de "inexistente" para "existente e vazia".
 */
export class CategoryBudgetsAuditError extends Error {}

export const PRE_EXISTING_APPLICATION_TABLES = [
  'households',
  'users',
  'household_members',
  'categories',
  'monthly_periods',
  'financial_entries',
] as const

export interface CategoryBudgetsAuditEnvironmentInput {
  environment: string
  database: string
}

export function assertCategoryBudgetsAuditEnvironmentAllowed(input: CategoryBudgetsAuditEnvironmentInput): void {
  if (input.environment !== 'development') {
    throw new CategoryBudgetsAuditError('db:audit:category-budgets só pode ser executado com DATABASE_ENV=development.')
  }
  if (input.database !== 'finanhouse_dev') {
    throw new CategoryBudgetsAuditError('db:audit:category-budgets só pode ser executado com DATABASE_NAME=finanhouse_dev.')
  }
}

export interface BeforeStateInput {
  existingApplicationTables: string[]
  migrationsRows: Array<{ hash: string }>
}

/** Antes desta migration: as seis tabelas anteriores existem, `category_budgets` ainda não, e exatamente 2 migrations estão registradas. */
export function assertCategoryBudgetsBeforeState(input: BeforeStateInput): void {
  const missing = PRE_EXISTING_APPLICATION_TABLES.filter((table) => !input.existingApplicationTables.includes(table))
  if (missing.length > 0) {
    throw new CategoryBudgetsAuditError(`Tabela(s) esperada(s) ausente(s) antes da migration: ${missing.join(', ')}.`)
  }
  if (input.existingApplicationTables.includes('category_budgets')) {
    throw new CategoryBudgetsAuditError('Tabela category_budgets já existe antes da migration — abortado para não sobrescrever um estado inesperado.')
  }
  if (input.migrationsRows.length !== 2) {
    throw new CategoryBudgetsAuditError(`Esperadas exatamente 2 migrations aplicadas antes desta (0000 e 0001) — encontradas: ${input.migrationsRows.length}.`)
  }
}

export interface AfterStateInput {
  existingApplicationTables: string[]
  migrationsRows: Array<{ hash: string }>
  categoryBudgetsRowCount: number
}

/** Depois desta migration: as sete tabelas existem, 3 migrations registradas, `category_budgets` vazia. */
export function assertCategoryBudgetsAfterState(input: AfterStateInput): void {
  const allExpected = [...PRE_EXISTING_APPLICATION_TABLES, 'category_budgets']
  const missing = allExpected.filter((table) => !input.existingApplicationTables.includes(table))
  if (missing.length > 0) {
    throw new CategoryBudgetsAuditError(`Schema incompleto após a migration: tabela(s) ausente(s): ${missing.join(', ')}.`)
  }
  if (input.migrationsRows.length !== 3) {
    throw new CategoryBudgetsAuditError(`Esperadas exatamente 3 migrations registradas após esta — encontradas: ${input.migrationsRows.length}.`)
  }
  if (input.categoryBudgetsRowCount !== 0) {
    throw new CategoryBudgetsAuditError(`category_budgets deveria estar vazia após a migration — encontrados ${input.categoryBudgetsRowCount} registro(s).`)
  }
}

/** As seis tabelas estruturais pré-existentes (household/usuários/membros/categorias/competências/movimentações) nunca devem mudar de contagem só por esta migration ter sido aplicada. */
export function assertPreExistingCountsPreserved(before: Record<string, number>, after: Record<string, number>): void {
  const mismatched = PRE_EXISTING_APPLICATION_TABLES.filter((table) => (before[table] ?? 0) !== (after[table] ?? 0))
  if (mismatched.length > 0) {
    throw new CategoryBudgetsAuditError(
      `Contagem alterada em tabela(s) que deveriam permanecer intactas: ${mismatched.join(', ')}.`,
    )
  }
}
