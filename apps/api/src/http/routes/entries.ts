import { parseMoney, type FinancialEntry } from '@finanhouse/domain'
import {
  CancelFinancialEntryService,
  CorrectFinancialEntryToPlannedService,
  CreateFinancialEntryService,
  DeleteFinancialEntryService,
  MarkFinancialEntryAsPendingService,
  RealizeFinancialEntryService,
  ReopenFinancialEntryService,
  RevertFinancialEntryRealizationService,
  UpdateFinancialEntryService,
} from '../../application/services/index.js'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { HttpAppRepositories } from '../app.js'
import { NotFoundHttpError } from '../errors/http-error.js'
import { toFinancialEntryDto } from '../mappers/financial-entry-dto.js'
import {
  createFinancialEntryBodySchema,
  listEntriesQuerySchema,
  realizeFinancialEntryBodySchema,
  updateFinancialEntryBodySchema,
} from '../schemas/entry-schemas.js'
import {
  HOUSEHOLD_BASE_PATH,
  householdAndEntryIdParamSchema,
  householdIdParamSchema,
  parseIdParam,
} from '../schemas/common.js'

interface HouseholdParams {
  householdId: string
}

interface HouseholdAndEntryIdParams extends HouseholdParams {
  entryId: string
}

interface ListEntriesQuery {
  periodId?: string
}

interface CreateFinancialEntryBody {
  periodId: number
  categoryId: number
  responsibleMemberId?: number | null
  entryType: 'income' | 'expense'
  description: string
  expectedAmount: string
  dueDate?: string | null
  notes?: string | null
}

interface UpdateFinancialEntryBody {
  categoryId?: number
  responsibleMemberId?: number | null
  description?: string
  expectedAmount?: string
  dueDate?: string | null
  notes?: string | null
}

interface RealizeFinancialEntryBody {
  actualAmount: string
  realizationDate: string
}

/**
 * `findById` (a porta existente) não é escopada por household — a
 * verificação é feita aqui, explicitamente, comparando o `householdId` da
 * URL com o da movimentação encontrada. Um recurso de outro household nunca
 * é retornado nem alterado: sempre 404, como se não existisse.
 */
async function loadEntryOrNotFound(
  repositories: HttpAppRepositories,
  householdId: number,
  entryId: number,
): Promise<FinancialEntry> {
  const entry = await repositories.entries.findById(entryId)
  if (!entry || entry.householdId !== householdId) {
    throw new NotFoundHttpError(`Movimentação ${entryId} não encontrada para o household ${householdId}.`)
  }
  return entry
}

