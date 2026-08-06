/**
 * Regras puras (sem conexão) da configuração de senhas iniciais dos dois
 * usuários já existentes (`apps/api/scripts/db-configure-initial-passwords.ts`,
 * Bloco 19, DT-14). Mesmo padrão de composição de `household-bootstrap-guard.ts`:
 * lógica pura aqui, orquestração de I/O só no script. Nunca cria usuário —
 * só configura `password_hash` de quem já existe.
 */
export class InitialPasswordsGuardError extends Error {}

export interface InitialPasswordsEnvironmentInput {
  provider: string
  environment: string
  database: string
  confirmFlag: string | undefined
}

/** Exige simultaneamente Aiven, development, finanhouse_dev e confirmação explícita — nenhuma das quatro sozinha autoriza. */
export function assertInitialPasswordsEnvironmentAllowed(input: InitialPasswordsEnvironmentInput): void {
  if (input.provider !== 'aiven') {
    throw new InitialPasswordsGuardError('db:configure:initial-passwords só pode ser executado com DATABASE_PROVIDER=aiven.')
  }
  if (input.environment !== 'development') {
    throw new InitialPasswordsGuardError('db:configure:initial-passwords só pode ser executado com DATABASE_ENV=development.')
  }
  if (input.database !== 'finanhouse_dev') {
    throw new InitialPasswordsGuardError('db:configure:initial-passwords só pode ser executado com DATABASE_NAME=finanhouse_dev.')
  }
  if (input.confirmFlag !== 'true') {
    throw new InitialPasswordsGuardError('CONFIRM_INITIAL_PASSWORDS=true é obrigatório para configurar as senhas iniciais.')
  }
}

export interface ExistingUserLookup {
  ownerFound: boolean
  partnerFound: boolean
}

/** As duas contas precisam já existir (criadas pelo bootstrap do Bloco 17) — este script nunca cria usuário. */
export function assertUsersFoundExactly(input: ExistingUserLookup): void {
  if (!input.ownerFound || !input.partnerFound) {
    const missing = [!input.ownerFound && 'owner', !input.partnerFound && 'partner'].filter(Boolean).join(', ')
    throw new InitialPasswordsGuardError(
      `Usuário(s) não encontrado(s) pelo e-mail configurado localmente: ${missing}. Nenhuma senha foi configurada, nenhum usuário foi criado.`,
    )
  }
}

export interface ExistingPasswordState {
  ownerAlreadyConfigured: boolean
  partnerAlreadyConfigured: boolean
  allowOverwrite: boolean
}

/** Sobrescrever uma senha já configurada exige uma autorização separada (`CONFIRM_PASSWORD_OVERWRITE=true`) — nunca o mesmo flag que autoriza a primeira configuração. */
export function assertNoUnauthorizedOverwrite(input: ExistingPasswordState): void {
  if (input.allowOverwrite) return
  if (input.ownerAlreadyConfigured || input.partnerAlreadyConfigured) {
    const already = [input.ownerAlreadyConfigured && 'owner', input.partnerAlreadyConfigured && 'partner'].filter(Boolean).join(', ')
    throw new InitialPasswordsGuardError(
      `Senha já configurada para: ${already}. Sobrescrever exige CONFIRM_PASSWORD_OVERWRITE=true explícito, além de CONFIRM_INITIAL_PASSWORDS=true.`,
    )
  }
}
