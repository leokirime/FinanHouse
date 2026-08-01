import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, buildTestRepositories } from '../test-support/build-test-app.js'

describe('rotas de competências mensais', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('GET .../periods lista competências do household', async () => {
    const repositories = buildTestRepositories()
    await repositories.periods.save({ id: 1, householdId: 10, referenceMonth: '2026-07-01', status: 'open', closedAt: null, closedByUserId: null })
    await repositories.periods.save({ id: 2, householdId: 20, referenceMonth: '2026-07-01', status: 'open', closedAt: null, closedByUserId: null })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'GET', url: '/api/v1/households/10/periods' })
    expect(response.statusCode).toBe(200)
    expect(response.json().data).toHaveLength(1)
    expect(response.json().data[0].id).toBe(1)
  })

  it('GET .../periods/:referenceMonth retorna 404 quando não existe', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/households/10/periods/2026-07-01' })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('NOT_FOUND')
  })

  it('GET .../periods/:referenceMonth rejeita formato inválido de competência (400)', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/households/10/periods/2026-07-15' })
    expect(response.statusCode).toBe(400)
  })

  it('GET .../periods/:referenceMonth de outro household nunca é retornado (isolamento)', async () => {
    const repositories = buildTestRepositories()
    await repositories.periods.save({ id: 1, householdId: 20, referenceMonth: '2026-07-01', status: 'open', closedAt: null, closedByUserId: null })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'GET', url: '/api/v1/households/10/periods/2026-07-01' })
    expect(response.statusCode).toBe(404)
  })

  it('PUT .../periods/:referenceMonth cria a competência quando não existe (201)', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'PUT', url: '/api/v1/households/10/periods/2026-07-01', payload: {} })
    expect(response.statusCode).toBe(201)
    expect(response.json().data).toMatchObject({ householdId: 10, referenceMonth: '2026-07-01', status: 'open' })
  })

  it('PUT .../periods/:referenceMonth é idempotente — chamar de novo retorna 200 sem duplicar', async () => {
    app = buildTestApp()
    await app.inject({ method: 'PUT', url: '/api/v1/households/10/periods/2026-07-01', payload: {} })
    const second = await app.inject({ method: 'PUT', url: '/api/v1/households/10/periods/2026-07-01', payload: {} })
    expect(second.statusCode).toBe(200)

    const list = await app.inject({ method: 'GET', url: '/api/v1/households/10/periods' })
    expect(list.json().data).toHaveLength(1)
  })

  it('PUT .../periods/:referenceMonth rejeita corpo com campo desconhecido (400) e não salva nada', async () => {
    const repositories = buildTestRepositories()
    app = buildTestApp({ repositories })
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/households/10/periods/2026-07-01',
      payload: { householdId: 999 },
    })
    expect(response.statusCode).toBe(400)
    // O handler nunca deve ter sido executado: nenhuma competência foi criada.
    const periods = await repositories.periods.findByHousehold(10)
    expect(periods).toHaveLength(0)
  })

  it('POST .../start-review transiciona open → review', async () => {
    const repositories = buildTestRepositories()
    await repositories.periods.save({ id: 1, householdId: 10, referenceMonth: '2026-07-01', status: 'open', closedAt: null, closedByUserId: null })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'POST', url: '/api/v1/households/10/periods/2026-07-01/start-review' })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.status).toBe('review')
  })

  it('POST .../reopen-from-review transiciona review → open', async () => {
    const repositories = buildTestRepositories()
    await repositories.periods.save({ id: 1, householdId: 10, referenceMonth: '2026-07-01', status: 'review', closedAt: null, closedByUserId: null })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'POST', url: '/api/v1/households/10/periods/2026-07-01/reopen-from-review' })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.status).toBe('open')
  })

  it('POST .../close transiciona review → closed com corpo válido', async () => {
    const repositories = buildTestRepositories()
    await repositories.periods.save({ id: 1, householdId: 10, referenceMonth: '2026-07-01', status: 'review', closedAt: null, closedByUserId: null })
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/households/10/periods/2026-07-01/close',
      payload: { closedByUserId: 1, closedAt: '2026-08-01' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.status).toBe('closed')
  })

  it('POST .../close rejeita corpo sem closedByUserId/closedAt (400)', async () => {
    const repositories = buildTestRepositories()
    await repositories.periods.save({ id: 1, householdId: 10, referenceMonth: '2026-07-01', status: 'review', closedAt: null, closedByUserId: null })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'POST', url: '/api/v1/households/10/periods/2026-07-01/close', payload: {} })
    expect(response.statusCode).toBe(400)
  })

  it('POST .../reopen transiciona closed → review', async () => {
    const repositories = buildTestRepositories()
    await repositories.periods.save({
      id: 1,
      householdId: 10,
      referenceMonth: '2026-07-01',
      status: 'closed',
      closedAt: '2026-08-01',
      closedByUserId: 1,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'POST', url: '/api/v1/households/10/periods/2026-07-01/reopen' })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.status).toBe('review')
  })

  it('transição de estado inválida retorna erro sanitizado de regra de domínio (não 500)', async () => {
    const repositories = buildTestRepositories()
    await repositories.periods.save({ id: 1, householdId: 10, referenceMonth: '2026-07-01', status: 'open', closedAt: null, closedByUserId: null })
    app = buildTestApp({ repositories })

    // "close" só é permitido a partir de "review" — período está "open".
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/households/10/periods/2026-07-01/close',
      payload: { closedByUserId: 1, closedAt: '2026-08-01' },
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('DOMAIN_CONFLICT')
  })

  it('ação em competência de outro household retorna 404, nunca altera o recurso', async () => {
    const repositories = buildTestRepositories()
    await repositories.periods.save({ id: 1, householdId: 20, referenceMonth: '2026-07-01', status: 'open', closedAt: null, closedByUserId: null })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'POST', url: '/api/v1/households/10/periods/2026-07-01/start-review' })
    expect(response.statusCode).toBe(404)

    const stillOpen = await repositories.periods.findById(1)
    expect(stillOpen?.status).toBe('open')
  })
})
