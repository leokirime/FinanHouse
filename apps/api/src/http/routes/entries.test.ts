import { parseMoney } from '@finanhouse/domain'
import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { DatabaseConnectionError } from '../../infrastructure/repositories/drizzle/persistence-errors.js'
import { buildTestApp, buildTestRepositories } from '../test-support/build-test-app.js'

const HOUSEHOLD_ID = 10
const OTHER_HOUSEHOLD_ID = 20

async function seedBaseFixtures(repositories: ReturnType<typeof buildTestRepositories>) {
  repositories.categories.seed([{ id: 1, householdId: HOUSEHOLD_ID, name: 'Mercado', entryType: 'expense', status: 'active' }])
  repositories.members.seed([{ id: 1, householdId: HOUSEHOLD_ID, userId: 100, role: 'owner', status: 'active' }])
  await repositories.periods.save({
    id: 1,
    householdId: HOUSEHOLD_ID,
    referenceMonth: '2026-07-01',
    status: 'open',
    closedAt: null,
    closedByUserId: null,
  })
}

describe('rotas de movimentações', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('POST .../entries cria uma movimentação válida (201), sem expor a coluna auxiliar', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/households/${HOUSEHOLD_ID}/entries`,
      payload: {
        periodId: 1,
        categoryId: 1,
        entryType: 'expense',
        description: 'Aluguel',
        expectedAmount: '1000.00',
      },
    })
    expect(response.statusCode).toBe(201)
    const dto = response.json().data
    expect(dto.expectedAmount).toBe('1000.00')
    expect(dto.status).toBe('planned')
    expect('responsibleMemberHouseholdId' in dto).toBe(false)
    // createdByUserId vem da sessão autenticada (userId 100, seedado por seedBaseFixtures), nunca do corpo (Bloco 19, DT-14).
    expect(dto.createdByUserId).toBe(100)
  })

  it('POST .../entries ignora createdByUserId enviado no corpo (campo desconhecido, 400) — nunca aceita usuário forjado', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/households/${HOUSEHOLD_ID}/entries`,
      payload: {
        periodId: 1,
        categoryId: 1,
        createdByUserId: 999,
        entryType: 'expense',
        description: 'Aluguel',
        expectedAmount: '1000.00',
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('POST .../entries rejeita expectedAmount como número JSON, não como string (400)', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/households/${HOUSEHOLD_ID}/entries`,
      payload: {
        periodId: 1,
        categoryId: 1,
        entryType: 'expense',
        description: 'Aluguel',
        expectedAmount: 1000,
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('POST .../entries rejeita dueDate com formato inválido (400)', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/households/${HOUSEHOLD_ID}/entries`,
      payload: {
        periodId: 1,
        categoryId: 1,
        entryType: 'expense',
        description: 'Aluguel',
        expectedAmount: '1000.00',
        dueDate: '15/07/2026',
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('POST .../entries rejeita entryType fora do enum do domínio (400)', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/households/${HOUSEHOLD_ID}/entries`,
      payload: {
        periodId: 1,
        categoryId: 1,
        entryType: 'transfer',
        description: 'Aluguel',
        expectedAmount: '1000.00',
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('POST .../entries rejeita campo desconhecido no corpo, incluindo householdId concorrente (400)', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/households/${HOUSEHOLD_ID}/entries`,
      payload: {
        householdId: 999,
        periodId: 1,
        categoryId: 1,
        entryType: 'expense',
        description: 'Aluguel',
        expectedAmount: '1000.00',
      },
    })
    expect(response.statusCode).toBe(400)
    // O handler nunca deve ter sido executado: nenhuma movimentação foi salva.
    const entries = await repositories.entries.findByHousehold(HOUSEHOLD_ID)
    expect(entries).toHaveLength(0)
  })

  it('POST .../entries com período de outro household resulta em conflito de escopo sanitizado, não 500', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    await repositories.periods.save({
      id: 2,
      householdId: OTHER_HOUSEHOLD_ID,
      referenceMonth: '2026-07-01',
      status: 'open',
      closedAt: null,
      closedByUserId: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/households/${HOUSEHOLD_ID}/entries`,
      payload: {
        periodId: 2,
        categoryId: 1,
        entryType: 'expense',
        description: 'Tentativa cruzada',
        expectedAmount: '1000.00',
      },
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('DOMAIN_CONFLICT')
  })

  it('GET .../entries/:entryId retorna 404 quando não existe', async () => {
    const repositories = buildTestRepositories()
    repositories.members.seed([{ id: 1, householdId: HOUSEHOLD_ID, userId: 100, role: 'owner', status: 'active' }])
    app = buildTestApp({ repositories })
    const response = await app.inject({ method: 'GET', url: `/api/v1/households/${HOUSEHOLD_ID}/entries/1` })
    expect(response.statusCode).toBe(404)
  })

  it('GET .../entries/:entryId de outro household nunca é retornado (isolamento, 404)', async () => {
    const repositories = buildTestRepositories()
    repositories.members.seed([{ id: 1, householdId: HOUSEHOLD_ID, userId: 100, role: 'owner', status: 'active' }])
    await repositories.entries.save({
      id: 1,
      householdId: OTHER_HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'planned',
      description: 'De outro household',
      expectedAmount: parseMoney('50.00'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'GET', url: `/api/v1/households/${HOUSEHOLD_ID}/entries/1` })
    expect(response.statusCode).toBe(404)
  })

  it('GET .../entries lista movimentações do household, isoladas', async () => {
    const repositories = buildTestRepositories()
    repositories.members.seed([{ id: 1, householdId: HOUSEHOLD_ID, userId: 100, role: 'owner', status: 'active' }])
    await repositories.entries.save({
      id: 1,
      householdId: HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'planned',
      description: 'Do household certo',
      expectedAmount: parseMoney('50.00'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    })
    await repositories.entries.save({
      id: 2,
      householdId: OTHER_HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'planned',
      description: 'De outro household',
      expectedAmount: parseMoney('50.00'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'GET', url: `/api/v1/households/${HOUSEHOLD_ID}/entries` })
    expect(response.statusCode).toBe(200)
    expect(response.json().data).toHaveLength(1)
    expect(response.json().data[0].id).toBe(1)
  })

  it('PUT .../entries/:entryId atualiza uma movimentação existente', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    await repositories.entries.save({
      id: 1,
      householdId: HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'planned',
      description: 'Original',
      expectedAmount: parseMoney('50.00'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/households/${HOUSEHOLD_ID}/entries/1`,
      payload: { description: 'Atualizada', expectedAmount: '75.00' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.description).toBe('Atualizada')
    expect(response.json().data.expectedAmount).toBe('75.00')
  })

  it('PUT .../entries/:entryId de outro household resulta em 404, nunca altera o recurso', async () => {
    const repositories = buildTestRepositories()
    repositories.members.seed([{ id: 1, householdId: HOUSEHOLD_ID, userId: 100, role: 'owner', status: 'active' }])
    await repositories.entries.save({
      id: 1,
      householdId: OTHER_HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'planned',
      description: 'Original',
      expectedAmount: parseMoney('50.00'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/households/${HOUSEHOLD_ID}/entries/1`,
      payload: { description: 'Tentativa cruzada' },
    })
    expect(response.statusCode).toBe(404)
    const untouched = await repositories.entries.findById(1)
    expect(untouched?.description).toBe('Original')
  })

  it('POST .../realize transiciona planned → realized com dados válidos', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    await repositories.entries.save({
      id: 1,
      householdId: HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'planned',
      description: 'Aluguel',
      expectedAmount: parseMoney('1000.00'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/households/${HOUSEHOLD_ID}/entries/1/realize`,
      payload: { actualAmount: '1000.00', realizationDate: '2026-07-10' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.status).toBe('realized')
    expect(response.json().data.actualAmount).toBe('1000.00')
  })

  it('POST .../cancel transiciona planned → cancelled', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    await repositories.entries.save({
      id: 1,
      householdId: HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'planned',
      description: 'Aluguel',
      expectedAmount: parseMoney('1000.00'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'POST', url: `/api/v1/households/${HOUSEHOLD_ID}/entries/1/cancel` })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.status).toBe('cancelled')
  })

  it('POST .../mark-pending transiciona planned → pending', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    await repositories.entries.save({
      id: 1,
      householdId: HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'planned',
      description: 'Aluguel',
      expectedAmount: parseMoney('1000.00'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'POST', url: `/api/v1/households/${HOUSEHOLD_ID}/entries/1/mark-pending` })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.status).toBe('pending')
  })

  it('POST .../revert-realization transiciona realized → pending', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    await repositories.entries.save({
      id: 1,
      householdId: HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'realized',
      description: 'Aluguel',
      expectedAmount: parseMoney('1000.00'),
      actualAmount: parseMoney('1000.00'),
      dueDate: null,
      realizationDate: '2026-07-10',
      notes: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'POST', url: `/api/v1/households/${HOUSEHOLD_ID}/entries/1/revert-realization` })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.status).toBe('pending')
  })

  it('POST .../correct-to-planned transiciona pending → planned', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    await repositories.entries.save({
      id: 1,
      householdId: HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'pending',
      description: 'Aluguel',
      expectedAmount: parseMoney('1000.00'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'POST', url: `/api/v1/households/${HOUSEHOLD_ID}/entries/1/correct-to-planned` })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.status).toBe('planned')
  })

  it('POST .../reopen transiciona cancelled → planned', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    await repositories.entries.save({
      id: 1,
      householdId: HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'cancelled',
      description: 'Aluguel',
      expectedAmount: parseMoney('1000.00'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'POST', url: `/api/v1/households/${HOUSEHOLD_ID}/entries/1/reopen` })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.status).toBe('planned')
  })

  it('transição inválida (realize sem estar planned/pending) retorna erro de regra de domínio sanitizado (não 500)', async () => {
    const repositories = buildTestRepositories()
    await seedBaseFixtures(repositories)
    await repositories.entries.save({
      id: 1,
      householdId: HOUSEHOLD_ID,
      periodId: 1,
      categoryId: 1,
      responsibleMemberId: null,
      createdByUserId: 100,
      entryType: 'expense',
      status: 'cancelled',
      description: 'Aluguel',
      expectedAmount: parseMoney('1000.00'),
      actualAmount: null,
      dueDate: null,
      realizationDate: null,
      notes: null,
    })
    app = buildTestApp({ repositories })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/households/${HOUSEHOLD_ID}/entries/1/realize`,
      payload: { actualAmount: '1000.00', realizationDate: '2026-07-10' },
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('DOMAIN_CONFLICT')
  })

  it('erro de conexão do repositório vira 503 sanitizado, nunca 500 opaco com mensagem bruta', async () => {
    const repositories = buildTestRepositories()
    repositories.members.seed([{ id: 1, householdId: HOUSEHOLD_ID, userId: 100, role: 'owner', status: 'active' }])
    repositories.entries.findByHousehold = async () => {
      throw new DatabaseConnectionError('Falha de conexão: host inacessível.')
    }
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'GET', url: `/api/v1/households/${HOUSEHOLD_ID}/entries` })
    expect(response.statusCode).toBe(503)
    expect(response.json().error.code).toBe('DEPENDENCY_UNAVAILABLE')
  })

  it('erro totalmente inesperado do repositório vira 500 sanitizado, sem stack trace nem mensagem bruta', async () => {
    const repositories = buildTestRepositories()
    repositories.members.seed([{ id: 1, householdId: HOUSEHOLD_ID, userId: 100, role: 'owner', status: 'active' }])
    repositories.entries.findByHousehold = async () => {
      throw new Error('detalhe interno sensível que nunca deveria ir para o cliente')
    }
    app = buildTestApp({ repositories })

    const response = await app.inject({ method: 'GET', url: `/api/v1/households/${HOUSEHOLD_ID}/entries` })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Erro inesperado.' } })
    expect(response.body).not.toContain('sensível')
  })
})