export function registerEntryRoutes(fastify: FastifyInstance, repositories: HttpAppRepositories): void {
  const deps = {
    entries: repositories.entries,
    periods: repositories.periods,
    categories: repositories.categories,
    members: repositories.members,
  }

  fastify.get(
    `${HOUSEHOLD_BASE_PATH}/entries`,
    { schema: { params: householdIdParamSchema, querystring: listEntriesQuerySchema } },
    async (request: FastifyRequest<{ Params: HouseholdParams; Querystring: ListEntriesQuery }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const entries = request.query.periodId
        ? (await repositories.entries.findByPeriod(parseIdParam(request.query.periodId))).filter(
            (entry) => entry.householdId === householdId,
          )
        : await repositories.entries.findByHousehold(householdId)
      reply.status(200).send({ data: entries.map(toFinancialEntryDto) })
    },
  )

  fastify.get(
    `${HOUSEHOLD_BASE_PATH}/entries/:entryId`,
    { schema: { params: householdAndEntryIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndEntryIdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const entryId = parseIdParam(request.params.entryId)
      const entry = await loadEntryOrNotFound(repositories, householdId, entryId)
      reply.status(200).send({ data: toFinancialEntryDto(entry) })
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/entries`,
    { schema: { params: householdIdParamSchema, body: createFinancialEntryBodySchema } },
    async (request: FastifyRequest<{ Params: HouseholdParams; Body: CreateFinancialEntryBody }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const created = await new CreateFinancialEntryService(deps).execute({
        householdId,
        periodId: request.body.periodId,
        categoryId: request.body.categoryId,
        responsibleMemberId: request.body.responsibleMemberId ?? null,
        createdByUserId: request.authSession!.userId,
        entryType: request.body.entryType,
        description: request.body.description,
        expectedAmount: parseMoney(request.body.expectedAmount),
        dueDate: request.body.dueDate ?? null,
        notes: request.body.notes ?? null,
      })
      reply.status(201).send({ data: toFinancialEntryDto(created) })
    },
  )

  fastify.put(
    `${HOUSEHOLD_BASE_PATH}/entries/:entryId`,
    { schema: { params: householdAndEntryIdParamSchema, body: updateFinancialEntryBodySchema } },
    async (
      request: FastifyRequest<{ Params: HouseholdAndEntryIdParams; Body: UpdateFinancialEntryBody }>,
      reply,
    ) => {
      const householdId = parseIdParam(request.params.householdId)
      const entryId = parseIdParam(request.params.entryId)
      await loadEntryOrNotFound(repositories, householdId, entryId)

      const changes: Parameters<UpdateFinancialEntryService['execute']>[1] = {}
      if (request.body.categoryId !== undefined) changes.categoryId = request.body.categoryId
      if (request.body.responsibleMemberId !== undefined) changes.responsibleMemberId = request.body.responsibleMemberId
      if (request.body.description !== undefined) changes.description = request.body.description
      if (request.body.expectedAmount !== undefined) changes.expectedAmount = parseMoney(request.body.expectedAmount)
      if (request.body.dueDate !== undefined) changes.dueDate = request.body.dueDate
      if (request.body.notes !== undefined) changes.notes = request.body.notes

      const updated = await new UpdateFinancialEntryService(deps).execute(entryId, changes)
      reply.status(200).send({ data: toFinancialEntryDto(updated) })
    },
  )

  fastify.delete(
    `${HOUSEHOLD_BASE_PATH}/entries/:entryId`,
    { schema: { params: householdAndEntryIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndEntryIdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const entryId = parseIdParam(request.params.entryId)
      await loadEntryOrNotFound(repositories, householdId, entryId)
      await new DeleteFinancialEntryService(deps).execute(entryId, householdId)
      reply.status(204).send()
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/entries/:entryId/mark-pending`,
    { schema: { params: householdAndEntryIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndEntryIdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const entryId = parseIdParam(request.params.entryId)
      await loadEntryOrNotFound(repositories, householdId, entryId)
      const updated = await new MarkFinancialEntryAsPendingService(deps).execute(entryId)
      reply.status(200).send({ data: toFinancialEntryDto(updated) })
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/entries/:entryId/realize`,
    { schema: { params: householdAndEntryIdParamSchema, body: realizeFinancialEntryBodySchema } },
    async (
      request: FastifyRequest<{ Params: HouseholdAndEntryIdParams; Body: RealizeFinancialEntryBody }>,
      reply,
    ) => {
      const householdId = parseIdParam(request.params.householdId)
      const entryId = parseIdParam(request.params.entryId)
      await loadEntryOrNotFound(repositories, householdId, entryId)
      const updated = await new RealizeFinancialEntryService(deps).execute(entryId, {
        actualAmount: parseMoney(request.body.actualAmount),
        realizationDate: request.body.realizationDate,
      })
      reply.status(200).send({ data: toFinancialEntryDto(updated) })
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/entries/:entryId/cancel`,
    { schema: { params: householdAndEntryIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndEntryIdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const entryId = parseIdParam(request.params.entryId)
      await loadEntryOrNotFound(repositories, householdId, entryId)
      const updated = await new CancelFinancialEntryService(deps).execute(entryId)
      reply.status(200).send({ data: toFinancialEntryDto(updated) })
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/entries/:entryId/revert-realization`,
    { schema: { params: householdAndEntryIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndEntryIdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const entryId = parseIdParam(request.params.entryId)
      await loadEntryOrNotFound(repositories, householdId, entryId)
      const updated = await new RevertFinancialEntryRealizationService(deps).execute(entryId)
      reply.status(200).send({ data: toFinancialEntryDto(updated) })
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/entries/:entryId/correct-to-planned`,
    { schema: { params: householdAndEntryIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndEntryIdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const entryId = parseIdParam(request.params.entryId)
      await loadEntryOrNotFound(repositories, householdId, entryId)
      const updated = await new CorrectFinancialEntryToPlannedService(deps).execute(entryId)
      reply.status(200).send({ data: toFinancialEntryDto(updated) })
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/entries/:entryId/reopen`,
    { schema: { params: householdAndEntryIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndEntryIdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const entryId = parseIdParam(request.params.entryId)
      await loadEntryOrNotFound(repositories, householdId, entryId)
      const updated = await new ReopenFinancialEntryService(deps).execute(entryId)
      reply.status(200).send({ data: toFinancialEntryDto(updated) })
    },
  )
}
