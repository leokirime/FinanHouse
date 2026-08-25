import { parseMoney } from '@finanhouse/domain'
import {
  CreateInstallmentPurchaseService,
  GetInstallmentPlanDetailService,
  ListInstallmentPlansService,
} from '../../application/services/index.js'
import type { InstallmentTransactionRunner } from '../../application/ports/index.js'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { HttpAppRepositories } from '../app.js'
import { toInstallmentPlanDto, toInstallmentPurchaseDto } from '../mappers/installment-plan-dto.js'
import { createInstallmentPurchaseBodySchema } from '../schemas/installment-plan-schemas.js'
import { HOUSEHOLD_BASE_PATH, householdAndInstallmentPlanIdParamSchema, householdIdParamSchema, parseIdParam } from '../schemas/common.js'

interface HouseholdParams {
  householdId: string
}

interface HouseholdAndInstallmentPlanIdParams extends HouseholdParams {
  installmentPlanId: string
}

interface CreateInstallmentPurchaseBody {
  description: string
  categoryId: number
  totalAmount: string
  installmentCount: number
  firstReferenceMonth: string
  dueDay: number
}

export function registerInstallmentPlanRoutes(
  fastify: FastifyInstance,
  repositories: HttpAppRepositories,
  transactionRunner: InstallmentTransactionRunner,
): void {
  const readDeps = { installmentPlans: repositories.installmentPlans, entries: repositories.entries }

  fastify.get(
    `${HOUSEHOLD_BASE_PATH}/installment-plans`,
    { schema: { params: householdIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const plans = await new ListInstallmentPlansService(readDeps).execute(householdId)
      reply.status(200).send({ data: plans.map(toInstallmentPlanDto) })
    },
  )

  fastify.get(
    `${HOUSEHOLD_BASE_PATH}/installment-plans/:installmentPlanId`,
    { schema: { params: householdAndInstallmentPlanIdParamSchema } },
    async (request: FastifyRequest<{ Params: HouseholdAndInstallmentPlanIdParams }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const installmentPlanId = parseIdParam(request.params.installmentPlanId)
      const { plan, installments } = await new GetInstallmentPlanDetailService(readDeps).execute(householdId, installmentPlanId)
      reply.status(200).send({ data: toInstallmentPurchaseDto(plan, installments) })
    },
  )

  fastify.post(
    `${HOUSEHOLD_BASE_PATH}/installment-plans`,
    { schema: { params: householdIdParamSchema, body: createInstallmentPurchaseBodySchema } },
    async (request: FastifyRequest<{ Params: HouseholdParams; Body: CreateInstallmentPurchaseBody }>, reply) => {
      const householdId = parseIdParam(request.params.householdId)
      const { plan, installments } = await new CreateInstallmentPurchaseService({ transactionRunner }).execute({
        householdId,
        description: request.body.description,
        categoryId: request.body.categoryId,
        totalAmount: parseMoney(request.body.totalAmount),
        installmentCount: request.body.installmentCount,
        firstReferenceMonth: request.body.firstReferenceMonth,
        dueDay: request.body.dueDay,
        createdByUserId: request.authSession!.userId,
      })
      reply.status(201).send({ data: toInstallmentPurchaseDto(plan, installments) })
    },
  )
}
