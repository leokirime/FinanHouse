import { describe, expect, it } from 'vitest'
import { HttpBindConfigError, resolveBindHost } from './http-bind-config.js'

describe('resolveBindHost — development/test (permissivo)', () => {
  it('sem HTTP_HOST, retorna 127.0.0.1 (padrão local existente)', () => {
    expect(resolveBindHost('development', {})).toBe('127.0.0.1')
    expect(resolveBindHost('test', {})).toBe('127.0.0.1')
  })

  it('com HTTP_HOST definido, usa o valor configurado mesmo fora de produção', () => {
    expect(resolveBindHost('development', { HTTP_HOST: '0.0.0.0' })).toBe('0.0.0.0')
  })
})

describe('resolveBindHost — production (fail closed)', () => {
  it('sem HTTP_HOST, lança erro — nunca cai silenciosamente para 127.0.0.1', () => {
    expect(() => resolveBindHost('production', {})).toThrow(HttpBindConfigError)
  })

  it('HTTP_HOST="127.0.0.1", lança erro — inacessível externamente', () => {
    expect(() => resolveBindHost('production', { HTTP_HOST: '127.0.0.1' })).toThrow(HttpBindConfigError)
  })

  it('HTTP_HOST="localhost", lança erro', () => {
    expect(() => resolveBindHost('production', { HTTP_HOST: 'localhost' })).toThrow(HttpBindConfigError)
  })

  it('HTTP_HOST="0.0.0.0" (padrão de container/PaaS), é aceito', () => {
    expect(resolveBindHost('production', { HTTP_HOST: '0.0.0.0' })).toBe('0.0.0.0')
  })

  it('HTTP_HOST com um host real fornecido pela plataforma, é aceito', () => {
    expect(resolveBindHost('production', { HTTP_HOST: '10.0.4.12' })).toBe('10.0.4.12')
  })

  it('HTTP_HOST em branco, lança erro (mesmo tratamento de ausente)', () => {
    expect(() => resolveBindHost('production', { HTTP_HOST: '   ' })).toThrow(HttpBindConfigError)
  })
})
