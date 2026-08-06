import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password-hashing.js'

describe('hashPassword', () => {
  it('produz um hash Argon2id, nunca a senha em texto puro', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash).toMatch(/^\$argon2id\$/)
    expect(hash).not.toContain('correct horse battery staple')
  })

  it('produz hashes diferentes para a mesma senha (salt aleatório)', async () => {
    const a = await hashPassword('mesma-senha')
    const b = await hashPassword('mesma-senha')
    expect(a).not.toBe(b)
  })
})

describe('verifyPassword', () => {
  it('aprova a senha correta', async () => {
    const hash = await hashPassword('senha-valida-123')
    await expect(verifyPassword(hash, 'senha-valida-123')).resolves.toBe(true)
  })

  it('rejeita a senha incorreta', async () => {
    const hash = await hashPassword('senha-valida-123')
    await expect(verifyPassword(hash, 'senha-errada')).resolves.toBe(false)
  })

  it('nunca lança para um hash malformado — devolve false', async () => {
    await expect(verifyPassword('não-é-um-hash-argon2', 'qualquer-senha')).resolves.toBe(false)
  })
})
