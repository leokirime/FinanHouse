import {
  CategoryBudgetNotFoundError,
  CategoryEntryTypeMismatchError,
  CategoryNotFoundError,
  ClosedPeriodError,
  DuplicateCategoryBudgetError,
  FinancialEntryNotFoundError,
  HouseholdMemberNotFoundError,
  HouseholdMismatchError,
  InactiveCategoryError,
  InactiveHouseholdMemberError,
  InvalidDateError,
  InvalidMoneyAmountError,
  InvalidPeriodTransitionError,
  InvalidStatusTransitionError,
  MissingRealizationDataError,
  PeriodInReviewError,
  PeriodNotFoundError,
  UnexpectedRealizationDataError,
} from '@finanhouse/domain'
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import {
  CheckConstraintViolationError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  DuplicateRecordError,
  ForeignKeyViolationError,
  HouseholdScopeViolationError,
  PersistenceError,
  UnexpectedPersistedValueError,
} from '../../infrastructure/repositories/drizzle/persistence-errors.js'
import { HttpError } from './http-error.js'

export interface HttpErrorBody {
  error: { code: string; message: string }
}

function body(code: string, message: string): HttpErrorBody {
  return { error: { code, message } }
}

/** Erros de domínio (`@finanhouse/domain`) que representam "recurso não encontrado". */
const DOMAIN_NOT_FOUND_ERRORS = [
  PeriodNotFoundError,
  CategoryNotFoundError,
  FinancialEntryNotFoundError,
  HouseholdMemberNotFoundError,
  CategoryBudgetNotFoundError,
]

/** Erros de domínio que representam um conflito de estado/escopo — regra válida, mas não aplicável agora. */
const DOMAIN_CONFLICT_ERRORS = [
  HouseholdMismatchError,
  InvalidStatusTransitionError,
  InvalidPeriodTransitionError,
  ClosedPeriodError,
  PeriodInReviewError,
  DuplicateCategoryBudgetError,
]

/** Erros de domínio sintaticamente válidos mas rejeitados por regra de negócio (valor/estado inválido). */
const DOMAIN_UNPROCESSABLE_ERRORS = [
  InvalidMoneyAmountError,
  InvalidDateError,
  MissingRealizationDataError,
  UnexpectedRealizationDataError,
  CategoryEntryTypeMismatchError,
  InactiveCategoryError,
  InactiveHouseholdMemberError,
]

function matchesAny(error: unknown, classes: Array<new (...args: never[]) => Error>): boolean {
  return classes.some((errorClass) => error instanceof errorClass)
}

function statusForPersistenceError(error: PersistenceError): number {
  if (error instanceof DuplicateRecordError) return 409
  if (error instanceof ForeignKeyViolationError) return 409
  if (error instanceof HouseholdScopeViolationError) return 409
  if (error instanceof CheckConstraintViolationError) return 422
  if (error instanceof DatabaseConnectionError) return 503
  if (error instanceof DatabaseTimeoutError) return 503
  if (error instanceof UnexpectedPersistedValueError) return 500
  return 500
}

/**
 * Handler central de erros. Nunca deixa passar mensagem/objeto bruto de
 * driver (mysql2/Drizzle) — todo `PersistenceError` já chega aqui
 * pré-sanitizado pelo Bloco 14 (`translatePersistenceError`, que desembrulha
 * `DrizzleQueryError.cause`); este handler só decide o status HTTP e o
 * `code` estável, nunca inspeciona `.cause`.
 */
export function createErrorHandler() {
  return function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply): void {
    if (error instanceof HttpError) {
      reply.status(error.statusCode).send(body(error.code, error.message))
      return
    }

    // Erro de validação de schema do Fastify/AJV (params, querystring ou body).
    if ('validation' in error && Array.isArray((error as FastifyError).validation)) {
      reply.status(400).send(body('VALIDATION_ERROR', 'Requisição inválida — verifique parâmetros e corpo enviados.'))
      return
    }

    if (matchesAny(error, DOMAIN_NOT_FOUND_ERRORS)) {
      reply.status(404).send(body('NOT_FOUND', error.message))
      return
    }

    if (matchesAny(error, DOMAIN_CONFLICT_ERRORS)) {
      reply.status(409).send(body('DOMAIN_CONFLICT', error.message))
      return
    }

    if (matchesAny(error, DOMAIN_UNPROCESSABLE_ERRORS)) {
      reply.status(422).send(body('DOMAIN_RULE_REJECTED', error.message))
      return
    }

    if (error instanceof PersistenceError) {
      const status = statusForPersistenceError(error)
      const code = status === 503 ? 'DEPENDENCY_UNAVAILABLE' : status === 409 ? 'PERSISTENCE_CONFLICT' : status === 422 ? 'PERSISTENCE_RULE_REJECTED' : 'PERSISTENCE_ERROR'
      // A mensagem de PersistenceError já é sanitizada (Bloco 14) — nunca contém host/senha/URI/SQL.
      reply.status(status).send(body(code, error.message))
      return
    }

    // Erro verdadeiramente inesperado: nunca expõe `error.message`/stack ao cliente.
    // Vira log técnico sanitizado (categoria + rota + request id), nunca o erro bruto.
    request.log.error({ err: { name: error.name }, route: request.routeOptions?.url, reqId: request.id }, 'unexpected_error')
    reply.status(500).send(body('INTERNAL_ERROR', 'Erro inesperado.'))
  }
}
