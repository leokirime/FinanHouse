import { describe, expect, it } from 'vitest'
import { assertOriginsSafeForProduction, CorsConfigError, resolveCorsAllowedOrigins } from './cors-config.js'

describe('resolveCorsAllowedOrigins — development/test (permissivo)', () => {
  it('sem CORS_ALLOWED_ORIGINS, retorna as origens locais padrão do Vite', () => {
    expect(resolveCorsAllowedOrigins({}, 'development')).toEqual(['http://127.0.0.1:5173', 'http://localhost:5173'])
    expect(resolveCorsAllowedOrigins({}, 'test')).toEqual(['http://127.0.0.1:5173', 'http://localhost:5173'])
  })

  it('com CORS_ALLOWED_ORIGINS definido, usa a lista fornecida (mesmo fora de produção)', () => {
    const result = resolveCorsAllowedOrigins({ CORS_ALLOWED_ORIGINS: 'https://staging.housemanager.example' }, 'development')
    expect(result).toEqual(['https://staging.housemanager.example'])
  })

  it('aceita múltiplas origens separadas por vírgula, removendo espaços', () => {
    const result = resolveCorsAllowedOrigins(
      { CORS_ALLOWED_ORIGINS: ' https://a.example , https://b.example ' },
      'development',
    )
    expect(result).toEqual(['https://a.example', 'https://b.example'])
  })

  it('rejeita uma origem mal formada mesmo fora de produção', () => {
    expect(() => resolveCorsAllowedOrigins({ CORS_ALLOWED_ORIGINS: 'não-é-uma-url' }, 'development')).toThrow(CorsConfigError)
  })

  it('rejeita uma origem com path/query — precisa ser só protocolo+host', () => {
    expect(() => resolveCorsAllowedOrigins({ CORS_ALLOWED_ORIGINS: 'https://app.example/caminho' }, 'development')).toThrow(
      CorsConfigError,
    )
  })
})

describe('resolveCorsAllowedOrigins — production (fail closed)', () => {
  it('sem CORS_ALLOWED_ORIGINS, lança erro — nunca cai silenciosamente para localhost', () => {
    expect(() => resolveCorsAllowedOrigins({}, 'production')).toThrow(CorsConfigError)
  })

  it('CORS_ALLOWED_ORIGINS vazio (string em branco), lança erro', () => {
    expect(() => resolveCorsAllowedOrigins({ CORS_ALLOWED_ORIGINS: '   ' }, 'production')).toThrow(CorsConfigError)
  })

  it('CORS_ALLOWED_ORIGINS apontando para localhost:5173, lança erro', () => {
    expect(() => resolveCorsAllowedOrigins({ CORS_ALLOWED_ORIGINS: 'http://localhost:5173' }, 'production')).toThrow(
      CorsConfigError,
    )
  })

  it('CORS_ALLOWED_ORIGINS apontando para 127.0.0.1, lança erro', () => {
    expect(() => resolveCorsAllowedOrigins({ CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:3000' }, 'production')).toThrow(
      CorsConfigError,
    )
  })

  it('CORS_ALLOWED_ORIGINS com uma origem pública válida, retorna a origem', () => {
    const result = resolveCorsAllowedOrigins({ CORS_ALLOWED_ORIGINS: 'https://app.housemanager.example' }, 'production')
    expect(result).toEqual(['https://app.housemanager.example'])
  })

  it('mistura de origem pública válida e localhost — lança erro (nenhuma origem local permitida em produção)', () => {
    expect(() =>
      resolveCorsAllowedOrigins({ CORS_ALLOWED_ORIGINS: 'https://app.housemanager.example,http://localhost:5173' }, 'production'),
    ).toThrow(CorsConfigError)
  })
})

describe('assertOriginsSafeForProduction — usado como gate de defesa em profundidade (createHttpApp)', () => {
  it('lista vazia lança erro', () => {
    expect(() => assertOriginsSafeForProduction([])).toThrow(CorsConfigError)
  })

  it('origem localhost lança erro mesmo se a lista não veio de env (ex.: chamada direta de createHttpApp)', () => {
    expect(() => assertOriginsSafeForProduction(['http://localhost:5173'])).toThrow(CorsConfigError)
  })

  it('origem pública válida não lança', () => {
    expect(() => assertOriginsSafeForProduction(['https://app.housemanager.example'])).not.toThrow()
  })
})
