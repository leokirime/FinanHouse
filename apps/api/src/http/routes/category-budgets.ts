import { parseMoney } from '@finanhouse/domain'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { DeleteCategoryBudgetService, ListCategoryBudgetsService, PutCategoryBudgetService } from '../../application/services/index.js'
import type { HttpAppRepositories } from '../app.js'
import { NotFoundHttpError } from '../errors/http-error.js'
import { toCategoryBudgetDto } from '../mappers/category-budget-dto.js'
import { putCategoryBudgetBodySchema } from '../schemas/category-budget-schemas.js'
import {
  HOUSEHOLD_BASE_PATH,
  householdAndReferenceMonthParamSchema,
  householdReferenceMonthAndCategoryIdParamSchema,
  parseIdParam,
} from '../schemas/common.js'

interface HouseholdAndReferenceMonthParams {
  householdId: string
  referenceMonth: string
}

interface HouseholdReferenceMonthAndCategoryParams extends HouseholdAndReferenceMonthParams {
  categoryId: string
}

interface PutCategoryBudgetBody {
  limitAmount: string
}

async function loadPeriodOrNotFound(repositories: HttpAppRepositories, householdId: number, referenceMonth: string) {
  const period = await repositories.periods.findByHouseholdAndReferenceMonth(householdId, referenceMonth)
  if (!period) {
    throw new NotFoundHttpError(`Competência ${referenceMonth} não encontrada para o household ${householdId}.`)
  }
  return period
}

/** Rotas sob `.../periods/:referenceMonth/budgets` — limites mensais por categoria (Bloco 18, DT-13). Reaproveita os serviços de aplicação já existentes; nenhuma regra de domínio duplicada aqui. */
export function registerCategoryBudgetRoutes(fastify: FastifyInstance, repositories: HttpAppRepositories): void {
  const deps = { budgets: repositories.budgets, periods: repositories.periods, categories: repositories.categories }

  fastify.get(
    `${HOUSEHOLD_BASE_PATH}/periods/:referenceMonth/budgets`,
    { schema: { params: householdAndReferenceMonthParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndReferenceMonthParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const period = await loadPeriodOrNotFound(repositories, householdId, request.params.referenceMonth)
      const budgets = await new ListCategoryBudgetsService(deps).execute(householdId, period.id)
      reply.status(200).send({ data: budgets.map(toCategoryBudgetDto) })
    },
  )

  fastify.put(
    `${HOUSEHOLD_BASE_PATH}/periods/:referenceMonth/budgets/:categoryId`,
    { schema: { params: householdReferenceMonthAndCategoryIdParamSchema, body: putCategoryBudgetBodySchema } },
    async (
      request: FastifyRequest<{ Params: HouseholdReferenceMonthAndCategoryParams; Body: PutCategoryBudgetBody }>,
      reply,
    ) => {
      const householdId = parseIdParam(request.params.householdId)
      const categoryId = parseIdParam(request.params.categoryId)
      const period = await loadPeriodOrNotFound(repositories, householdId, request.params.referenceMonth)
      const { budget, created } = await new PutCategoryBudgetService(deps).execute({
        householdId,
        periodId: period.id,
        categoryId,
        limitAmount: parseMoney(request.body.limitAmount),
      })
      reply.status(created ? 201 : 200).send({ data: toCategoryBudgetDto(budget) })
    },
  )

  fastify.delete(
    `${HOUSEHOLD_BASE_PATH}/periods/:referenceMonth/budgets/:categoryId`,
    { schema: { params: householdReferenceMonthAndCategoryIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdReferenceMonthAndCategoryParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const categoryId = parseIdParam(request.params.categoryId)
      const period = await loadPeriodOrNotFound(repositories, householdId, request.params.referenceMonth)
      await new DeleteCategoryBudgetService(deps).execute({ householdId, periodId: period.id, categoryId })
      reply.status(204).send()
    },
  )
}
