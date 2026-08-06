import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { getCurrentReferenceMonth, getPreviousReferenceMonth } from '../utils/reference-month.ts'
import { useFinance } from '../hooks/use-finance.ts'
import { FinanceProvider } from './FinanceProvider.tsx'
import { AuthTestProvider } from './test-support/AuthTestProvider.tsx'

const HOUSEHOLD_ID = 1
const BASE_URL = 'http://127.0.0.1:3000'
const CURRENT_REFERENCE_MONTH = getCurrentReferenceMonth()
const PREVIOUS_REFERENCE_MONTH = getPreviousReferenceMonth(CURRENT_REFERENCE_MONTH)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const CATEGORY = { id: 3, householdId: HOUSEHOLD_ID, name: 'Moradia', entryType: 'expense', status: 'active' }
const OWNER_MEMBER = { id: 1, householdId: HOUSEHOLD_ID, userId: 10, role: 'owner', status: 'active' }
const CURRENT_PERIOD = { id: 7, householdId: HOUSEHOLD_ID, referenceMonth: CURRENT_REFERENCE_MONTH, status: 'open', closedAt: null, closedByUserId: null }
const PREVIOUS_PERIOD = { id: 6, householdId: HOUSEHOLD_ID, referenceMonth: PREVIOUS_REFERENCE_MONTH, status: 'closed', closedAt: '2026-01-01', closedByUserId: 1 }

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

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthTestProvider>
      <FinanceProvider>{children}</FinanceProvider>
    </AuthTestProvider>
  )
}

function strictWrapper({ children }: { children: ReactNode }) {
  return (
    <AuthTestProvider>
      <StrictMode>
        <FinanceProvider>{children}</FinanceProvider>
      </StrictMode>
    </AuthTestProvider>
  )
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', BASE_URL)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('FinanceProvider — carregamento inicial', () => {
  it('carrega categorias/membros/competências/movimentações reais e fica "ready"', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/households/1/categories': () => jsonResponse({ data: [CATEGORY] }),
        'GET /api/v1/households/1/members': () => jsonResponse({ data: [OWNER_MEMBER] }),
        'GET /api/v1/households/1/periods': () => jsonResponse({ data: [PREVIOUS_PERIOD, CURRENT_PERIOD] }),
        'GET /api/v1/households/1/entries': () => jsonResponse({ data: [] }),
      }),
    )

    const { result } = renderHook(() => useFinance(), { wrapper })

    expect(result.current.state.status).toBe('loading')
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    if (result.current.state.status !== 'ready') throw new Error('esperado ready')
    expect(result.current.state.categories).toEqual([CATEGORY])
    expect(result.current.state.currentPeriodId).toBe(CURRENT_PERIOD.id)
    expect(result.current.state.previousPeriodId).toBe(PREVIOUS_PERIOD.id)
    expect(result.current.state.entries).toEqual([])
  })

  it('cria a competência atual via PUT idempotente quando ela ainda não existe, sem duplicar', async () => {
    const putSpy = vi.fn(() => jsonResponse({ data: CURRENT_PERIOD }, 201))
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/households/1/categories': () => jsonResponse({ data: [CATEGORY] }),
        'GET /api/v1/households/1/members': () => jsonResponse({ data: [OWNER_MEMBER] }),
        'GET /api/v1/households/1/periods': () => jsonResponse({ data: [PREVIOUS_PERIOD] }),
        [`PUT /api/v1/households/1/periods/${CURRENT_REFERENCE_MONTH}`]: putSpy,
        'GET /api/v1/households/1/entries': () => jsonResponse({ data: [] }),
      }),
    )

    const { result } = renderHook(() => useFinance(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    expect(putSpy).toHaveBeenCalledTimes(1)
    if (result.current.state.status !== 'ready') throw new Error('esperado ready')
    expect(result.current.state.currentPeriodId).toBe(CURRENT_PERIOD.id)
    expect(result.current.state.periods.filter((period) => period.id === CURRENT_PERIOD.id)).toHaveLength(1)
  })

  it('previousPeriodId fica null quando a competência anterior ainda não existe (nunca cria automaticamente)', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/households/1/categories': () => jsonResponse({ data: [CATEGORY] }),
        'GET /api/v1/households/1/members': () => jsonResponse({ data: [OWNER_MEMBER] }),
        'GET /api/v1/households/1/periods': () => jsonResponse({ data: [CURRENT_PERIOD] }),
        'GET /api/v1/households/1/entries': () => jsonResponse({ data: [] }),
      }),
    )

    const { result } = renderHook(() => useFinance(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    if (result.current.state.status !== 'ready') throw new Error('esperado ready')
    expect(result.current.state.previousPeriodId).toBeNull()
  })
})

