import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AuthTestProvider } from '../state/test-support/AuthTestProvider.tsx'
import { useInstallmentPlanDetail } from './use-installment-plan-detail.ts'

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

describe('useInstallmentPlanDetail', () => {
  it('installmentPlanId null: status "idle", nenhuma requisição disparada', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useInstallmentPlanDetail(null), { wrapper: AuthTestProvider })

    expect(result.current.status).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('carrega o plano e as parcelas reais via GET .../installment-plans/:id', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/households/1/installment-plans/1': () => jsonResponse({ data: { plan: PLAN_DTO, installments: [INSTALLMENT_DTO] } }),
      }),
    )

    const { result } = renderHook(() => useInstallmentPlanDetail(1), { wrapper: AuthTestProvider })

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.plan?.description).toBe('Sofá')
    expect(result.current.installments).toHaveLength(1)
    expect(result.current.installments[0]?.installmentNumber).toBe(1)
  })

  it('plano de outro household (404) vira status "error" — mensagem sanitizada, sem detalhe interno', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/households/1/installment-plans/999': () => jsonResponse({ error: { code: 'NOT_FOUND', message: 'Parcelamento não encontrado.' } }, 404),
      }),
    )

    const { result } = renderHook(() => useInstallmentPlanDetail(999), { wrapper: AuthTestProvider })
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.message).toBe('Parcelamento não encontrado.')
    expect(result.current.plan).toBeNull()
  })

  it('trocar de installmentPlanId recarrega o novo plano', async () => {
    const OTHER_PLAN_DTO = { ...PLAN_DTO, id: 2, description: 'Geladeira' }
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/households/1/installment-plans/1': () => jsonResponse({ data: { plan: PLAN_DTO, installments: [INSTALLMENT_DTO] } }),
        'GET /api/v1/households/1/installment-plans/2': () => jsonResponse({ data: { plan: OTHER_PLAN_DTO, installments: [] } }),
      }),
    )

    const { result, rerender } = renderHook(({ id }) => useInstallmentPlanDetail(id), { wrapper: AuthTestProvider, initialProps: { id: 1 } })
    await waitFor(() => expect(result.current.plan?.description).toBe('Sofá'))

    rerender({ id: 2 })
    await waitFor(() => expect(result.current.plan?.description).toBe('Geladeira'))
    expect(result.current.installments).toEqual([])
  })
})
