import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, buildTestRepositories } from '../test-support/build-test-app.js'

describe('GET /api/v1/households/:householdId/members', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('lista membros do household, mapeados como DTO, isolados por household', async () => {
    const repositories = buildTestRepositories()
    repositories.members.seed([
      { id: 1, householdId: 10, userId: 100, role: 'owner', status: 'active' },
      { id: 2, householdId: 20, userId: 200, role: 'owner', status: 'active' },
    ])
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'GET', url: '/api/v1/households/10/members' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ data: [{ id: 1, householdId: 10, userId: 100, role: 'owner', status: 'active' }] })
  })

  it('rejeita householdId negativo com 400', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/households/-1/members' })
    expect(response.statusCode).toBe(400)
  })
})
