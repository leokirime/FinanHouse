import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './api-client.ts'
import { ApiError } from './api-errors.ts'

const config = { baseUrl: 'http://127.0.0.1:3000', householdId: 1 }

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('apiRequest', () => {
  it('usa a base URL e o método corretos, interpretando { data }', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 1 } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiRequest(config, '/api/v1/households/1/categories')

    expect(result).toEqual({ id: 1 })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('http://127.0.0.1:3000/api/v1/households/1/categories')
    expect(init.method).toBe('GET')
  })

  it('baseUrl vazia (mesma origem, via proxy do Vite) gera uma URL relativa', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 1 } }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest({ baseUrl: '' }, '/api/v1/auth/session')

    const [url] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/v1/auth/session')
  })

  it('serializa a query string, ignorando valores undefined', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest(config, '/api/v1/households/1/entries', { query: { periodId: 7, unused: undefined } })

    const [url] = fetchMock.mock.calls[0]!
    expect(url).toBe('http://127.0.0.1:3000/api/v1/households/1/entries?periodId=7')
  })

  it('envia o corpo como JSON com Content-Type quando body é fornecido', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 2 } }, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest(config, '/api/v1/households/1/entries', { method: 'POST', body: { description: 'Teste' } })

    const [, init] = fetchMock.mock.calls[0]!
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ description: 'Teste' }))
  })

  it('trata 204 como sucesso sem corpo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiRequest(config, '/api/v1/households/1/entries/1/mark-pending', { method: 'POST' })
    expect(result).toBeUndefined()
  })

  it('converte { error: { code, message } } em ApiError com o kind correspondente', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'Campo inválido' } }, { status: 400 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest(config, '/api/v1/households/1/entries', { method: 'POST', body: {} })).rejects.toMatchObject({
      kind: 'validation',
      code: 'VALIDATION_ERROR',
      message: 'Campo inválido',
      httpStatus: 400,
    })
  })

  it('mapeia DEPENDENCY_UNAVAILABLE (503) para kind dependency_unavailable, marcado como retryable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Banco indisponível' } }, { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    try {
      await apiRequest(config, '/health')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect((error as ApiError).isRetryable).toBe(true)
    }
  })

  it('resposta de erro em formato inesperado (sem error.code) vira unexpected_response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ oops: true }, { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest(config, '/health')).rejects.toMatchObject({ kind: 'unexpected_response' })
  })

  it('resposta de sucesso sem campo "data" vira unexpected_response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ notData: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest(config, '/health')).rejects.toMatchObject({ kind: 'unexpected_response' })
  })

  it('falha de rede (fetch rejeita) vira ApiError kind network', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest(config, '/health')).rejects.toMatchObject({ kind: 'network' })
  })

  it('cancelamento pelo AbortSignal externo vira ApiError kind cancelled', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockImplementation(() => {
      controller.abort()
      const error = new DOMException('Aborted', 'AbortError')
      return Promise.reject(error)
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest(config, '/health', { signal: controller.signal })).rejects.toMatchObject({ kind: 'cancelled' })
  })

  it('timeout interno (sem sinal externo abortado) vira ApiError kind timeout', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()

    const promise = apiRequest(config, '/health')
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'timeout' })
    await vi.advanceTimersByTimeAsync(10_001)
    await assertion
  })
})
