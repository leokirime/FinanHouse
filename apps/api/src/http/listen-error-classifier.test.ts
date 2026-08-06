import { describe, expect, it } from 'vitest'
import { classifyListenError } from './listen-error-classifier.js'

describe('classifyListenError', () => {
  it('classifica EADDRINUSE como porta já em uso', () => {
    expect(classifyListenError(Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' }))).toEqual({
      category: 'porta já em uso',
      code: 'EADDRINUSE',
    })
  })

  it('classifica EACCES como permissão negada', () => {
    expect(classifyListenError(Object.assign(new Error('listen EACCES'), { code: 'EACCES' }))).toEqual({
      category: 'permissão negada para abrir a porta',
      code: 'EACCES',
    })
  })

  it('classifica EADDRNOTAVAIL como endereço local indisponível', () => {
    expect(classifyListenError(Object.assign(new Error('listen EADDRNOTAVAIL'), { code: 'EADDRNOTAVAIL' }))).toEqual({
      category: 'endereço local indisponível',
      code: 'EADDRNOTAVAIL',
    })
  })

  it('classifica um erro sem code reconhecido como desconhecido — nunca como erro de banco de dados', () => {
    const result = classifyListenError(new Error('algo inesperado'))
    expect(result).toEqual({ category: 'erro desconhecido ao vincular o servidor HTTP', code: 'UNKNOWN' })
    expect(result.category).not.toContain('banco de dados')
  })
})
