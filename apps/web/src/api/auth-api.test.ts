import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSession, login, logout } from './auth-api.ts'

const config = { baseUrl: 'http://127.0.0.1:3000' }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('login', () => {
  it('envia e-mail e senha para /api/v1/auth/login e devolve a sessão', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { user: { id: 1, displayName: 'Dona da Casa', email: 'a@b.invalid' }, householdId: 10 } }))
    vi.stubGlobal('fetch', fetchMock)

    const session = await login(config, 'a@b.invalid', 'senha-123')
    expect(session).toEqual({ user: { id: 1, displayName: 'Dona da Casa', email: 'a@b.invalid' }, householdId: 10 })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('http://127.0.0.1:3000/api/v1/auth/login')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.invalid', password: 'senha-123' })
    expect(init.credentials).toBe('include')
  })

  it('propaga ApiError kind unauthenticated para credenciais inválidas (401)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'E-mail ou senha inválidos.' } }, 401)))
    await expect(login(config, 'a@b.invalid', 'errada')).rejects.toMatchObject({ kind: 'unauthenticated', message: 'E-mail ou senha inválidos.' })
  })
})

describe('getSession', () => {
  it('busca a sessão atual em /api/v1/auth/session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { user: { id: 1, displayName: 'D', email: 'a@b.invalid' }, householdId: 10 } }))
    vi.stubGlobal('fetch', fetchMock)

    const session = await getSession(config)
    expect(session.householdId).toBe(10)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('http://127.0.0.1:3000/api/v1/auth/session')
    expect(init.credentials).toBe('include')
  })

  it('propaga ApiError kind unauthenticated quando não há sessão (401)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Sessão ausente.' } }, 401)))
    await expect(getSession(config)).rejects.toMatchObject({ kind: 'unauthenticated' })
  })
})

describe('logout', () => {
  it('chama POST /api/v1/auth/logout e não lança em sucesso (204)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(logout(config)).resolves.toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('http://127.0.0.1:3000/api/v1/auth/logout')
    expect(init.method).toBe('POST')
  })
})