describe('FinanceProvider — indisponibilidade da API (sem fallback demonstrativo)', () => {
  it('API indisponível vira status "error" explícito — nunca dados fictícios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const { result } = renderHook(() => useFinance(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('error'))

    if (result.current.state.status !== 'error') throw new Error('esperado error')
    expect(result.current.state.error.kind).toBe('network')
    expect(result.current.state).not.toHaveProperty('entries')
  })

  it('RETRY refaz a carga do zero e recupera "ready" após a API voltar', async () => {
    // Cada ciclo de `loadAll()` chama /categories exatamente uma vez — usado
    // para contar CICLOS (não chamadas HTTP individuais, que disparam em
    // paralelo via Promise.all e não podem ser contadas uma a uma aqui).
    let loadCycle = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init: RequestInit = {}) => {
        const parsed = new URL(String(url))
        const key = `${init.method ?? 'GET'} ${parsed.pathname}`
        if (key === 'GET /api/v1/households/1/categories') loadCycle += 1
        if (loadCycle < 2) throw new TypeError('Failed to fetch')
        if (key === 'GET /api/v1/households/1/categories') return jsonResponse({ data: [CATEGORY] })
        if (key === 'GET /api/v1/households/1/members') return jsonResponse({ data: [OWNER_MEMBER] })
        if (key === 'GET /api/v1/households/1/periods') return jsonResponse({ data: [PREVIOUS_PERIOD, CURRENT_PERIOD] })
        if (key === 'GET /api/v1/households/1/entries') return jsonResponse({ data: [] })
        throw new Error(`rota inesperada: ${key}`)
      }),
    )

    const { result } = renderHook(() => useFinance(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('error'))

    act(() => {
      result.current.dispatch({ type: 'RETRY' })
    })
    await waitFor(() => expect(result.current.state.status).toBe('ready'))
  })
})

