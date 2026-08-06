import { describe, expect, it } from 'vitest'
import { formatStartupFailureMessage } from './startup-diagnostics.js'

describe('formatStartupFailureMessage', () => {
  it('inclui etapa, categoria e código em modo normal', () => {
    const message = formatStartupFailureMessage(
      'conexão inicial com o banco',
      { category: 'tempo de conexão esgotado', code: 'ETIMEDOUT' },
      new Error('irrelevante'),
      false,
    )

    expect(message).toContain('Falha ao iniciar o servidor HTTP.')
    expect(message).toContain('Etapa: conexão inicial com o banco')
    expect(message).toContain('Categoria: tempo de conexão esgotado')
    expect(message).toContain('Código: ETIMEDOUT')
  })

  it('nunca inclui stack em modo normal (debugEnabled=false)', () => {
    const error = new Error('connect ECONNREFUSED minha-instancia-secreta.aivencloud.com:12345')
    const message = formatStartupFailureMessage('conexão inicial com o banco', { category: 'conexão recusada', code: 'ECONNREFUSED' }, error, false)

    expect(message).not.toContain('aivencloud')
    expect(message).not.toContain('12345')
    expect(message).not.toContain('Stack')
  })

  it('em modo debug, inclui quadros de pilha mas nunca a primeira linha (nome + mensagem original)', () => {
    const error = new Error('connect ECONNREFUSED minha-instancia-secreta.aivencloud.com:12345')
    const message = formatStartupFailureMessage('conexão inicial com o banco', { category: 'conexão recusada', code: 'ECONNREFUSED' }, error, true)

    expect(message).not.toContain('aivencloud')
    expect(message).not.toContain('12345')
    expect(message).not.toContain('minha-instancia-secreta')
  })

  it('nunca lança quando o erro não é uma instância de Error (ex.: string bruta)', () => {
    expect(() =>
      formatStartupFailureMessage('vinculação da porta HTTP', { category: 'porta já em uso', code: 'EADDRINUSE' }, 'algo não-Error', true),
    ).not.toThrow()
  })

  it('distingue claramente a etapa de banco da etapa de vinculação de porta', () => {
    const dbMessage = formatStartupFailureMessage('conexão inicial com o banco', { category: 'x', code: 'Y' }, new Error('e'), false)
    const listenMessage = formatStartupFailureMessage('vinculação da porta HTTP', { category: 'porta já em uso', code: 'EADDRINUSE' }, new Error('e'), false)

    expect(dbMessage).toContain('Etapa: conexão inicial com o banco')
    expect(listenMessage).toContain('Etapa: vinculação da porta HTTP')
    expect(listenMessage).not.toContain('banco')
  })
})
