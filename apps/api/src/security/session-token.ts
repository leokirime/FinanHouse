import { createHash, randomBytes } from 'node:crypto'

const TOKEN_BYTES = 32 // 256 bits de entropia — CSPRNG (crypto.randomBytes), nunca Math.random().

/**
 * Gera o token bruto de sessão — só existe em memória e no cookie `HttpOnly`
 * enviado ao cliente uma única vez (na criação). Nunca persistido; o banco
 * só recebe `hashSessionToken(token)` (ver DT-14).
 */
export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

/**
 * SHA-256 (rápido), deliberadamente diferente do Argon2id usado para senha:
 * o token já tem 256 bits de entropia própria — uma função de derivação cara
 * não agrega segurança aqui e custaria uma verificação lenta a cada
 * requisição autenticada (ver DT-14).
 */
export function hashSessionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}
