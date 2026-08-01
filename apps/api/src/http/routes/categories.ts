import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { HttpAppRepositories } from '../app.js'
import { toCategoryDto } from '../mappers/category-dto.js'
import { HOUSEHOLD_BASE_PATH, householdIdParamSchema, parseIdParam } from '../schemas/common.js'

interface HouseholdParams {
  householdId: string
}

export function registerCategoryRoutes(fastify: FastifyInstance, repositories: HttpAppRepositories): void {
  fastify.get(
    `${HOUSEHOLD_BASE_PATH}/categories`,
    { schema: { params: householdIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const categories = await repositories.categories.findByHousehold(householdId)
      reply.status(200).send({ data: categories.map(toCategoryDto) })
    },
  )
}
