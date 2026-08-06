import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { useAuth } from '../hooks/use-auth.ts'
import { AuthProvider } from './AuthProvider.tsx'

const BASE_URL = 'http://127.0.0.1:3000'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

interface RouteMap {
  [key: string]: (init: RequestInit) => Response | Promise<Response>
}

function createFetchMock(routes: RouteMap) {
  return vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    const parsed = new URL(String(url))
    const key = `${init.method ?? 'GET'} ${parsed.pathname}`
    const handler = routes[key]
    if (!handler) throw new Error(`Rota não mapeada no mock de teste: ${key}`)
    return handler(init)
  })
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

function strictWrapper({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <AuthProvider>{children}</AuthProvider>
    </StrictMode>
  )
}

const SESSION = { user: { id: 1, displayName: 'Dona da Casa', email: 'a@b.invalid' }, householdId: 10 }

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', BASE_URL)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('AuthProvider — carga inicial da sessão', () => {
  it('sessão existente (cookie válido) abre o sistema diretamente — vira "authenticated"', async () => {
    vi.stubGlobal('fetch', createFetchMock({ 'GET /api/v1/auth/session': () => jsonResponse({ data: SESSION }) }))

    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.state.status).toBe('loading')
    await waitFor(() => expect(result.current.state.status).toBe('authenticated'))

    if (result.current.state.status !== 'authenticated') throw new Error('esperado authenticated')
    expect(result.current.state.user.displayName).toBe('Dona da Casa')
    expect(result.current.state.householdId).toBe(10)
  })

  it('sem sessão (401) vira "unauthenticated" — nunca dados fictícios', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({ 'GET /api/v1/auth/session': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401) }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('unauthenticated'))

    if (result.current.state.status !== 'unauthenticated') throw new Error('esperado unauthenticated')
    expect(result.current.state.loginError).toBeNull()
  })

  it('falha de rede vira "error" explícito, distinto de "unauthenticated"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('error'))

    if (result.current.state.status !== 'error') throw new Error('esperado error')
    expect(result.current.state.error.kind).toBe('network')
  })

  it('retry() refaz a carga da sessão do zero', async () => {
    let attempt = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        attempt += 1
        if (attempt === 1) throw new TypeError('Failed to fetch')
        return jsonResponse({ data: SESSION })
      }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('error'))

    act(() => {
      result.current.retry()
    })
    await waitFor(() => expect(result.current.state.status).toBe('authenticated'))
  })
})

