import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, buildTestRepositories, type TestRepositories } from '../test-support/build-test-app.js'

/** Household 10 é o household "próprio" usado por quase todo teste deste arquivo — precisa de um membro ativo para autoAuth autenticar (Bloco 19). */
function buildAuthedRepositories(): TestRepositories {
  const repositories = buildTestRepositories()
  repositories.members.seed([{ id: 1, householdId: 10, userId: 100, role: 'owner', status: 'active' }])
  return repositories
}

const PERIOD = { id: 1, householdId: 10, referenceMonth: '2026-08-01', status: 'open' as const, closedAt: null, closedByUserId: null }
const CLOSED_PERIOD = { id: 2, householdId: 10, referenceMonth: '2026-06-01', status: 'closed' as const, closedAt: '2026-07-05', closedByUserId: 1 }
const EXPENSE_CATEGORY = { id: 1, householdId: 10, name: 'Moradia', entryType: 'expense' as const, status: 'active' as const }
const INCOME_CATEGORY = { id: 2, householdId: 10, name: 'Salário', entryType: 'income' as const, status: 'active' as const }
const OTHER_HOUSEHOLD_CATEGORY = { id: 3, householdId: 20, name: 'Outra', entryType: 'expense' as const, status: 'active' as const }

describe('rotas de limites mensais por categoria', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('GET .../budgets lista limites da competência, isolado por household', async () => {
    const repositories = buildAuthedRepositories()
    repositories.periods.seed([PERIOD])
    repositories.periods.seed([{ ...PERIOD, id: 3, householdId: 20 }])
    repositories.categories.seed([EXPENSE_CATEGORY])
    repositories.budgets.seed([{ id: 1, householdId: 10, periodId: PERIOD.id, categoryId: EXPENSE_CATEGORY.id, limitAmount: 150000n }])
    repositories.budgets.seed([{ id: 2, householdId: 20, periodId: 3, categoryId: EXPENSE_CATEGORY.id, limitAmount: 999900n }])
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'GET', url: '/api/v1/households/10/periods/2026-08-01/budgets' })
    expect(response.statusCode).toBe(200)
    expect(response.json().data).toHaveLength(1)
    expect(response.json().data[0]).toMatchObject({ categoryId: 1, limitAmount: '1500.00' })
  })

  it('GET .../budgets retorna 404 quando a competência não existe', async () => {
    app = buildTestApp({ repositories: buildAuthedRepositories() })
    const response = await app.inject({ method: 'GET', url: '/api/v1/households/10/periods/2026-08-01/budgets' })
    expect(response.statusCode).toBe(404)
  })

  it('PUT .../budgets/:categoryId cria um novo limite (201), dinheiro como string decimal', async () => {
    const repositories = buildAuthedRepositories()
    repositories.periods.seed([PERIOD])
    repositories.categories.seed([EXPENSE_CATEGORY])
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/households/10/periods/2026-08-01/budgets/1',
      payload: { limitAmount: '1500.00' },
    })
    expect(response.statusCode).toBe(201)
    expect(response.json().data).toMatchObject({ householdId: 10, periodId: PERIOD.id, categoryId: 1, limitAmount: '1500.00' })
  })

  it('PUT .../budgets/:categoryId é idempotente — segunda chamada atualiza (200), sem duplicar', async () => {
    const repositories = buildAuthedRepositories()
    repositories.periods.seed([PERIOD])
    repositories.categories.seed([EXPENSE_CATEGORY])
    app = buildTestApp({ repositories })

    await app.inject({ method: 'PUT', url: '/api/v1/households/10/periods/2026-08-01/budgets/1', payload: { limitAmount: '1500.00' } })
    const second = await app.inject({ method: 'PUT', url: '/api/v1/households/10/periods/2026-08-01/budgets/1', payload: { limitAmount: '2000.00' } })
    expect(second.statusCode).toBe(200)
    expect(second.json().data.limitAmount).toBe('2000.00')

    const list = await app.inject({ method: 'GET', url: '/api/v1/households/10/periods/2026-08-01/budgets' })
    expect(list.json().data).toHaveLength(1)
  })

  it('PUT .../budgets/:categoryId rejeita número JSON (dinheiro precisa ser string) — 400', async () => {
    const repositories = buildAuthedRepositories()
    repositories.periods.seed([PERIOD])
    repositories.categories.seed([EXPENSE_CATEGORY])
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'PUT', url: '/api/v1/households/10/periods/2026-08-01/budgets/1', payload: { limitAmount: 1500 } })
    expect(response.statusCode).toBe(400)
  })

  it('PUT .../budgets/:categoryId rejeita corpo com campo desconhecido (400) e não salva nada', async () => {
    const repositories = buildAuthedRepositories()
    repositories.periods.seed([PERIOD])
    repositories.categories.seed([EXPENSE_CATEGORY])
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/households/10/periods/2026-08-01/budgets/1',
      payload: { limitAmount: '1500.00', householdId: 999 },
    })
    expect(response.statusCode).toBe(400)
    expect(await repositories.budgets.findByHouseholdAndPeriod(10, PERIOD.id)).toHaveLength(0)
  })

  it('PUT .../budgets/:categoryId rejeita categoria de receita (422, DOMAIN_RULE_REJECTED)', async () => {
    const repositories = buildAuthedRepositories()
    repositories.periods.seed([PERIOD])
    repositories.categories.seed([INCOME_CATEGORY])
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'PUT', url: '/api/v1/households/10/periods/2026-08-01/budgets/2', payload: { limitAmount: '100.00' } })
    expect(response.statusCode).toBe(422)
    expect(response.json().error.code).toBe('DOMAIN_RULE_REJECTED')
  })

  it('PUT .../budgets/:categoryId rejeita categoria de outro household (409, DOMAIN_CONFLICT — mesmo padrão de período/categoria referenciados em outro household, DT-09)', async () => {
    const repositories = buildAuthedRepositories()
    repositories.periods.seed([PERIOD])
    repositories.categories.seed([OTHER_HOUSEHOLD_CATEGORY])
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'PUT', url: '/api/v1/households/10/periods/2026-08-01/budgets/3', payload: { limitAmount: '100.00' } })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('DOMAIN_CONFLICT')
    expect(await repositories.budgets.findByHouseholdAndPeriod(10, PERIOD.id)).toHaveLength(0)
  })

  it('PUT .../budgets/:categoryId rejeita competência fechada (409)', async () => {
    const repositories = buildAuthedRepositories()
    repositories.periods.seed([CLOSED_PERIOD])
    repositories.categories.seed([EXPENSE_CATEGORY])
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'PUT', url: '/api/v1/households/10/periods/2026-06-01/budgets/1', payload: { limitAmount: '100.00' } })
    expect(response.statusCode).toBe(409)
  })

  it('DELETE .../budgets/:categoryId remove o limite (204)', async () => {
    const repositories = buildAuthedRepositories()
    repositories.periods.seed([PERIOD])
    repositories.categories.seed([EXPENSE_CATEGORY])
    repositories.budgets.seed([{ id: 1, householdId: 10, periodId: PERIOD.id, categoryId: 1, limitAmount: 150000n }])
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'DELETE', url: '/api/v1/households/10/periods/2026-08-01/budgets/1' })
    expect(response.statusCode).toBe(204)
    expect(await repositories.budgets.findByHouseholdAndPeriod(10, PERIOD.id)).toHaveLength(0)
  })

  it('DELETE .../budgets/:categoryId retorna 404 quando o limite não existe', async () => {
    const repositories = buildAuthedRepositories()
    repositories.periods.seed([PERIOD])
    repositories.categories.seed([EXPENSE_CATEGORY])
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'DELETE', url: '/api/v1/households/10/periods/2026-08-01/budgets/1' })
    expect(response.statusCode).toBe(404)
  })

  it('isolamento: limite de outro household nunca aparece na listagem nem pode ser removido pela URL de outro household', async () => {
    const repositories = buildAuthedRepositories()
    repositories.periods.seed([PERIOD])
    repositories.periods.seed([{ ...PERIOD, id: 5, householdId: 20 }])
    repositories.categories.seed([EXPENSE_CATEGORY, OTHER_HOUSEHOLD_CATEGORY])
    repositories.budgets.seed([{ id: 1, householdId: 20, periodId: 5, categoryId: OTHER_HOUSEHOLD_CATEGORY.id, limitAmount: 150000n }])
    app = buildTestApp({ repositories })

    const list = await app.inject({ method: 'GET', url: '/api/v1/households/10/periods/2026-08-01/budgets' })
    expect(list.json().data).toHaveLength(0)

    const remove = await app.inject({ method: 'DELETE', url: '/api/v1/households/10/periods/2026-08-01/budgets/3' })
    expect(remove.statusCode).toBe(404)
  })
})
