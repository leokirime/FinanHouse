import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AuthTestProvider } from '../state/test-support/AuthTestProvider.tsx'
import { useInstallmentPlans } from './use-installment-plans.ts'

const HOUSEHOLD_ID = 1
const BASE_URL = 'http://127.0.0.1:3000'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const PLAN_DTO = {
  id: 1,
  householdId: HOUSEHOLD_ID,
  description: 'Sofá',
  categoryId: 3,
  totalAmount: '3000.00',
  installmentCount: 10,
  firstReferenceMonth: '2026-08-01',
  dueDay: 10,
  createdByUserId: 100,
  createdAt: '2026-08-24T10:00:00.000Z',
}

const INSTALLMENT_DTO = {
  id: 50,
  householdId: HOUSEHOLD_ID,
  periodId: 7,
  categoryId: 3,
  responsibleMemberId: null,
  createdByUserId: 100,
  entryType: 'expense',
  status: 'planned',
  description: 'Sofá 1/10',
  expectedAmount: '300.00',
  actualAmount: null,
  dueDate: '2026-08-10',
  realizationDate: null,
  notes: null,
  installmentPlanId: 1,
  installmentNumber: 1,
}

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
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('useInstallmentPlans — carregamento', () => {
  it('carrega a lista real da API e fica "ready"', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [PLAN_DTO] }),
      }),
    )

    const { result } = renderHook(() => useInstallmentPlans(), { wrapper: AuthTestProvider })

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.plans).toHaveLength(1)
    expect(result.current.plans[0]?.description).toBe('Sofá')
    expect(result.current.plans[0]?.totalAmount).toBe(300000n)
  })

  it('lista vazia — nenhum dado fictício, plans fica [] (estado vazio real)', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }),
      }),
    )

    const { result } = renderHook(() => useInstallmentPlans(), { wrapper: AuthTestProvider })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.plans).toEqual([])
  })

  it('API indisponível vira status "error" explícito — nunca dados fictícios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const { result } = renderHook(() => useInstallmentPlans(), { wrapper: AuthTestProvider })
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.kind).toBe('network')
    expect(result.current.plans).toEqual([])
  })
})

describe('useInstallmentPlans — criação', () => {
  it('cria via POST real, atualiza a lista e expõe o resultado real (plano + parcelas) em lastCreated', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }),
        'POST /api/v1/households/1/installment-plans': () => jsonResponse({ data: { plan: PLAN_DTO, installments: [INSTALLMENT_DTO] } }, 201),
      }),
    )

    const { result } = renderHook(() => useInstallmentPlans(), { wrapper: AuthTestProvider })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    result.current.create({
      description: 'Sofá',
      categoryId: 3,
      totalAmount: 300000n,
      installmentCount: 10,
      firstReferenceMonth: '2026-08-01',
      dueDay: 10,
    })

    await waitFor(() => expect(result.current.mutationVersion).toBe(1))
    expect(result.current.pendingAction).toBe(false)
    expect(result.current.actionError).toBeNull()
    expect(result.current.lastCreated?.plan.description).toBe('Sofá')
    expect(result.current.lastCreated?.installments).toHaveLength(1)
  })

  it('bloqueia duplo envio — uma segunda chamada de create() enquanto pendingAction é true não dispara outro fetch', async () => {
    let resolvePost!: (value: Response) => void
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve
    })
    const postMock = vi.fn(() => postPromise)

    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }),
        'POST /api/v1/households/1/installment-plans': postMock,
      }),
    )

    const { result } = renderHook(() => useInstallmentPlans(), { wrapper: AuthTestProvider })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    const input = { description: 'Sofá', categoryId: 3, totalAmount: 300000n, installmentCount: 10, firstReferenceMonth: '2026-08-01', dueDay: 10 }
    result.current.create(input)
    await waitFor(() => expect(result.current.pendingAction).toBe(true))
    result.current.create(input)

    expect(postMock).toHaveBeenCalledTimes(1)
    resolvePost(jsonResponse({ data: { plan: PLAN_DTO, installments: [INSTALLMENT_DTO] } }, 201))
    await waitFor(() => expect(result.current.pendingAction).toBe(false))
  })

  it('falha na criação vira actionError sanitizado — plans/lastCreated preservados sem dado inventado', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/households/1/installment-plans': () => jsonResponse({ data: [] }),
        'POST /api/v1/households/1/installment-plans': () =>
          jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'Categoria inválida para este household.' } }, 400),
      }),
    )

    const { result } = renderHook(() => useInstallmentPlans(), { wrapper: AuthTestProvider })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    result.current.create({ description: 'Sofá', categoryId: 999, totalAmount: 300000n, installmentCount: 10, firstReferenceMonth: '2026-08-01', dueDay: 10 })

    await waitFor(() => expect(result.current.actionError).not.toBeNull())
    expect(result.current.actionError).toBe('Categoria inválida para este household.')
    expect(result.current.lastCreated).toBeNull()
    expect(result.current.plans).toEqual([])
  })
})
