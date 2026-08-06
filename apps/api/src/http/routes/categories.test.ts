import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, buildTestRepositories } from '../test-support/build-test-app.js'

describe('GET /api/v1/households/:householdId/categories', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('lista categorias do household, mapeadas como DTO', async () => {
    const repositories = buildTestRepositories()
    repositories.categories.seed([
      { id: 1, householdId: 10, name: 'Mercado', entryType: 'expense', status: 'active' },
      { id: 2, householdId: 20, name: 'Outra casa', entryType: 'expense', status: 'active' },
    ])
    repositories.members.seed([{ id: 1, householdId: 10, userId: 100, role: 'owner', status: 'active' }])
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'GET', url: '/api/v1/households/10/categories' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ data: [{ id: 1, householdId: 10, name: 'Mercado', entryType: 'expense', status: 'active' }] })
  })

  it('rejeita householdId inválido (zero) com 400', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/households/0/categories' })
    expect(response.statusCode).toBe(400)
  })

  it('rejeita householdId inválido (texto) com 400', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/households/abc/categories' })
    expect(response.statusCode).toBe(400)
  })

  it('rejeita householdId decimal com 400', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/households/1.5/categories' })
    expect(response.statusCode).toBe(400)
  })

  it('aceita householdId positivo válido e retorna lista vazia quando não há categorias', async () => {
    const repositories = buildTestRepositories()
    repositories.members.seed([{ id: 1, householdId: 999, userId: 100, role: 'owner', status: 'active' }])
    app = buildTestApp({ repositories })
    const response = await app.inject({ method: 'GET', url: '/api/v1/households/999/categories' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ data: [] })
  })
})
