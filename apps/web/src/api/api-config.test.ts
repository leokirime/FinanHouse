import { describe, expect, it } from 'vitest'
import { ApiConfigError, resolveApiBaseConfig, resolveApiConfig } from './api-config.ts'

describe('resolveApiBaseConfig', () => {
  it('resolve a base URL, sem barra final', () => {
    expect(resolveApiBaseConfig({ VITE_API_BASE_URL: 'http://127.0.0.1:3000/' } as ImportMetaEnv)).toEqual({ baseUrl: 'http://127.0.0.1:3000' })
  })

  it('rejeita quando VITE_API_BASE_URL está ausente', () => {
    expect(() => resolveApiBaseConfig({} as ImportMetaEnv)).toThrow(ApiConfigError)
  })

  it('rejeita URL malformada', () => {
    expect(() => resolveApiBaseConfig({ VITE_API_BASE_URL: 'not-a-url' } as ImportMetaEnv)).toThrow(ApiConfigError)
  })

  it('rejeita protocolo diferente de http/https', () => {
    expect(() => resolveApiBaseConfig({ VITE_API_BASE_URL: 'ftp://127.0.0.1:3000' } as ImportMetaEnv)).toThrow(ApiConfigError)
  })

  it('VITE_API_BASE_URL vazia (mas presente) resolve para mesma origem — nunca lança', () => {
    expect(resolveApiBaseConfig({ VITE_API_BASE_URL: '' } as ImportMetaEnv)).toEqual({ baseUrl: '' })
  })

  it('VITE_API_BASE_URL só com espaços resolve para mesma origem, igual a vazia', () => {
    expect(resolveApiBaseConfig({ VITE_API_BASE_URL: '   ' } as ImportMetaEnv)).toEqual({ baseUrl: '' })
  })
})

describe('resolveApiConfig', () => {
  const env = { VITE_API_BASE_URL: 'http://127.0.0.1:3000' } as ImportMetaEnv

  it('combina a base URL com o householdId fornecido (nunca de env, Bloco 19/DT-14)', () => {
    expect(resolveApiConfig(3, env)).toEqual({ baseUrl: 'http://127.0.0.1:3000', householdId: 3 })
  })

  it('rejeita householdId zero, negativo, decimal ou não inteiro', () => {
    for (const value of [0, -1, 1.5, Number.NaN]) {
      expect(() => resolveApiConfig(value, env)).toThrow(ApiConfigError)
    }
  })

  it('propaga erro de base URL inválida mesmo com householdId válido', () => {
    expect(() => resolveApiConfig(3, { VITE_API_BASE_URL: 'not-a-url' } as ImportMetaEnv)).toThrow(ApiConfigError)
  })
})
