import { describe, expect, it } from 'vitest'
import { classifyDatabaseConnectionError } from './connection-error-classifier.js'

describe('classifyDatabaseConnectionError', () => {
  it('classifica DNS (ENOTFOUND) como transitório', () => {
    expect(classifyDatabaseConnectionError({ code: 'ENOTFOUND' })).toEqual({
      category: 'falha de resolução de DNS',
      code: 'ENOTFOUND',
      transient: true,
    })
  })

  it('classifica DNS (EAI_AGAIN) como transitório', () => {
    expect(classifyDatabaseConnectionError({ code: 'EAI_AGAIN' })).toMatchObject({
      category: 'falha de resolução de DNS',
      transient: true,
    })
  })

  it('classifica timeout (ETIMEDOUT) como transitório', () => {
    expect(classifyDatabaseConnectionError({ code: 'ETIMEDOUT' })).toEqual({
      category: 'tempo de conexão esgotado',
      code: 'ETIMEDOUT',
      transient: true,
    })
  })

  it('classifica conexão recusada (ECONNREFUSED) como transitório', () => {
    expect(classifyDatabaseConnectionError({ code: 'ECONNREFUSED' })).toEqual({
      category: 'conexão recusada',
      code: 'ECONNREFUSED',
      transient: true,
    })
  })

  it('classifica conexão resetada (ECONNRESET) como transitório', () => {
    expect(classifyDatabaseConnectionError({ code: 'ECONNRESET' })).toEqual({
      category: 'conexão resetada',
      code: 'ECONNRESET',
      transient: true,
    })
  })

  it('classifica credencial inválida (ER_ACCESS_DENIED_ERROR) como NÃO transitório', () => {
    expect(classifyDatabaseConnectionError({ code: 'ER_ACCESS_DENIED_ERROR' })).toEqual({
      category: 'autenticação recusada pelo servidor',
      code: 'ER_ACCESS_DENIED_ERROR',
      transient: false,
    })
  })

  it('classifica banco inexistente (ER_BAD_DB_ERROR) como NÃO transitório', () => {
    expect(classifyDatabaseConnectionError({ code: 'ER_BAD_DB_ERROR' })).toEqual({
      category: 'banco de dados inexistente',
      code: 'ER_BAD_DB_ERROR',
      transient: false,
    })
  })

  it('classifica TLS/certificado inválido como NÃO transitório', () => {
    expect(classifyDatabaseConnectionError({ code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' })).toEqual({
      category: 'incompatibilidade de TLS/certificado',
      code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      transient: false,
    })
  })

  it('classifica limite de conexões (ER_CON_COUNT_ERROR) como transitório', () => {
    expect(classifyDatabaseConnectionError({ code: 'ER_CON_COUNT_ERROR' })).toEqual({
      category: 'limite de conexões atingido',
      code: 'ER_CON_COUNT_ERROR',
      transient: true,
    })
  })

  it('classifica pool fechado pela mensagem, sem depender de code', () => {
    expect(classifyDatabaseConnectionError(new Error('Pool is closed.'))).toEqual({
      category: 'pool de conexões fechado',
      code: 'POOL_CLOSED',
      transient: false,
    })
  })

  it('classifica erro SQL estrutural (prefixo ER_ não mapeado) como NÃO transitório', () => {
    expect(classifyDatabaseConnectionError({ code: 'ER_PARSE_ERROR' })).toEqual({
      category: 'erro SQL',
      code: 'ER_PARSE_ERROR',
      transient: false,
    })
  })

  it('classifica erro sem code reconhecido como não classificado, NÃO transitório', () => {
    expect(classifyDatabaseConnectionError(new Error('algo totalmente inesperado'))).toEqual({
      category: 'erro de conexão não classificado',
      code: 'UNKNOWN',
      transient: false,
    })
  })

  it('nunca inclui a mensagem original no resultado, mesmo quando ela contém host/usuário', () => {
    const error = Object.assign(new Error('connect ECONNREFUSED minha-instancia-secreta.aivencloud.com:12345'), {
      code: 'ECONNREFUSED',
    })
    const result = classifyDatabaseConnectionError(error)
    expect(JSON.stringify(result)).not.toContain('aivencloud')
    expect(JSON.stringify(result)).not.toContain('12345')
  })
})
