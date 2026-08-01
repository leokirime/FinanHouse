/**
 * Regras puras (sem conexão) do bootstrap estrutural do household inicial
 * (`apps/api/scripts/db-bootstrap-household.ts`). Mesmo padrão de
 * composição de `schema-audit.ts`/`smoke-repositories-guard.ts`: lógica
 * pura aqui, orquestração de I/O só no script.
 */
export class BootstrapGuardError extends Error {}

export interface BootstrapEnvironmentInput {
  provider: string
  environment: string
  database: string
  confirmFlag: string | undefined
}

/** Exige simultaneamente provider Aiven, ambiente de desenvolvimento, banco `finanhouse_dev` e confirmação explícita — nenhuma das quatro sozinha autoriza a escrita permanente. */
export function assertBootstrapEnvironmentAllowed(input: BootstrapEnvironmentInput): void {
  if (input.provider !== 'aiven') {
    throw new BootstrapGuardError('db:bootstrap:household só pode ser executado com DATABASE_PROVIDER=aiven.')
  }
  if (input.environment !== 'development') {
    throw new BootstrapGuardError('db:bootstrap:household só pode ser executado com DATABASE_ENV=development.')
  }
  if (input.database !== 'finanhouse_dev') {
    throw new BootstrapGuardError('db:bootstrap:household só pode ser executado com DATABASE_NAME=finanhouse_dev.')
  }
  if (input.confirmFlag !== 'true') {
    throw new BootstrapGuardError('CONFIRM_HOUSEHOLD_BOOTSTRAP=true é obrigatório para executar o bootstrap estrutural.')
  }
}

export interface BootstrapMigrationsInput {
  migrationsRows: Array<{ hash: string }>
}

/** Exige exatamente as duas migrations já aplicadas (0000 e 0001) — nem menos (schema incompleto), nem mais (schema divergente do esperado por este bloco). */
export function assertBootstrapMigrationsExact(input: BootstrapMigrationsInput): void {
  if (input.migrationsRows.length !== 2) {
    throw new BootstrapGuardError(
      `São necessárias exatamente 2 migrations aplicadas (0000 e 0001) para o bootstrap — encontradas: ${input.migrationsRows.length}.`,
    )
  }
}

export interface BootstrapExistingHouseholdInput {
  householdCount: number
}

/** O bootstrap é permanente e não sobrescreve nada — se já existe household, para sem tocar em nenhum dado. */
export function assertNoExistingHousehold(input: BootstrapExistingHouseholdInput): void {
  if (input.householdCount > 0) {
    throw new BootstrapGuardError(
      `Já existe(m) ${input.householdCount} household(s) em finanhouse_dev — bootstrap abortado para não duplicar nem alterar dados existentes.`,
    )
  }
}
