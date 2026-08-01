import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { HttpAppRepositories } from '../app.js'
import { toHouseholdMemberDto } from '../mappers/household-member-dto.js'
import { HOUSEHOLD_BASE_PATH, householdIdParamSchema, parseIdParam } from '../schemas/common.js'

interface HouseholdParams {
  householdId: string
}

export function registerMemberRoutes(fastify: FastifyInstance, repositories: HttpAppRepositories): void {
  fastify.get(
    `${HOUSEHOLD_BASE_PATH}/members`,
    { schema: { params: householdIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const members = await repositories.members.findByHousehold(householdId)
      reply.status(200).send({ data: members.map(toHouseholdMemberDto) })
    },
  )
}
