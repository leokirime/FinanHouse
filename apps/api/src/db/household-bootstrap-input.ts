/**
 * Leitura e validação das variáveis locais do bootstrap estrutural
 * (`FINANHOUSE_BOOTSTRAP_*`, `apps/api/.env.local`) — nunca imprime os
 * valores lidos, apenas o nome da variável em caso de erro.
 */
export class BootstrapInputError extends Error {}

export interface BootstrapInput {
  ownerName: string
  ownerEmail: string
  partnerName: string
  partnerEmail: string
  householdName: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 255

function requireVar(env: NodeJS.ProcessEnv, name: string): string {
  const raw = env[name]
  if (raw === undefined || raw.trim() === '') {
    throw new BootstrapInputError(`Variável obrigatória ausente ou vazia: ${name}.`)
  }
  return raw.trim()
}

function assertNameLength(name: string, value: string): void {
  if (value.length === 0 || value.length > MAX_NAME_LENGTH) {
    throw new BootstrapInputError(`Variável ${name} deve ter entre 1 e ${MAX_NAME_LENGTH} caracteres.`)
  }
}

function assertEmail(name: string, value: string): void {
  if (value.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(value)) {
    throw new BootstrapInputError(`Variável ${name} não é um e-mail válido.`)
  }
}

/**
 * Resolve as cinco variáveis obrigatórias do bootstrap a partir do
 * ambiente. `FINANHOUSE_BOOTSTRAP_PARTNER_EMAIL` foi adicionada além da
 * lista original do prompt do Bloco 17 porque `users.email` é `NOT NULL
 * UNIQUE` no schema (Bloco 03) — o segundo membro do household também
 * precisa de um usuário próprio, não apenas de um nome de exibição.
 */
export function resolveBootstrapInput(env: NodeJS.ProcessEnv): BootstrapInput {
  const ownerName = requireVar(env, 'FINANHOUSE_BOOTSTRAP_OWNER_NAME')
  const ownerEmail = requireVar(env, 'FINANHOUSE_BOOTSTRAP_OWNER_EMAIL')
  const partnerName = requireVar(env, 'FINANHOUSE_BOOTSTRAP_PARTNER_NAME')
  const partnerEmail = requireVar(env, 'FINANHOUSE_BOOTSTRAP_PARTNER_EMAIL')
  const householdName = requireVar(env, 'FINANHOUSE_BOOTSTRAP_HOUSEHOLD_NAME')

  assertNameLength('FINANHOUSE_BOOTSTRAP_OWNER_NAME', ownerName)
  assertEmail('FINANHOUSE_BOOTSTRAP_OWNER_EMAIL', ownerEmail)
  assertNameLength('FINANHOUSE_BOOTSTRAP_PARTNER_NAME', partnerName)
  assertEmail('FINANHOUSE_BOOTSTRAP_PARTNER_EMAIL', partnerEmail)
  assertNameLength('FINANHOUSE_BOOTSTRAP_HOUSEHOLD_NAME', householdName)

  if (ownerEmail.toLowerCase() === partnerEmail.toLowerCase()) {
    throw new BootstrapInputError('FINANHOUSE_BOOTSTRAP_OWNER_EMAIL e FINANHOUSE_BOOTSTRAP_PARTNER_EMAIL precisam ser diferentes.')
  }

  return { ownerName, ownerEmail, partnerName, partnerEmail, householdName }
}
