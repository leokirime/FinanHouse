import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from './test-utils.tsx'
import { MemoryRouter } from 'react-router'
import { StrictMode } from 'react'
import { getCurrentReferenceMonth } from './utils/reference-month.ts'
import { AppRoot } from './AppRoot.tsx'
import { AuthProvider } from './state/AuthProvider.tsx'

const BASE_URL = 'http://127.0.0.1:3000'
const HOUSEHOLD_ID = 10
const CURRENT_REFERENCE_MONTH = getCurrentReferenceMonth()

const SESSION = { user: { id: 1, displayName: 'Dona da Casa', email: 'owner@finanhouse.invalid' }, householdId: HOUSEHOLD_ID }
const CATEGORY = { id: 3, householdId: HOUSEHOLD_ID, name: 'Moradia', entryType: 'expense', status: 'active' }
const OWNER_MEMBER = { id: 1, householdId: HOUSEHOLD_ID, userId: 1, role: 'owner', status: 'active' }
const CURRENT_PERIOD = { id: 7, householdId: HOUSEHOLD_ID, referenceMonth: CURRENT_REFERENCE_MONTH, status: 'open', closedAt: null, closedByUserId: null }

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

function authenticatedFinanceRoutes(): RouteMap {
  return {
    [`GET /api/v1/households/${HOUSEHOLD_ID}/categories`]: () => jsonResponse({ data: [CATEGORY] }),
    [`GET /api/v1/households/${HOUSEHOLD_ID}/members`]: () => jsonResponse({ data: [OWNER_MEMBER] }),
    [`GET /api/v1/households/${HOUSEHOLD_ID}/periods`]: () => jsonResponse({ data: [CURRENT_PERIOD] }),
    [`GET /api/v1/households/${HOUSEHOLD_ID}/entries`]: () => jsonResponse({ data: [] }),
  }
}

function renderApp(wrapWithStrictMode = false) {
  const tree = (
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </MemoryRouter>
  )
  return render(wrapWithStrictMode ? <StrictMode>{tree}</StrictMode> : tree)
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', BASE_URL)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('AppRoot — fluxo completo de autenticação', () => {
  it('sem sessão, mostra a tela de login (nunca o dashboard)', async () => {
    vi.stubGlobal('fetch', createFetchMock({ 'GET /api/v1/auth/session': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401) }))
    renderApp()

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Entrar no Finanhouse' })).toBeTruthy())
    expect(screen.queryByText('Receitas realizadas')).toBeNull()
  })

  it('login válido carrega a sessão e depois o Dashboard com dados reais', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/auth/session': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401),
        'POST /api/v1/auth/login': () => jsonResponse({ data: SESSION }),
        ...authenticatedFinanceRoutes(),
      }),
    )
    renderApp()

    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'owner@finanhouse.invalid' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-correta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByText('Receitas realizadas')).toBeTruthy())
    expect(screen.getByText('Dona da Casa')).toBeTruthy()
  })

  it('usuário inválido recebe erro genérico e continua na tela de login', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/auth/session': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401),
        'POST /api/v1/auth/login': () => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'E-mail ou senha inválidos.' } }, 401),
      }),
    )
    renderApp()

    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ninguem@finanhouse.invalid' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'qualquer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('E-mail ou senha inválidos.'))
    expect(screen.getByRole('heading', { name: 'Entrar no Finanhouse' })).toBeTruthy()
  })

  it('sessão já autenticada abre o sistema diretamente, sem passar pela tela de login', async () => {
    vi.stubGlobal('fetch', createFetchMock({ 'GET /api/v1/auth/session': () => jsonResponse({ data: SESSION }), ...authenticatedFinanceRoutes() }))
    renderApp()

    await waitFor(() => expect(screen.getByText('Receitas realizadas')).toBeTruthy())
    expect(screen.queryByRole('heading', { name: 'Entrar no Finanhouse' })).toBeNull()
  })

  it('logout limpa os dados financeiros e volta para a tela de login', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        'GET /api/v1/auth/session': () => jsonResponse({ data: SESSION }),
        'POST /api/v1/auth/logout': () => new Response(null, { status: 204 }),
        ...authenticatedFinanceRoutes(),
      }),
    )
    renderApp()

    await waitFor(() => expect(screen.getByText('Receitas realizadas')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Entrar no Finanhouse' })).toBeTruthy())
    expect(screen.queryByText('Dona da Casa')).toBeNull()
    expect(screen.queryByText('Receitas realizadas')).toBeNull()
  })

  it('recarregar a página (nova sessão do AuthProvider) após logout continua exigindo login', async () => {
    let loggedOut = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init: RequestInit = {}) => {
        const path = new URL(String(url)).pathname
        const method = init.method ?? 'GET'
        if (path === '/api/v1/auth/session') return loggedOut ? jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401) : jsonResponse({ data: SESSION })
        if (path === '/api/v1/auth/logout' && method === 'POST') {
          loggedOut = true
          return new Response(null, { status: 204 })
        }
        const routes = authenticatedFinanceRoutes()
        const handler = routes[`${method} ${path}`]
        if (handler) return handler(init)
        throw new Error(`rota inesperada: ${method} ${path}`)
      }),
    )
    const first = renderApp()

    await waitFor(() => expect(screen.getByText('Receitas realizadas')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Entrar no Finanhouse' })).toBeTruthy())
    first.unmount()

    // "Recarregar" simulado remontando a árvore — uma nova checagem de sessão deve continuar 401.
    const rerendered = render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <AppRoot />
        </AuthProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(rerendered.getByRole('heading', { name: 'Entrar no Finanhouse' })).toBeTruthy())
  })

  it('nenhum token de sessão aparece em localStorage ou sessionStorage em nenhum momento', async () => {
    vi.stubGlobal('fetch', createFetchMock({ 'GET /api/v1/auth/session': () => jsonResponse({ data: SESSION }), ...authenticatedFinanceRoutes() }))
    renderApp()

    await waitFor(() => expect(screen.getByText('Receitas realizadas')).toBeTruthy())
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('React.StrictMode: fluxo completo (sessão + carga financeira) termina em "ready", sem preso em loading', async () => {
    vi.stubGlobal('fetch', createFetchMock({ 'GET /api/v1/auth/session': () => jsonResponse({ data: SESSION }), ...authenticatedFinanceRoutes() }))
    renderApp(true)

    await waitFor(() => expect(screen.getByText('Receitas realizadas')).toBeTruthy())
  })

  it('401 no meio da sessão (ex.: expiração) redireciona de volta para o login', async () => {
    let sessionCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init: RequestInit = {}) => {
        const path = new URL(String(url)).pathname
        const method = init.method ?? 'GET'
        if (path === '/api/v1/auth/session') {
          sessionCalls += 1
          return jsonResponse({ data: SESSION })
        }
        if (path === `/api/v1/households/${HOUSEHOLD_ID}/categories`) {
          return jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão expirada ou revogada.' } }, 401)
        }
        const routes = authenticatedFinanceRoutes()
        const handler = routes[`${method} ${path}`]
        if (handler) return handler(init)
        throw new Error(`rota inesperada: ${method} ${path}`)
      }),
    )
    renderApp()

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Entrar no Finanhouse' })).toBeTruthy())
    expect(sessionCalls).toBe(1)
  })
})
