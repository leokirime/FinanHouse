/**
 * Classificação fina do erro de uma tentativa de conexão inicial com o
 * banco — usada apenas pela política de retry de inicialização
 * (`connect-with-retry.ts`). Deliberadamente separada de
 * `sanitize-error.ts` (`categorizeConnectionError`): aquela função é
 * reaproveitada por mais de dez scripts e por `persistence-errors.ts`, cujas
 * categorias já são um contrato estável — não pode mudar aqui. Nunca
 * inspeciona `message` (pode conter host/usuário/porta), apenas `code`, um
 * identificador estável do driver mysql2/Node.
 */
export interface ConnectionErrorClassification {
  category: string
  code: string
  /** Só erros transitórios (rede/handshake/indisponibilidade momentânea) são elegíveis a retry. */
  transient: boolean
}

interface DriverErrorLike {
  code?: unknown
  message?: unknown
}

function hasProperties(value: unknown): value is DriverErrorLike {
  return typeof value === 'object' && value !== null
}

function extractCode(error: unknown): string {
  if (hasProperties(error) && typeof error.code === 'string' && error.code.length > 0) {
    return error.code
  }
  return 'UNKNOWN'
}

function isPoolClosed(error: unknown): boolean {
  if (!hasProperties(error) || typeof error.message !== 'string') return false
  return error.message.toLowerCase().includes('pool is closed')
}

const DNS_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN'])
const TIMEOUT_CODES = new Set(['ETIMEDOUT'])
const REFUSED_CODES = new Set(['ECONNREFUSED', 'EHOSTUNREACH'])
const RESET_CODES = new Set(['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'EPIPE'])
const AUTH_CODES = new Set(['ER_ACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR'])
const UNKNOWN_DATABASE_CODES = new Set(['ER_BAD_DB_ERROR'])
const TLS_CODES = new Set([
  'HANDSHAKE_SSL_ERROR',
  'HANDSHAKE_NO_SSL_SUPPORT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'ERR_TLS_CERT_ALTNAME_INVALID',
])
const CONNECTION_LIMIT_CODES = new Set(['ER_CON_COUNT_ERROR', 'ER_USER_LIMIT_REACHED'])

/**
 * Erros de rede/handshake/indisponibilidade momentânea do lado do servidor
 * — únicos elegíveis a retry na inicialização (ver `connect-with-retry.ts`).
 * Erros de credencial, certificado, banco inexistente ou SQL estrutural
 * nunca são retentados, mesmo que o código pareça "transitório" à primeira
 * vista — evita mascarar uma falha real de configuração.
 */
export function classifyDatabaseConnectionError(error: unknown): ConnectionErrorClassification {
  if (isPoolClosed(error)) {
    return { category: 'pool de conexões fechado', code: 'POOL_CLOSED', transient: false }
  }

  const code = extractCode(error)

  if (DNS_CODES.has(code)) return { category: 'falha de resolução de DNS', code, transient: true }
  if (TIMEOUT_CODES.has(code)) return { category: 'tempo de conexão esgotado', code, transient: true }
  if (REFUSED_CODES.has(code)) return { category: 'conexão recusada', code, transient: true }
  if (RESET_CODES.has(code)) return { category: 'conexão resetada', code, transient: true }
  if (AUTH_CODES.has(code)) return { category: 'autenticação recusada pelo servidor', code, transient: false }
  if (UNKNOWN_DATABASE_CODES.has(code)) return { category: 'banco de dados inexistente', code, transient: false }
  if (TLS_CODES.has(code)) return { category: 'incompatibilidade de TLS/certificado', code, transient: false }
  if (CONNECTION_LIMIT_CODES.has(code)) return { category: 'limite de conexões atingido', code, transient: true }
  if (code.startsWith('ER_')) return { category: 'erro SQL', code, transient: false }

  return { category: 'erro de conexão não classificado', code, transient: false }
}
