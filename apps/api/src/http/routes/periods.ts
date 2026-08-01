import {
  CloseMonthlyPeriodService,
  OpenMonthlyPeriodService,
  ReopenMonthlyPeriodFromReviewService,
  ReopenMonthlyPeriodService,
  StartMonthlyPeriodReviewService,
} from '../../application/services/index.js'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { HttpAppRepositories } from '../app.js'
import { NotFoundHttpError } from '../errors/http-error.js'
import { toMonthlyPeriodDto } from '../mappers/monthly-period-dto.js'
import { closeMonthlyPeriodBodySchema, putMonthlyPeriodBodySchema } from '../schemas/period-schemas.js'
import {
  HOUSEHOLD_BASE_PATH,
  householdAndReferenceMonthParamSchema,
  householdIdParamSchema,
  parseIdParam,
} from '../schemas/common.js'

interface HouseholdParams {
  householdId: string
}

interface HouseholdAndReferenceMonthParams extends HouseholdParams {
  referenceMonth: string
}

interface CloseMonthlyPeriodBody {
  closedByUserId: number
  closedAt: string
}

async function loadPeriodOrNotFound(
  repositories: HttpAppRepositories,
  householdId: number,
  referenceMonth: string,
) {
  const period = await repositories.periods.findByHouseholdAndReferenceMonth(householdId, referenceMonth)
  if (!period) {
    throw new NotFoundHttpError(`Competência ${referenceMonth} não encontrada para o household ${householdId}.`)
  }
  return period
}

export function registerPeriodRoutes(fastify: FastifyInstance, repositories: HttpAppRepositories): void {
  const deps = { periods: repositories.periods, entries: repositories.entries }

  fastify.get(
    `${HOUSEHOLD_BASE_PATH}/periods`,
    { schema: { params: householdIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const periods = await repositories.periods.findByHousehold(householdId)
      reply.status(200).send({ data: periods.map(toMonthlyPeriodDto) })
    },
  )

  fastify.get(
    `${HOUSEHOLD_BASE_PATH}/periods/:referenceMonth`,
    { schema: { params: householdAndReferenceMonthParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndReferenceMonthParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const period = await loadPeriodOrNotFound(repositories, householdId, request.params.referenceMonth)
      reply.status(200).send({ data: toMonthlyPeriodDto(period) })
    },
  )

  fastify.put(
    `${HOUSEHOLD_BASE_PATH}/periods/:referenceMonth`,
    { schema: { params: householdAndReferenceMonthParamSchema, body: putMonthlyPeriodBodySchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndReferenceMonthParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const { referenceMonth } = request.params
      const existing = await repositories.periods.findByHouseholdAndReferenceMonth(householdId, referenceMonth)
      if (existing) {
        reply.status(200).send({ data: toMonthlyPeriodDto(existing) })
        return
      }
      const created = await new OpenMonthlyPeriodService(deps).execute({ householdId, referenceMonth })
      reply.status(201).send({ data: toMonthlyPeriodDto(created) })
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/periods/:referenceMonth/start-review`,
    { schema: { params: householdAndReferenceMonthParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndReferenceMonthParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const period = await loadPeriodOrNotFound(repositories, householdId, request.params.referenceMonth)
      const updated = await new StartMonthlyPeriodReviewService(deps).execute(period.id)
      reply.status(200).send({ data: toMonthlyPeriodDto(updated) })
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/periods/:referenceMonth/reopen-from-review`,
    { schema: { params: householdAndReferenceMonthParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndReferenceMonthParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const period = await loadPeriodOrNotFound(repositories, householdId, request.params.referenceMonth)
      const updated = await new ReopenMonthlyPeriodFromReviewService(deps).execute(period.id)
      reply.status(200).send({ data: toMonthlyPeriodDto(updated) })
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/periods/:referenceMonth/close`,
    { schema: { params: householdAndReferenceMonthParamSchema, body: closeMonthlyPeriodBodySchema } },
    async (
      request: FastifyRequest<{ Params: HouseholdAndReferenceMonthParams; Body: CloseMonthlyPeriodBody }>,
      reply,
    ) => {
      const householdId = parseIdParam(request.params.householdId)
      const period = await loadPeriodOrNotFound(repositories, householdId, request.params.referenceMonth)
      const updated = await new CloseMonthlyPeriodService(deps).execute(period.id, {
        closedByUserId: request.body.closedByUserId,
        closedAt: request.body.closedAt,
      })
      reply.status(200).send({ data: toMonthlyPeriodDto(updated) })
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/periods/:referenceMonth/reopen`,
    { schema: { params: householdAndReferenceMonthParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndReferenceMonthParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const period = await loadPeriodOrNotFound(repositories, householdId, request.params.referenceMonth)
      const updated = await new ReopenMonthlyPeriodService(deps).execute(period.id)
      reply.status(200).send({ data: toMonthlyPeriodDto(updated) })
    },
  )
}
