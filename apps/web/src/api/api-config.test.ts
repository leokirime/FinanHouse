import { describe, expect, it } from 'vitest'
import { ApiConfigError, resolveApiConfig } from './api-config.ts'

const VALID_ENV = { VITE_API_BASE_URL: 'http://127.0.0.1:3000', VITE_FINANHOUSE_HOUSEHOLD_ID: '3' } as ImportMetaEnv

describe('resolveApiConfig', () => {
  it('resolve base URL (sem barra final) e householdId numérico', () => {
    const config = resolveApiConfig({ VITE_API_BASE_URL: 'http://127.0.0.1:3000/', VITE_FINANHOUSE_HOUSEHOLD_ID: '3' } as ImportMetaEnv)
    expect(config).toEqual({ baseUrl: 'http://127.0.0.1:3000', householdId: 3 })
  })

  it('rejeita quando VITE_API_BASE_URL está ausente', () => {
    expect(() => resolveApiConfig({ VITE_FINANHOUSE_HOUSEHOLD_ID: '3' } as ImportMetaEnv)).toThrow(ApiConfigError)
  })

  it('rejeita URL malformada', () => {
    expect(() => resolveApiConfig({ ...VALID_ENV, VITE_API_BASE_URL: 'not-a-url' } as ImportMetaEnv)).toThrow(ApiConfigError)
  })

  it('rejeita protocolo diferente de http/https', () => {
    expect(() => resolveApiConfig({ ...VALID_ENV, VITE_API_BASE_URL: 'ftp://127.0.0.1:3000' } as ImportMetaEnv)).toThrow(ApiConfigError)
  })

  it('rejeita quando VITE_FINANHOUSE_HOUSEHOLD_ID está ausente', () => {
    expect(() => resolveApiConfig({ VITE_API_BASE_URL: 'http://127.0.0.1:3000' } as ImportMetaEnv)).toThrow(ApiConfigError)
  })

  it('rejeita household ID não numérico, zero, negativo ou decimal', () => {
    for (const value of ['abc', '0', '-1', '1.5']) {
      expect(() => resolveApiConfig({ ...VALID_ENV, VITE_FINANHOUSE_HOUSEHOLD_ID: value } as ImportMetaEnv)).toThrow(ApiConfigError)
    }
  })
})
