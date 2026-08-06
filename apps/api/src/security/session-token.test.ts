import { describe, expect, it } from 'vitest'
import { generateSessionToken, hashSessionToken } from './session-token.js'

describe('generateSessionToken', () => {
  it('gera tokens diferentes a cada chamada', () => {
    const a = generateSessionToken()
    const b = generateSessionToken()
    expect(a).not.toBe(b)
  })

  it('gera um token com entropia suficiente (256 bits, base64url)', () => {
    const token = generateSessionToken()
    expect(token.length).toBeGreaterThanOrEqual(40)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('hashSessionToken', () => {
  it('produz um hash SHA-256 hexadecimal de 64 caracteres', () => {
    const hash = hashSessionToken('token-de-teste')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('é determinístico (mesmo token → mesmo hash)', () => {
    const token = generateSessionToken()
    expect(hashSessionToken(token)).toBe(hashSessionToken(token))
  })

  it('nunca é igual ao token bruto', () => {
    const token = generateSessionToken()
    expect(hashSessionToken(token)).not.toBe(token)
  })

  it('tokens diferentes produzem hashes diferentes', () => {
    const a = hashSessionToken(generateSessionToken())
    const b = hashSessionToken(generateSessionToken())
    expect(a).not.toBe(b)
  })
})
