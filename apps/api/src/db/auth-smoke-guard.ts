/**
 * Regras puras (sem conexão) do smoke-test transacional de autenticação
 * (`apps/api/scripts/db-smoke-auth-sessions.ts`). Deliberadamente separado
 * de `smoke-repositories-guard.ts`: aquele módulo tem mensagens fixas
 * mencionando `CONFIRM_REPOSITORY_SMOKE`/`db:smoke:repositories` — reutilizá-lo
 * aqui produziria uma mensagem de erro enganosa (mesma categoria de bug
 * encontrada na investigação da inicialização intermitente: um erro real
 * rotulado com o nome errado). Segue o mesmo padrão de composição de
 * `schema-audit.ts`: lógica pura aqui, orquestração de I/O só no script.
 */
export class AuthSmokeGuardError extends Error {}

export interface AuthSmokeEnvironmentInput {
  provider: string
  environment: string
  database: string
  confirmFlag: string | undefined
}

/**
 * Exige simultaneamente provider Aiven, ambiente de desenvolvimento, banco
 * `finanhouse_dev` e a confirmação explícita `CONFIRM_AUTH_SMOKE_TEST=true`
 * — nenhuma das quatro sozinha é suficiente para autorizar a transação
 * sintética de autenticação.
 */
export function assertAuthSmokeEnvironmentAllowed(input: AuthSmokeEnvironmentInput): void {
  if (input.provider !== 'aiven') {
    throw new AuthSmokeGuardError('db:smoke:auth-sessions só pode ser executado com DATABASE_PROVIDER=aiven.')
  }
  if (input.environment !== 'development') {
    throw new AuthSmokeGuardError('db:smoke:auth-sessions só pode ser executado com DATABASE_ENV=development.')
  }
  if (input.database !== 'finanhouse_dev') {
    throw new AuthSmokeGuardError('db:smoke:auth-sessions só pode ser executado com DATABASE_NAME=finanhouse_dev.')
  }
  if (input.confirmFlag !== 'true') {
    throw new AuthSmokeGuardError('CONFIRM_AUTH_SMOKE_TEST=true é obrigatório para executar o smoke-test transacional de autenticação.')
  }
}

export interface AuthSmokeMigrationsInput {
  migrationsRows: Array<{ hash: string }>
}

/** O smoke pressupõe o schema completo até a migration de auth_sessions (0000–0003): exige ao menos 4 migrations registradas. */
export function assertAuthSmokeMigrationsPresent(input: AuthSmokeMigrationsInput): void {
  if (input.migrationsRows.length < 4) {
    throw new AuthSmokeGuardError(
      `São necessárias ao menos 4 migrations aplicadas (0000–0003, incluindo auth_sessions) para o smoke-test de autenticação — encontradas: ${input.migrationsRows.length}.`,
    )
  }
}
