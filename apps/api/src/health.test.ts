import { describe, expect, it } from 'vitest'
import { getHealthStatus } from './health.js'

describe('getHealthStatus', () => {
  it('returns the expected health payload', () => {
    expect(getHealthStatus()).toEqual({ status: 'ok', service: 'finanhouse-api' })
  })
})
