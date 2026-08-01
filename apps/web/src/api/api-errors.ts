/**
 * Taxonomia de erro do cliente HTTP do frontend — espelha os `error.code`
 * estáveis do contrato (`Docs/03_contracts/contrato_api_http.md`, seção 8) e
 * acrescenta as categorias específicas do cliente (rede, timeout,
 * cancelamento, configuração, resposta inesperada). Nunca inclui corpo
 * financeiro, apenas a mensagem já sanitizada devolvida pelo servidor.
 */
export type ApiErrorKind =
  | 'validation'
  | 'not_found'
  | 'domain_conflict'
  | 'persistence_conflict'
  | 'domain_rule_rejected'
  | 'persistence_rule_rejected'
  | 'dependency_unavailable'
  | 'internal'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'config'
  | 'unexpected_response'

const CODE_TO_KIND: Record<string, ApiErrorKind> = {
  VALIDATION_ERROR: 'validation',
  NOT_FOUND: 'not_found',
  DOMAIN_CONFLICT: 'domain_conflict',
  PERSISTENCE_CONFLICT: 'persistence_conflict',
  DOMAIN_RULE_REJECTED: 'domain_rule_rejected',
  PERSISTENCE_RULE_REJECTED: 'persistence_rule_rejected',
  DEPENDENCY_UNAVAILABLE: 'dependency_unavailable',
  INTERNAL_ERROR: 'internal',
}

const RETRYABLE_KINDS: ReadonlySet<ApiErrorKind> = new Set(['network', 'timeout', 'dependency_unavailable', 'internal', 'unexpected_response'])

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly code: string | null
  readonly httpStatus: number | null

  constructor(kind: ApiErrorKind, message: string, options: { code?: string; httpStatus?: number } = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.code = options.code ?? null
    this.httpStatus = options.httpStatus ?? null
  }

  /** Indica se um "Tentar novamente" tem chance real de funcionar (não é um erro de validação/regra permanente). */
  get isRetryable(): boolean {
    return RETRYABLE_KINDS.has(this.kind)
  }
}

export function apiErrorFromServerCode(code: string, message: string, httpStatus: number): ApiError {
  return new ApiError(CODE_TO_KIND[code] ?? 'internal', message, { code, httpStatus })
}
