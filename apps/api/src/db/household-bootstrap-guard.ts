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

/** Únicos pares (ambiente, banco) autorizados a rodar o bootstrap — nunca o banco de um ambiente com o `DATABASE_ENV` do outro. `finanhouse_dev`/`finanhouse_prod` continuam sendo os únicos bancos reais do projeto (mesma fronteira de `database-config.ts`, reafirmada aqui de forma independente como defesa em profundidade). */
const BOOTSTRAP_ALLOWED_TARGETS: Readonly<Record<string, string>> = {
  development: 'finanhouse_dev',
  production: 'finanhouse_prod',
}

/**
 * Exige provider Aiven, um par (ambiente, banco) explicitamente autorizado
 * (Sessão 14, Bloco 03, FASE D.1 — antes só `development`/`finanhouse_dev`
 * era aceito; `production`/`finanhouse_prod` passou a ser um alvo oficial) e
 * confirmação explícita — nenhuma condição sozinha autoriza a escrita
 * permanente. Fail-closed: qualquer ambiente fora do mapa (`staging`,
 * desconhecido, etc.) ou qualquer banco que não seja exatamente o par
 * esperado (incluindo `defaultdb` ou o banco do outro ambiente) é recusado.
 */
export function assertBootstrapEnvironmentAllowed(input: BootstrapEnvironmentInput): void {
  if (input.provider !== 'aiven') {
    throw new BootstrapGuardError('db:bootstrap:household só pode ser executado com DATABASE_PROVIDER=aiven.')
  }
  const expectedDatabase = BOOTSTRAP_ALLOWED_TARGETS[input.environment]
  if (!expectedDatabase) {
    throw new BootstrapGuardError(
      'db:bootstrap:household só pode ser executado com DATABASE_ENV=development (+ finanhouse_dev) ou DATABASE_ENV=production (+ finanhouse_prod).',
    )
  }
  if (input.database !== expectedDatabase) {
    throw new BootstrapGuardError(
      `db:bootstrap:household: DATABASE_ENV="${input.environment}" exige DATABASE_NAME="${expectedDatabase}" — nunca o banco de outro ambiente.`,
    )
  }
  if (input.confirmFlag !== 'true') {
    throw new BootstrapGuardError('CONFIRM_HOUSEHOLD_BOOTSTRAP=true é obrigatório para executar o bootstrap estrutural.')
  }
}

export interface BootstrapMigrationsInput {
  appliedCount: number
  expectedCount: number
}

/**
 * Exige que a contagem de migrations aplicadas no banco alvo seja
 * exatamente igual à quantidade declarada no journal oficial
 * (`database/migrations/meta/_journal.json`, lido pelo script chamador) —
 * nunca um número fixo no código, que ficaria obsoleto a cada nova migration
 * (Sessão 14, Bloco 03, FASE D.1 — o valor fixo em 2 datava do Bloco 17 e já
 * estava desatualizado frente às 5 migrations reais do projeto). Menos que o
 * esperado é schema desatualizado; mais que o esperado é estado
 * inconsistente — ambos abortam o bootstrap antes de qualquer escrita.
 */
export function assertBootstrapMigrationsMatchJournal(input: BootstrapMigrationsInput): void {
  if (input.appliedCount < input.expectedCount) {
    throw new BootstrapGuardError(
      `O banco alvo tem ${input.appliedCount} migration(ns) aplicada(s), mas o journal oficial espera ${input.expectedCount} — schema desatualizado, bootstrap abortado.`,
    )
  }
  if (input.appliedCount > input.expectedCount) {
    throw new BootstrapGuardError(
      `O banco alvo tem ${input.appliedCount} migration(ns) aplicada(s), mais que as ${input.expectedCount} esperadas pelo journal oficial — estado inconsistente, bootstrap abortado.`,
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
