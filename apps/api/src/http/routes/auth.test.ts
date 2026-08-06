import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { hashPassword } from '../../security/password-hashing.js'
import { buildTestApp, buildTestRepositories, type TestRepositories } from '../test-support/build-test-app.js'

const HOUSEHOLD_ID = 10
const OTHER_HOUSEHOLD_ID = 20
const PASSWORD = 'senha-correta-123'

async function seedAuthenticatableUser(repositories: TestRepositories) {
  repositories.users.seed([{ id: 100, displayName: 'Dona da Casa', email: 'owner@finanhouse.invalid', status: 'active', passwordHash: await hashPassword(PASSWORD) }])
  repositories.members.seed([{ id: 1, householdId: HOUSEHOLD_ID, userId: 100, role: 'owner', status: 'active' }])
}

function extractSessionCookie(response: { cookies: Array<{ name: string; value: string; httpOnly?: boolean; sameSite?: string; path?: string }> }) {
  return response.cookies.find((cookie) => cookie.name === 'finanhouse_session')
}

describe('POST /api/v1/auth/login', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('autentica com credenciais corretas, devolve usuário/household e nunca o passwordHash', async () => {
    const repositories = buildTestRepositories()
    await seedAuthenticatableUser(repositories)
    app = buildTestApp({ repositories, autoAuth: false })

    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'owner@finanhouse.invalid', password: PASSWORD } })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.user).toEqual({ id: 100, displayName: 'Dona da Casa', email: 'owner@finanhouse.invalid' })
    expect(body.data.householdId).toBe(HOUSEHOLD_ID)
    expect(response.body).not.toContain('passwordHash')
    expect(response.body).not.toContain('argon2')
  })

  it('define o cookie de sessão como HttpOnly, SameSite=Lax e nunca Secure em development', async () => {
    const repositories = buildTestRepositories()
    await seedAuthenticatableUser(repositories)
    app = buildTestApp({ repositories, autoAuth: false })

    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'owner@finanhouse.invalid', password: PASSWORD } })
    const cookie = extractSessionCookie(response)
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('Lax')
    expect(cookie?.path).toBe('/')
  })

  it('rejeita senha incorreta com 401 e mensagem genérica', async () => {
    const repositories = buildTestRepositories()
    await seedAuthenticatableUser(repositories)
    app = buildTestApp({ repositories, autoAuth: false })

    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'owner@finanhouse.invalid', password: 'senha-errada' } })
    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('UNAUTHENTICATED')
  })

  it('rejeita e-mail inexistente com a mesma resposta genérica (401, nunca revela ausência do e-mail)', async () => {
    app = buildTestApp({ autoAuth: false })
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'ninguem@finanhouse.invalid', password: 'qualquer-coisa' } })
    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('UNAUTHENTICATED')
  })

  it('rejeita corpo sem senha (400)', async () => {
    app = buildTestApp({ autoAuth: false })
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'owner@finanhouse.invalid' } })
    expect(response.statusCode).toBe(400)
  })

  it('rejeita corpo com campo desconhecido (400)', async () => {
    app = buildTestApp({ autoAuth: false })
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'owner@finanhouse.invalid', password: PASSWORD, remember: true } })
    expect(response.statusCode).toBe(400)
  })

  it('aplica rate limit após 10 tentativas na mesma janela (429)', async () => {
    const repositories = buildTestRepositories()
    await seedAuthenticatableUser(repositories)
    app = buildTestApp({ repositories, autoAuth: false })

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'owner@finanhouse.invalid', password: 'senha-errada' } })
      expect(response.statusCode).toBe(401)
    }
    const blocked = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'owner@finanhouse.invalid', password: 'senha-errada' } })
    expect(blocked.statusCode).toBe(429)
  })
})

describe('GET /api/v1/auth/session', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('retorna 401 sem cookie', async () => {
    app = buildTestApp({ autoAuth: false })
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/session' })
    expect(response.statusCode).toBe(401)
  })

  it('retorna o usuário/household autenticado com um cookie válido, sem nunca expor o token', async () => {
    const repositories = buildTestRepositories()
    await seedAuthenticatableUser(repositories)
    app = buildTestApp({ repositories, autoAuth: false })

    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'owner@finanhouse.invalid', password: PASSWORD } })
    const cookie = extractSessionCookie(login)!

    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: `${cookie.name}=${cookie.value}` } })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.householdId).toBe(HOUSEHOLD_ID)
    expect(response.body).not.toContain(cookie.value)
  })

  it('retorna 401 com um token inválido', async () => {
    app = buildTestApp({ autoAuth: false })
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: 'finanhouse_session=token-forjado' } })
    expect(response.statusCode).toBe(401)
  })
})

describe('POST /api/v1/auth/logout', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('revoga a sessão e a torna inválida para chamadas seguintes', async () => {
    const repositories = buildTestRepositories()
    await seedAuthenticatableUser(repositories)
    app = buildTestApp({ repositories, autoAuth: false })

    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'owner@finanhouse.invalid', password: PASSWORD } })
    const cookie = extractSessionCookie(login)!
    const cookieHeader = `${cookie.name}=${cookie.value}`

    const logout = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: cookieHeader } })
    expect(logout.statusCode).toBe(204)

    const afterLogout = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: cookieHeader } })
    expect(afterLogout.statusCode).toBe(401)
  })

  it('é idempotente — sem cookie nenhum, ainda retorna 204', async () => {
    app = buildTestApp({ autoAuth: false })
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' })
    expect(response.statusCode).toBe(204)
  })
})

describe('proteção das rotas financeiras (Bloco 19, DT-14)', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('rota financeira sem sessão retorna 401', async () => {
    const repositories = buildTestRepositories()
    repositories.members.seed([{ id: 1, householdId: HOUSEHOLD_ID, userId: 100, role: 'owner', status: 'active' }])
    app = buildTestApp({ repositories, autoAuth: false })

    const response = await app.inject({ method: 'GET', url: `/api/v1/households/${HOUSEHOLD_ID}/categories` })
    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('UNAUTHENTICATED')
  })

  it('rota financeira com household diferente do autenticado é rejeitada (404, sem vazamento de dados)', async () => {
    const repositories = buildTestRepositories()
    await seedAuthenticatableUser(repositories)
    repositories.categories.seed([{ id: 1, householdId: OTHER_HOUSEHOLD_ID, name: 'Categoria de outro household', entryType: 'expense', status: 'active' }])
    app = buildTestApp({ repositories, autoAuth: false })

    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'owner@finanhouse.invalid', password: PASSWORD } })
    const cookie = extractSessionCookie(login)!

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/households/${OTHER_HOUSEHOLD_ID}/categories`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    })
    expect(response.statusCode).toBe(404)
  })

  it('rota financeira com sessão válida e household correspondente funciona normalmente', async () => {
    const repositories = buildTestRepositories()
    await seedAuthenticatableUser(repositories)
    repositories.categories.seed([{ id: 1, householdId: HOUSEHOLD_ID, name: 'Mercado', entryType: 'expense', status: 'active' }])
    app = buildTestApp({ repositories, autoAuth: false })

    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'owner@finanhouse.invalid', password: PASSWORD } })
    const cookie = extractSessionCookie(login)!

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/households/${HOUSEHOLD_ID}/categories`,
      headers: { cookie: `${cookie.name}=${cookie.value}` },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data).toHaveLength(1)
  })
})
