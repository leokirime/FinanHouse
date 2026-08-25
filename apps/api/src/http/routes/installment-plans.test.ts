import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, buildTestRepositories, type TestRepositories } from '../test-support/build-test-app.js'

const HOUSEHOLD_ID = 10
const OTHER_HOUSEHOLD_ID = 20

/** Household 10 precisa de um membro ativo para autoAuth autenticar (Bloco 19). */
function buildAuthedRepositories(): TestRepositories {
  const repositories = buildTestRepositories()
  repositories.members.seed([{ id: 1, householdId: HOUSEHOLD_ID, userId: 100, role: 'owner', status: 'active' }])
  repositories.categories.seed([{ id: 1, householdId: HOUSEHOLD_ID, name: 'Móveis', entryType: 'expense', status: 'active' }])
  return repositories
}

const VALID_BODY = {
  description: 'Sofá',
  categoryId: 1,
  totalAmount: '3000.00',
  installmentCount: 10,
  firstReferenceMonth: '2026-08-01',
  dueDay: 10,
}

describe('rotas de parcelamentos (RS-01, Sessão 12, Bloco 04)', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  describe('POST .../installment-plans', () => {
    it('cria um parcelamento válido (201) — plano + 10 parcelas, dinheiro como string decimal, nenhum bigint cru', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: VALID_BODY,
      })

      expect(response.statusCode).toBe(201)
      const body = response.json().data
      expect(body.plan.totalAmount).toBe('3000.00')
      expect(typeof body.plan.totalAmount).toBe('string')
      expect(body.installments).toHaveLength(10)
      for (const installment of body.installments) {
        expect(typeof installment.expectedAmount).toBe('string')
        expect(installment.installmentPlanId).toBe(body.plan.id)
        expect(installment.status).toBe('planned')
      }
      // createdByUserId vem da sessão autenticada (userId 100), nunca do corpo.
      expect(body.plan.createdByUserId).toBe(100)
    })

    it('R$ 1000,00 / 3 parcelas: soma persistida exatamente 1000.00', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: { ...VALID_BODY, totalAmount: '1000.00', installmentCount: 3 },
      })

      expect(response.statusCode).toBe(201)
      const amounts = response
        .json()
        .data.installments.map((i: { expectedAmount: string }) => Number(i.expectedAmount))
      expect(amounts.reduce((total: number, value: number) => total + value, 0)).toBeCloseTo(1000, 2)
    })

    it('rejeita corpo com campo desconhecido, incluindo householdId concorrente (400) — nenhuma escrita', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: { ...VALID_BODY, householdId: 999 },
      })

      expect(response.statusCode).toBe(400)
      expect(await repositories.installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    })

    it('rejeita installmentCount < 2 (400)', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: { ...VALID_BODY, installmentCount: 1 },
      })
      expect(response.statusCode).toBe(400)
    })

    it('aceita installmentCount = 2 (201) — limite mínimo válido', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: { ...VALID_BODY, installmentCount: 2 },
      })
      expect(response.statusCode).toBe(201)
    })

    it('não rejeita installmentCount = 61 — nenhum máximo arbitrário no schema (só o domínio decide, RS-01/RF-10)', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: { ...VALID_BODY, installmentCount: 61 },
      })
      expect(response.statusCode).toBe(201)
      expect(response.json().data.installments).toHaveLength(61)
    })

    it('rejeita installmentCount não inteiro (400)', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: { ...VALID_BODY, installmentCount: 2.5 },
      })
      expect(response.statusCode).toBe(400)
    })

    it('rejeita dueDay fora de 1..31 (400)', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: { ...VALID_BODY, dueDay: 32 },
      })
      expect(response.statusCode).toBe(400)
    })

    it('rejeita totalAmount como número JSON (dinheiro precisa ser string) — 400', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: { ...VALID_BODY, totalAmount: 3000 },
      })
      expect(response.statusCode).toBe(400)
    })

    it('sem sessão retorna 401 e não cria nada', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories, autoAuth: false })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: VALID_BODY,
      })
      expect(response.statusCode).toBe(401)
      expect(await repositories.installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    })

    it('categoria de outro household resulta em conflito de escopo sanitizado (409), nenhuma escrita', async () => {
      const repositories = buildAuthedRepositories()
      repositories.categories.seed([{ id: 2, householdId: OTHER_HOUSEHOLD_ID, name: 'Outra', entryType: 'expense', status: 'active' }])
      app = buildTestApp({ repositories })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: { ...VALID_BODY, categoryId: 2 },
      })
      expect(response.statusCode).toBe(409)
      expect(response.json().error.code).toBe('DOMAIN_CONFLICT')
      expect(await repositories.installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    })

    it('categoria inexistente resulta em 404, nenhuma escrita', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: { ...VALID_BODY, categoryId: 999 },
      })
      expect(response.statusCode).toBe(404)
      expect(await repositories.installmentPlans.findByHousehold(HOUSEHOLD_ID)).toEqual([])
    })
  })

  describe('GET .../installment-plans', () => {
    it('lista os parcelamentos do household, isolados por household', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      await app.inject({ method: 'POST', url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`, payload: VALID_BODY })

      const response = await app.inject({ method: 'GET', url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans` })
      expect(response.statusCode).toBe(200)
      expect(response.json().data).toHaveLength(1)
      expect(response.json().data[0].description).toBe('Sofá')
    })

    it('household sem parcelamentos retorna lista vazia (200)', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({ method: 'GET', url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans` })
      expect(response.statusCode).toBe(200)
      expect(response.json().data).toEqual([])
    })
  })

  describe('GET .../installment-plans/:installmentPlanId', () => {
    it('retorna o plano com as parcelas (200)', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const created = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans`,
        payload: VALID_BODY,
      })
      const planId = created.json().data.plan.id

      const response = await app.inject({ method: 'GET', url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans/${planId}` })
      expect(response.statusCode).toBe(200)
      expect(response.json().data.plan.id).toBe(planId)
      expect(response.json().data.installments).toHaveLength(10)
    })

    it('plano inexistente retorna 404', async () => {
      const repositories = buildAuthedRepositories()
      app = buildTestApp({ repositories })

      const response = await app.inject({ method: 'GET', url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans/999` })
      expect(response.statusCode).toBe(404)
    })

    it('plano de outro household nunca é retornado (isolamento, 404)', async () => {
      const repositories = buildAuthedRepositories()
      repositories.members.seed([{ id: 2, householdId: OTHER_HOUSEHOLD_ID, userId: 200, role: 'owner', status: 'active' }])
      repositories.categories.seed([{ id: 2, householdId: OTHER_HOUSEHOLD_ID, name: 'Outra', entryType: 'expense', status: 'active' }])
      app = buildTestApp({ repositories })

      const created = await app.inject({
        method: 'POST',
        url: `/api/v1/households/${OTHER_HOUSEHOLD_ID}/installment-plans`,
        payload: { ...VALID_BODY, categoryId: 2 },
      })
      const planId = created.json().data.plan.id

      const response = await app.inject({ method: 'GET', url: `/api/v1/households/${HOUSEHOLD_ID}/installment-plans/${planId}` })
      expect(response.statusCode).toBe(404)
    })
  })
})
