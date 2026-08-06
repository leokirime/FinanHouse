import { describe, expect, it } from 'vitest'
import { generateSyntheticAuthFixture } from './auth-smoke-fixture.js'

describe('generateSyntheticAuthFixture', () => {
  it('gera um e-mail no domínio reservado .invalid, nunca um domínio real', () => {
    const fixture = generateSyntheticAuthFixture()
    expect(fixture.email.endsWith('@bloco19.invalid')).toBe(true)
  })

  it('gera uma senha com no mínimo 8 caracteres', () => {
    const fixture = generateSyntheticAuthFixture()
    expect(fixture.password.length).toBeGreaterThanOrEqual(8)
  })

  it('gera valores diferentes a cada chamada (sem reuso entre execuções)', () => {
    const first = generateSyntheticAuthFixture()
    const second = generateSyntheticAuthFixture()
    expect(first.email).not.toBe(second.email)
    expect(first.password).not.toBe(second.password)
  })

  it('nunca gera um e-mail igual a um padrão de bootstrap real conhecido', () => {
    const fixture = generateSyntheticAuthFixture()
    expect(fixture.email).not.toContain('finanhouse.invalid')
    expect(fixture.email).not.toContain('bloco18')
    expect(fixture.email).not.toContain('bloco16')
  })
})
