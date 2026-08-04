import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { usePeriodBudgets } from './use-period-budgets.ts'

const HOUSEHOLD_ID = 1
const BASE_URL = 'http://127.0.0.1:3000'
const REFERENCE_MONTH = '2026-07-01'
const OTHER_REFERENCE_MONTH = '2026-06-01'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const BUDGET = { id: 1, householdId: HOUSEHOLD_ID, periodId: 7, categoryId: 3, limitAmount: '2000.00' }

interface RouteMap {
  [key: string]: (init: RequestInit) => Response | Promise<Response>
}

function createFetchMock(routes: RouteMap) {
  return vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    const parsed = new URL(String(url))
    const key = `${init.method ?? 'GET'} ${parsed.pathname}${parsed.search}`
    const handler = routes[key]
    if (!handler) throw new Error(`Rota não mapeada no mock de teste: ${key}`)
    return handler(init)
  })
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', BASE_URL)
  vi.stubEnv('VITE_FINANHOUSE_HOUSEHOLD_ID', String(HOUSEHOLD_ID))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('usePeriodBudgets — carregamento', () => {
  it('não busca nada enquanto referenceMonth é null', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => usePeriodBudgets(null))

    expect(result.current.status).toBe('loading')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('carrega os limites reais da API e fica "ready"', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        [`GET /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets`]: () => jsonResponse({ data: [BUDGET] }),
      }),
    )

    const { result } = renderHook(() => usePeriodBudgets(REFERENCE_MONTH))

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.budgets).toHaveLength(1)
    expect(result.current.budgets[0]?.limitAmount).toBe(200000n)
  })

  it('API indisponível vira status "error" explícito — nunca dados fictícios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const { result } = renderHook(() => usePeriodBudgets(REFERENCE_MONTH))
    await waitFor(() => expect(result.current.status).toBe('error'))

    expect(result.current.error?.kind).toBe('network')
    expect(result.current.budgets).toEqual([])
  })

  it('trocar de competência recarrega os limites da nova competência', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        [`GET /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets`]: () => jsonResponse({ data: [BUDGET] }),
        [`GET /api/v1/households/1/periods/${OTHER_REFERENCE_MONTH}/budgets`]: () => jsonResponse({ data: [] }),
      }),
    )

    const { result, rerender } = renderHook(({ month }) => usePeriodBudgets(month), { initialProps: { month: REFERENCE_MONTH } })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.budgets).toHaveLength(1)

    rerender({ month: OTHER_REFERENCE_MONTH })
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
      expect(result.current.budgets).toHaveLength(0)
    })
  })
})

