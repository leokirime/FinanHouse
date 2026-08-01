import { describe, expect, it } from 'vitest'
import { categorizeConnectionError } from './sanitize-error.js'

describe('categorizeConnectionError', () => {
  it('classifica erro de autenticação', () => {
    expect(categorizeConnectionError('Access denied for user')).toBe('autenticação recusada pelo servidor')
  })

  it('classifica banco inexistente', () => {
    expect(categorizeConnectionError('Unknown database finanhouse_dev')).toBe('banco de dados inexistente')
  })

  it('classifica host inacessível (ECONNREFUSED)', () => {
    expect(categorizeConnectionError('connect ECONNREFUSED 10.0.0.1:3306')).toBe('host inacessível')
  })

  it('classifica host inacessível (ENOTFOUND)', () => {
    expect(categorizeConnectionError('getaddrinfo ENOTFOUND minha-instancia.aivencloud.com')).toBe('host inacessível')
  })

  it('classifica host inacessível (EHOSTUNREACH)', () => {
    expect(categorizeConnectionError('connect EHOSTUNREACH 10.0.0.1')).toBe('host inacessível')
  })

  it('classifica tempo de conexão esgotado', () => {
    expect(categorizeConnectionError('connect ETIMEDOUT')).toBe('tempo de conexão esgotado')
  })

  it('classifica incompatibilidade de TLS/SSL', () => {
    expect(categorizeConnectionError('unable to verify the first certificate')).toBe('incompatibilidade de TLS/SSL')
  })

  it('classifica erro não reconhecido como não classificado', () => {
    expect(categorizeConnectionError('algo totalmente inesperado aconteceu')).toBe('erro de banco de dados não classificado')
  })

  it('nunca ecoa a mensagem original de host/credenciais no resultado', () => {
    const result = categorizeConnectionError('connect ECONNREFUSED minha-instancia-secreta.aivencloud.com:12345')
    expect(result).not.toContain('aivencloud')
    expect(result).not.toContain('12345')
  })
})
