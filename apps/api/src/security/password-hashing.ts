import { hash, verify } from '@node-rs/argon2'

/**
 * Hash/verificação de senha via Argon2id (`@node-rs/argon2`, bindings
 * nativos pré-compilados — sem toolchain de build, sem implementação própria
 * de criptografia, ver DT-14). Parâmetros padrão da biblioteca (Argon2id,
 * custo de memória/tempo adequados para autenticação interativa) — nunca
 * ajustados manualmente sem justificativa registrada.
 */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  return hash(plainTextPassword)
}

/**
 * Nunca lança para senha incorreta — devolve `false`. A resistência a
 * timing attack vem da própria implementação do Argon2id (tempo de
 * verificação não revela onde a senha diverge do hash).
 */
export async function verifyPassword(passwordHash: string, plainTextPassword: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plainTextPassword)
  } catch {
    return false
  }
}