describe('AuthProvider — login', () => {
  it('login válido autentica e nunca expõe o token no estado', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/auth/session': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401),
        'POST /api/v1/auth/login': () => jsonResponse({ data: SESSION }),
      }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('unauthenticated'))

    act(() => {
      result.current.login('a@b.invalid', 'senha-123')
    })

    if (result.current.state.status !== 'unauthenticated') throw new Error('esperado unauthenticated ainda')
    expect(result.current.state.pendingLogin).toBe(true)

    await waitFor(() => expect(result.current.state.status).toBe('authenticated'))
    expect(JSON.stringify(result.current.state)).not.toContain('token')
  })

  it('login inválido mantém "unauthenticated" com mensagem genérica, sem revelar o motivo', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/auth/session': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401),
        'POST /api/v1/auth/login': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'E-mail ou senha inválidos.' } }, 401),
      }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('unauthenticated'))

    act(() => {
      result.current.login('a@b.invalid', 'senha-errada')
    })

    await waitFor(() => {
      if (result.current.state.status !== 'unauthenticated') throw new Error('esperado unauthenticated')
      expect(result.current.state.loginError).toBe('E-mail ou senha inválidos.')
    })
  })

  it('API indisponível durante o login vira erro separado de credenciais inválidas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init: RequestInit = {}) => {
        const path = new URL(String(url)).pathname
        if (path === '/api/v1/auth/session') return jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401)
        if (path === '/api/v1/auth/login' && init.method === 'POST') throw new TypeError('Failed to fetch')
        throw new Error(`rota inesperada: ${path}`)
      }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('unauthenticated'))

    act(() => {
      result.current.login('a@b.invalid', 'qualquer')
    })

    await waitFor(() => {
      if (result.current.state.status !== 'unauthenticated') throw new Error('esperado unauthenticated')
      expect(result.current.state.loginError).toBe('Não foi possível conectar ao FinanHouse. Verifique se a API local está em execução.')
    })
  })

  it('rate limit (429) durante o login vira uma mensagem do produto, nunca o texto técnico do Fastify', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/auth/session': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401),
        'POST /api/v1/auth/login': () => jsonResponse({ error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded, retry in 1 minute' } }, 429),
      }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('unauthenticated'))

    act(() => {
      result.current.login('a@b.invalid', 'qualquer')
    })

    await waitFor(() => {
      if (result.current.state.status !== 'unauthenticated') throw new Error('esperado unauthenticated')
      expect(result.current.state.loginError).toBe('Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.')
    })
  })

  it('impede duplo envio — um segundo login() enquanto o primeiro está pendente é ignorado', async () => {
    const pending: { resolve: (() => void) | null } = { resolve: null }
    const loginSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          pending.resolve = () => resolve(jsonResponse({ data: SESSION }))
        }),
    )
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/auth/session': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401),
        'POST /api/v1/auth/login': loginSpy,
      }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('unauthenticated'))

    act(() => {
      result.current.login('a@b.invalid', 'senha-1')
      result.current.login('a@b.invalid', 'senha-2')
    })

    expect(loginSpy).toHaveBeenCalledTimes(1)
    pending.resolve?.()
  })

  it('uma resposta atrasada da carga inicial (401) nunca sobrescreve um LOGIN_SUCCESS mais recente', async () => {
    let resolveSession: ((response: Response) => void) | null = null
    const sessionPending = new Promise<Response>((resolve) => {
      resolveSession = resolve
    })

    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/auth/session': () => sessionPending,
        'POST /api/v1/auth/login': () => jsonResponse({ data: SESSION }),
      }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    // A carga inicial (GET /auth/session) ainda está pendente — o estado permanece "loading".
    expect(result.current.state.status).toBe('loading')

    // O login começa (e conclui) ANTES da resposta antiga da carga inicial chegar.
    act(() => {
      result.current.login('a@b.invalid', 'senha-123')
    })
    await waitFor(() => expect(result.current.state.status).toBe('authenticated'))

    // Só agora a resposta antiga (401) da carga inicial finalmente chega.
    act(() => {
      resolveSession?.(jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401))
    })

    // O estado autenticado precisa permanecer — a resposta obsoleta nunca deve reverter para login.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.state.status).toBe('authenticated')
  })

  it('clearLoginError() limpa a mensagem de erro sem afetar mais nada', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/auth/session': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401),
        'POST /api/v1/auth/login': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'E-mail ou senha inválidos.' } }, 401),
      }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('unauthenticated'))

    act(() => result.current.login('a@b.invalid', 'errada'))
    await waitFor(() => {
      if (result.current.state.status !== 'unauthenticated') throw new Error('esperado unauthenticated')
      expect(result.current.state.loginError).not.toBeNull()
    })

    act(() => result.current.clearLoginError())
    if (result.current.state.status !== 'unauthenticated') throw new Error('esperado unauthenticated')
    expect(result.current.state.loginError).toBeNull()
  })
})

describe('AuthProvider — logout', () => {
  it('logout revoga a sessão e volta para "unauthenticated", limpando os dados do usuário', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/auth/session': () => jsonResponse({ data: SESSION }),
        'POST /api/v1/auth/logout': () => new Response(null, { status: 204 }),
      }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('authenticated'))

    act(() => result.current.logout())
    await waitFor(() => expect(result.current.state.status).toBe('unauthenticated'))
    expect(JSON.stringify(result.current.state)).not.toContain('Dona da Casa')
  })

  it('logout continua limpando o estado local mesmo se a chamada de API falhar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init: RequestInit = {}) => {
        const path = new URL(String(url)).pathname
        if (path === '/api/v1/auth/session') return jsonResponse({ data: SESSION })
        if (path === '/api/v1/auth/logout' && init.method === 'POST') throw new TypeError('Failed to fetch')
        throw new Error(`rota inesperada: ${path}`)
      }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('authenticated'))

    act(() => result.current.logout())
    await waitFor(() => expect(result.current.state.status).toBe('unauthenticated'))
  })
})

describe('AuthProvider — notifyUnauthenticated', () => {
  it('flipa imediatamente para "unauthenticated" quando chamada (ex.: 401 de outro provider)', async () => {
    vi.stubGlobal('fetch', createFetchMock({ 'GET /api/v1/auth/session': () => jsonResponse({ data: SESSION }) }))

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.state.status).toBe('authenticated'))

    act(() => result.current.notifyUnauthenticated())
    expect(result.current.state.status).toBe('unauthenticated')
  })
})

describe('AuthProvider — StrictMode', () => {
  it('em React.StrictMode, a carga da sessão termina em "authenticated" sem preso em loading', async () => {
    vi.stubGlobal('fetch', createFetchMock({ 'GET /api/v1/auth/session': () => jsonResponse({ data: SESSION }) }))

    const { result } = renderHook(() => useAuth(), { wrapper: strictWrapper })
    await waitFor(() => expect(result.current.state.status).toBe('authenticated'))
  })

  it('desmontagem real cancela a carga em andamento', () => {
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

    const { unmount } = renderHook(() => useAuth(), { wrapper })
    unmount()

    expect(signals.length).toBeGreaterThan(0)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })
})
