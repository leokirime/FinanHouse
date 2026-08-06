import { randomBytes } from 'node:crypto'

export interface SyntheticAuthFixture {
  email: string
  password: string
}

/**
 * Gera credenciais sintéticas em memória para o smoke-test de autenticação
 * (`db-smoke-auth-sessions.ts`) — nunca vêm de `.env.local`, nunca são
 * impressas, existem só durante a execução da transação sintética. O e-mail
 * usa o TLD reservado `.invalid` (RFC 2606, mesmo padrão já usado pelos
 * smoke-tests dos Blocos 16/18) para nunca colidir com um domínio real; a
 * senha tem entropia suficiente para nunca coincidir com nenhuma senha real
 * configurada por `db-configure-initial-passwords.ts`.
 */
export function generateSyntheticAuthFixture(): SyntheticAuthFixture {
  const suffix = randomBytes(12).toString('hex')
  return {
    email: `smoke-auth-${suffix}@bloco19.invalid`,
    password: `Smoke-Auth-${randomBytes(16).toString('hex')}`,
  }
}
