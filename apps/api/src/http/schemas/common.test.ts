import { describe, expect, it } from 'vitest'
import { parseIdParam } from './common.js'

describe('parseIdParam', () => {
  it('converte uma string de dígitos válida para number', () => {
    expect(parseIdParam('42')).toBe(42)
  })

  it('lança RangeError para "0"', () => {
    expect(() => parseIdParam('0')).toThrow(RangeError)
  })

  it('lança RangeError para valor acima de Number.MAX_SAFE_INTEGER', () => {
    expect(() => parseIdParam('99999999999999999999')).toThrow(RangeError)
  })
})