describe('FinanceProvider — mutações reais', () => {
  function successRoutes(extra: RouteMap = {}): RouteMap {
    return {
      'GET /api/v1/households/1/categories': () => jsonResponse({ data: [CATEGORY] }),
      'GET /api/v1/households/1/members': () => jsonResponse({ data: [OWNER_MEMBER] }),
      'GET /api/v1/households/1/periods': () => jsonResponse({ data: [PREVIOUS_PERIOD, CURRENT_PERIOD] }),
      ...extra,
    }
  }

  it('CREATE_ENTRY aguarda a resposta HTTP e recarrega as movimentações reais antes de concluir', async () => {
    const createdEntry = {
      id: 42,
      householdId: HOUSEHOLD_ID,
      periodId: CURRENT_PERIOD.id,
      categoryId: CATEGORY.id,
      responsibleMemberId: null,
      createdByUserId: OWNER_MEMBER.userId,
      entryType: 'expense',
      status: 'planned',
      description: 'Aluguel de teste',
      expectedAmount: '1000.00',
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    }

    let entriesCallCount = 0
    const fetchMock = createFetchMock(
      successRoutes({
        'GET /api/v1/households/1/entries': () => {
          entriesCallCount += 1
          return jsonResponse({ data: entriesCallCount === 1 ? [] : [createdEntry] })
        },
        'POST /api/v1/households/1/entries': () => jsonResponse({ data: createdEntry }, 201),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useFinance(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => {
      result.current.dispatch({
        type: 'CREATE_ENTRY',
        input: {
          entryType: 'expense',
          description: 'Aluguel de teste',
          categoryId: CATEGORY.id,
          expectedAmount: 100000n,
          initialStatus: 'planned',
          dueDate: null,
          responsibleMemberId: null,
          notes: null,
        },
      })
    })

    if (result.current.state.status !== 'ready') throw new Error('esperado ready')
    expect(result.current.state.pendingAction).toBe(true)

    await waitFor(() => {
      if (result.current.state.status !== 'ready') throw new Error('esperado ready')
      expect(result.current.state.pendingAction).toBe(false)
    })

    if (result.current.state.status !== 'ready') throw new Error('esperado ready')
    expect(result.current.state.entries).toHaveLength(1)
    expect(result.current.state.entries[0]?.description).toBe('Aluguel de teste')
    expect(result.current.state.actionError).toBeNull()
    expect(entriesCallCount).toBe(2)
  })

  it('mutação com falha da API vira actionError sanitizado — nunca lança exceção não tratada', async () => {
    const fetchMock = createFetchMock(
      successRoutes({
        'GET /api/v1/households/1/entries': () => jsonResponse({ data: [] }),
        'POST /api/v1/households/1/entries': () => jsonResponse({ error: { code: 'DOMAIN_RULE_REJECTED', message: 'Valor inválido' } }, 422),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useFinance(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    result.current.dispatch({
      type: 'CREATE_ENTRY',
      input: {
        entryType: 'expense',
        description: 'Deve falhar',
        categoryId: CATEGORY.id,
        expectedAmount: 0n,
        initialStatus: 'planned',
        dueDate: null,
        responsibleMemberId: null,
        notes: null,
      },
    })

    await waitFor(() => {
      if (result.current.state.status !== 'ready') throw new Error('esperado ready')
      expect(result.current.state.actionError).toBe('Valor inválido')
    })
  })

  it('ignora um segundo dispatch de mutação enquanto a primeira ainda está pendente (impede duplo envio)', async () => {
    const pending: { resolve: (() => void) | null } = { resolve: null }
    const postSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          pending.resolve = () => resolve(jsonResponse({ data: { ...CATEGORY, id: 99 } }, 201))
        }),
    )
    const fetchMock = createFetchMock(
      successRoutes({
        'GET /api/v1/households/1/entries': () => jsonResponse({ data: [] }),
        'POST /api/v1/households/1/entries': postSpy,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useFinance(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    const input = {
      entryType: 'expense' as const,
      description: 'Primeira',
      categoryId: CATEGORY.id,
      expectedAmount: 1000n,
      initialStatus: 'planned' as const,
      dueDate: null,
      responsibleMemberId: null,
      notes: null,
    }
    act(() => {
      result.current.dispatch({ type: 'CREATE_ENTRY', input })
      result.current.dispatch({ type: 'CREATE_ENTRY', input: { ...input, description: 'Segunda (deve ser ignorada)' } })
    })

    expect(postSpy).toHaveBeenCalledTimes(1)
    pending.resolve?.()
  })
})

describe('FinanceProvider loading lifecycle regressions', () => {
  it('em React.StrictMode, o cleanup da primeira execucao nao bloqueia a segunda carga e termina em "ready"', async () => {
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
        const key = `${init.method ?? 'GET'} ${parsed.pathname}${parsed.search}`
        if (key === 'GET /api/v1/households/1/categories') return abortableResponse(jsonResponse({ data: [CATEGORY] }), init)
        if (key === 'GET /api/v1/households/1/members') return abortableResponse(jsonResponse({ data: [OWNER_MEMBER] }), init)
        if (key === 'GET /api/v1/households/1/periods') return abortableResponse(jsonResponse({ data: [PREVIOUS_PERIOD, CURRENT_PERIOD] }), init)
        if (key === 'GET /api/v1/households/1/entries') return abortableResponse(jsonResponse({ data: [] }), init)
        throw new Error(`rota inesperada: ${key}`)
      }),
    )

    const { result } = renderHook(() => useFinance(), { wrapper: strictWrapper })
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    if (result.current.state.status !== 'ready') throw new Error('esperado ready')
    expect(result.current.state.categories).toEqual([CATEGORY])
  })

  it('requisicao cancelada por uma nova carga nao fica presa em "loading" nem vira erro visivel', async () => {
    let loadCycle = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string | URL, init: RequestInit = {}) => {
        const parsed = new URL(String(url))
        const key = `${init.method ?? 'GET'} ${parsed.pathname}${parsed.search}`
        if (key === 'GET /api/v1/households/1/categories') loadCycle += 1

        if (loadCycle === 1) {
          return new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
          })
        }

        if (key === 'GET /api/v1/households/1/categories') return Promise.resolve(jsonResponse({ data: [CATEGORY] }))
        if (key === 'GET /api/v1/households/1/members') return Promise.resolve(jsonResponse({ data: [OWNER_MEMBER] }))
        if (key === 'GET /api/v1/households/1/periods') return Promise.resolve(jsonResponse({ data: [PREVIOUS_PERIOD, CURRENT_PERIOD] }))
        if (key === 'GET /api/v1/households/1/entries') return Promise.resolve(jsonResponse({ data: [] }))
        return Promise.reject(new Error(`rota inesperada: ${key}`))
      }),
    )

    const { result } = renderHook(() => useFinance(), { wrapper })
    act(() => {
      result.current.dispatch({ type: 'RETRY' })
    })

    await waitFor(() => expect(result.current.state.status).toBe('ready'))
    expect(loadCycle).toBe(2)
  })

  it('execucao antiga nao sobrescreve a carga mais recente, mesmo se responder depois', async () => {
    const firstCategories = {
      resolve: null as ((response: Response) => void) | null,
    }
    const newestCategory = { ...CATEGORY, id: 4, name: 'Moradia atualizada' }
    let fetchCall = 0

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string | URL, init: RequestInit = {}) => {
        fetchCall += 1
        const call = fetchCall
        const parsed = new URL(String(url))
        const key = `${init.method ?? 'GET'} ${parsed.pathname}${parsed.search}`

        if (call === 1 && key === 'GET /api/v1/households/1/categories') {
          return new Promise<Response>((resolve) => {
            firstCategories.resolve = resolve
          })
        }

        if (call === 2 && key === 'GET /api/v1/households/1/members') return Promise.resolve(jsonResponse({ data: [OWNER_MEMBER] }))
        if (call === 3 && key === 'GET /api/v1/households/1/periods') return Promise.resolve(jsonResponse({ data: [PREVIOUS_PERIOD, CURRENT_PERIOD] }))
        if (call === 4 && key === 'GET /api/v1/households/1/categories') return Promise.resolve(jsonResponse({ data: [newestCategory] }))
        if (call === 5 && key === 'GET /api/v1/households/1/members') return Promise.resolve(jsonResponse({ data: [OWNER_MEMBER] }))
        if (call === 6 && key === 'GET /api/v1/households/1/periods') return Promise.resolve(jsonResponse({ data: [PREVIOUS_PERIOD, CURRENT_PERIOD] }))
        if (call === 7 && key === 'GET /api/v1/households/1/entries') return Promise.resolve(jsonResponse({ data: [] }))
        if (call === 8 && key === 'GET /api/v1/households/1/entries') return Promise.resolve(jsonResponse({ data: [] }))
        return Promise.reject(new Error(`rota inesperada na chamada ${call}: ${key}`))
      }),
    )

    const { result } = renderHook(() => useFinance(), { wrapper })
    act(() => {
      result.current.dispatch({ type: 'RETRY' })
    })
    await waitFor(() => expect(result.current.state.status).toBe('ready'))

    act(() => {
      firstCategories.resolve?.(jsonResponse({ data: [CATEGORY] }))
    })
    await waitFor(() => expect(fetchCall).toBe(8))

    if (result.current.state.status !== 'ready') throw new Error('esperado ready')
    expect(result.current.state.categories).toEqual([newestCategory])
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

    const { unmount } = renderHook(() => useFinance(), { wrapper })
    unmount()

    expect(signals.length).toBeGreaterThan(0)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })
})
