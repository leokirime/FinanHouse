/**
 * Leitura e validação das variáveis locais da configuração de senhas
 * iniciais (`apps/api/.env.local`) — nunca imprime os valores lidos, apenas
 * o nome da variável em caso de erro. Reaproveita
 * `FINANHOUSE_BOOTSTRAP_OWNER_EMAIL`/`_PARTNER_EMAIL` (já usadas pelo
 * bootstrap do Bloco 17) para localizar exatamente os mesmos dois usuários
 * — nunca um e-mail novo, nunca inventado neste script.
 */
export class InitialPasswordsInputError extends Error {}

export interface InitialPasswordsInput {
  ownerEmail: string
  ownerPassword: string
  partnerEmail: string
  partnerPassword: string
}

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 255

function requireVar(env: NodeJS.ProcessEnv, name: string): string {
  const raw = env[name]
  if (raw === undefined || raw.trim() === '') {
    throw new InitialPasswordsInputError(`Variável obrigatória ausente ou vazia: ${name}.`)
  }
  return raw
}

function assertPasswordLength(name: string, value: string): void {
  if (value.length < MIN_PASSWORD_LENGTH || value.length > MAX_PASSWORD_LENGTH) {
    throw new InitialPasswordsInputError(`Variável ${name} precisa ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres.`)
  }
}

export function resolveInitialPasswordsInput(env: NodeJS.ProcessEnv): InitialPasswordsInput {
  const ownerEmail = requireVar(env, 'FINANHOUSE_BOOTSTRAP_OWNER_EMAIL').trim()
  const ownerPassword = requireVar(env, 'FINANHOUSE_INITIAL_PASSWORD_OWNER')
  const partnerEmail = requireVar(env, 'FINANHOUSE_BOOTSTRAP_PARTNER_EMAIL').trim()
  const partnerPassword = requireVar(env, 'FINANHOUSE_INITIAL_PASSWORD_PARTNER')

  assertPasswordLength('FINANHOUSE_INITIAL_PASSWORD_OWNER', ownerPassword)
  assertPasswordLength('FINANHOUSE_INITIAL_PASSWORD_PARTNER', partnerPassword)

  if (ownerEmail.toLowerCase() === partnerEmail.toLowerCase()) {
    throw new InitialPasswordsInputError('FINANHOUSE_BOOTSTRAP_OWNER_EMAIL e FINANHOUSE_BOOTSTRAP_PARTNER_EMAIL não podem ser o mesmo e-mail.')
  }
  if (ownerPassword === partnerPassword) {
    throw new InitialPasswordsInputError('FINANHOUSE_INITIAL_PASSWORD_OWNER e FINANHOUSE_INITIAL_PASSWORD_PARTNER não podem ser a mesma senha.')
  }

  return { ownerEmail, ownerPassword, partnerEmail, partnerPassword }
}
