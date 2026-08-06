import { describe, expect, it, vi } from 'vitest'
import { connectWithRetry } from './connect-with-retry.js'

function transientError(code: string): Error {
  return Object.assign(new Error('erro de teste'), { code })
}

function nonTransientError(code: string): Error {
  return Object.assign(new Error('erro de teste'), { code })
}

describe('connectWithRetry', () => {
  it('sucesso na primeira tentativa: chama attempt() uma única vez', async () => {
    const attempt = vi.fn().mockResolvedValue(undefined)
    const delay = vi.fn().mockResolvedValue(undefined)

    const result = await connectWithRetry(attempt, { delay })

    expect(result).toEqual({ ok: true, attempts: 1 })
    expect(attempt).toHaveBeenCalledTimes(1)
    expect(delay).not.toHaveBeenCalled()
  })

  it('erro transitório seguido de sucesso: tenta de novo e conclui na segunda tentativa', async () => {
    const attempt = vi.fn().mockRejectedValueOnce(transientError('ETIMEDOUT')).mockResolvedValueOnce(undefined)
    const delay = vi.fn().mockResolvedValue(undefined)

    const result = await connectWithRetry(attempt, { delay })

    expect(result).toEqual({ ok: true, attempts: 2 })
    expect(attempt).toHaveBeenCalledTimes(2)
    expect(delay).toHaveBeenCalledTimes(1)
    expect(delay).toHaveBeenCalledWith(500)
  })

  it('erro transitório persistente: esgota o número máximo de tentativas e reporta o último erro', async () => {
    const attempt = vi.fn().mockRejectedValue(transientError('ECONNRESET'))
    const delay = vi.fn().mockResolvedValue(undefined)

    const result = await connectWithRetry(attempt, { delay })

    expect(attempt).toHaveBeenCalledTimes(3)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.attempts).toBe(3)
      expect(result.classification).toEqual({ category: 'conexão resetada', code: 'ECONNRESET', transient: true })
    }
  })

  it('usa os atrasos progressivos padrão (500ms, 1s, 2s) entre tentativas', async () => {
    const attempt = vi.fn().mockRejectedValue(transientError('ETIMEDOUT'))
    const delay = vi.fn().mockResolvedValue(undefined)

    await connectWithRetry(attempt, { delay })

    expect(delay.mock.calls.map((call) => call[0])).toEqual([500, 1000])
  })

  it('credencial inválida: NUNCA repete, falha já na primeira tentativa', async () => {
    const attempt = vi.fn().mockRejectedValue(nonTransientError('ER_ACCESS_DENIED_ERROR'))
    const delay = vi.fn().mockResolvedValue(undefined)

    const result = await connectWithRetry(attempt, { delay })

    expect(attempt).toHaveBeenCalledTimes(1)
    expect(delay).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.classification.category).toBe('autenticação recusada pelo servidor')
    }
  })

  it('TLS/certificado inválido: NUNCA repete', async () => {
    const attempt = vi.fn().mockRejectedValue(nonTransientError('UNABLE_TO_VERIFY_LEAF_SIGNATURE'))
    const delay = vi.fn().mockResolvedValue(undefined)

    const result = await connectWithRetry(attempt, { delay })

    expect(attempt).toHaveBeenCalledTimes(1)
    expect(delay).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
  })

  it('respeita maxAttempts customizado', async () => {
    const attempt = vi.fn().mockRejectedValue(transientError('ETIMEDOUT'))
    const delay = vi.fn().mockResolvedValue(undefined)

    const result = await connectWithRetry(attempt, { delay, maxAttempts: 1 })

    expect(attempt).toHaveBeenCalledTimes(1)
    expect(delay).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
  })

  it('nunca usa um timer real: o delay injetado é a única fonte de espera', async () => {
    const attempt = vi.fn().mockRejectedValueOnce(transientError('ETIMEDOUT')).mockResolvedValueOnce(undefined)
    let delayCalled = false
    const delay = vi.fn().mockImplementation(async () => {
      delayCalled = true
    })

    const start = Date.now()
    await connectWithRetry(attempt, { delay })
    const elapsedMs = Date.now() - start

    expect(delayCalled).toBe(true)
    expect(elapsedMs).toBeLessThan(100)
  })
})