describe('usePeriodBudgets — mutações reais', () => {
  it('createOrUpdate persiste via PUT idempotente e recarrega a lista antes de concluir', async () => {
    let listCallCount = 0
    const fetchMock = createFetchMock({
      [`GET /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets`]: () => {
        listCallCount += 1
        return jsonResponse({ data: listCallCount === 1 ? [] : [BUDGET] })
      },
      [`PUT /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets/3`]: () => jsonResponse({ data: BUDGET }, 201),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => usePeriodBudgets(REFERENCE_MONTH))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => {
      result.current.createOrUpdate(3, 200000n)
    })

    expect(result.current.pendingAction).toBe(true)
    await waitFor(() => expect(result.current.pendingAction).toBe(false))

    expect(result.current.budgets).toHaveLength(1)
    expect(result.current.actionError).toBeNull()
    expect(result.current.mutationVersion).toBe(1)
    expect(listCallCount).toBe(2)
  })

  it('remove persiste via DELETE e recarrega a lista', async () => {
    let listCallCount = 0
    const fetchMock = createFetchMock({
      [`GET /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets`]: () => {
        listCallCount += 1
        return jsonResponse({ data: listCallCount === 1 ? [BUDGET] : [] })
      },
      [`DELETE /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets/3`]: () => new Response(null, { status: 204 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => usePeriodBudgets(REFERENCE_MONTH))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.budgets).toHaveLength(1)

    act(() => {
      result.current.remove(3)
    })

    await waitFor(() => expect(result.current.budgets).toHaveLength(0))
    expect(result.current.actionError).toBeNull()
    expect(result.current.mutationVersion).toBe(1)
  })

  it('mutação com falha da API vira actionError sanitizado — nunca lança exceção não tratada', async () => {
    const fetchMock = createFetchMock({
      [`GET /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets`]: () => jsonResponse({ data: [] }),
      [`PUT /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets/3`]: () =>
        jsonResponse({ error: { code: 'DOMAIN_RULE_REJECTED', message: 'Limite precisa ser positivo.' } }, 422),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => usePeriodBudgets(REFERENCE_MONTH))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => {
      result.current.createOrUpdate(3, 0n)
    })

    await waitFor(() => expect(result.current.actionError).toBe('Limite precisa ser positivo.'))
    expect(result.current.mutationVersion).toBe(1)
  })

  it('ignora uma segunda mutação enquanto a primeira ainda está pendente (impede duplo envio)', async () => {
    const pending: { resolve: (() => void) | null } = { resolve: null }
    const putSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          pending.resolve = () => resolve(jsonResponse({ data: BUDGET }, 201))
        }),
    )
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        [`GET /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets`]: () => jsonResponse({ data: [] }),
        [`PUT /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets/3`]: putSpy,
      }),
    )

    const { result } = renderHook(() => usePeriodBudgets(REFERENCE_MONTH))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    act(() => {
      result.current.createOrUpdate(3, 100000n)
      result.current.createOrUpdate(3, 999999n)
    })

    expect(putSpy).toHaveBeenCalledTimes(1)
    pending.resolve?.()
  })
})

describe('usePeriodBudgets — StrictMode e cancelamento', () => {
  it('em React.StrictMode, o cleanup da primeira execução não bloqueia a segunda carga e termina em "ready"', async () => {
    function abortableResponse(response: Response, init: RequestInit): Promise<Response> {
      return new Promise((resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
        queueMicrotask(() => {
          if (init.signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'))
            return
          }
          resolve(response)
        })
      })
    }

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string | URL, init: RequestInit = {}) => {
        const parsed = new URL(String(url))
        const key = `${init.method ?? 'GET'} ${parsed.pathname}`
        if (key === `GET /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets`) return abortableResponse(jsonResponse({ data: [BUDGET] }), init)
        throw new Error(`rota inesperada: ${key}`)
      }),
    )

    const { result } = renderHook(() => usePeriodBudgets(REFERENCE_MONTH), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.budgets).toHaveLength(1)
  })

  it('execução antiga não sobrescreve a carga mais recente, mesmo se responder depois', async () => {
    const firstLoad: { resolve: ((response: Response) => void) | null } = { resolve: null }
    const newestBudget = { ...BUDGET, limitAmount: '3000.00' }
    let call = 0

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string | URL, init: RequestInit = {}) => {
        call += 1
        const currentCall = call
        const parsed = new URL(String(url))
        const key = `${init.method ?? 'GET'} ${parsed.pathname}`
        if (key !== `GET /api/v1/households/1/periods/${REFERENCE_MONTH}/budgets`) return Promise.reject(new Error(`rota inesperada: ${key}`))

        if (currentCall === 1) {
          return new Promise<Response>((resolve) => {
            firstLoad.resolve = resolve
          })
        }
        return Promise.resolve(jsonResponse({ data: [newestBudget] }))
      }),
    )

    const { result } = renderHook(() => usePeriodBudgets(REFERENCE_MONTH))

    act(() => {
      result.current.retry()
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.budgets[0]?.limitAmount).toBe(300000n)

    act(() => {
      firstLoad.resolve?.(jsonResponse({ data: [BUDGET] }))
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.budgets[0]?.limitAmount).toBe(300000n)
  })

  it('desmontagem real cancela a carga em andamento antes que ela atualize estado depois do unmount', () => {
    const signals: AbortSignal[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string | URL, init: RequestInit = {}) => {
        if (init.signal) signals.push(init.signal)
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        })
      }),
    )

    const { unmount } = renderHook(() => usePeriodBudgets(REFERENCE_MONTH))
    unmount()

    expect(signals.length).toBeGreaterThan(0)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })
})
