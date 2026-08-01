/**
 * Erro HTTP explícito, lançado diretamente pelos handlers quando a falha não
 * vem de uma exceção de domínio/persistência (ex.: recurso de outro
 * household detectado por comparação direta, sem passar por um serviço).
 */
export class HttpError extends Error {
  readonly statusCode: number
  readonly code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.code = code
  }
}

export class NotFoundHttpError extends HttpError {
  constructor(message: string) {
    super(404, 'NOT_FOUND', message)
  }
}

export class HouseholdScopeHttpError extends HttpError {
  constructor(message: string) {
    super(409, 'HOUSEHOLD_SCOPE_CONFLICT', message)
  }
}
