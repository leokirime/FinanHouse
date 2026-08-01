import { categorizeConnectionError } from '../../../db/sanitize-error.js'

export type PersistenceErrorCategory =
  | 'conflito-de-unicidade'
  | 'violacao-de-integridade-referencial'
  | 'violacao-de-restricao-check'
  | 'conflito-de-household'
  | 'erro-de-conexao'
  | 'tempo-esgotado'
  | 'valor-persistido-inesperado'
  | 'erro-inesperado'

/**
 * Erro de persistência traduzido a partir de um erro de driver
 * (mysql2/Drizzle). Nunca expõe host, porta, usuário, senha, Service URI,
 * query com valores sensíveis, configuração do pool ou o objeto bruto do
 * mysql2 em `message`/`category` — apenas uma categoria estável e uma
 * mensagem fixa. O erro original fica disponível apenas em `cause` (ES2022),
 * como causa interna controlada — nunca deve ser logado/impresso por quem
 * consome os repositórios; existe só para depuração interna, se necessário.
 */
export class PersistenceError extends Error {
  readonly category: PersistenceErrorCategory

  constructor(category: PersistenceErrorCategory, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = new.target.name
    this.category = category
  }
}

export class DuplicateRecordError extends PersistenceError {
  constructor(message: string, cause?: unknown) {
    super('conflito-de-unicidade', message, { cause })
  }
}

export class ForeignKeyViolationError extends PersistenceError {
  constructor(message: string, cause?: unknown) {
    super('violacao-de-integridade-referencial', message, { cause })
  }
}

export class CheckConstraintViolationError extends PersistenceError {
  constructor(message: string, cause?: unknown) {
    super('violacao-de-restricao-check', message, { cause })
  }
}

/**
 * Violação especificamente das foreign keys/CHECK compostas que garantem o
 * isolamento por household (período, categoria ou membro responsável de um
 * household diferente do da movimentação) — ver DT-09 e
 * `database/proposed-schema/relacionamentos.md`.
 */
export class HouseholdScopeViolationError extends PersistenceError {
  constructor(message: string, cause?: unknown) {
    super('conflito-de-household', message, { cause })
  }
}

export class DatabaseConnectionError extends PersistenceError {
  constructor(message: string, cause?: unknown) {
    super('erro-de-conexao', message, { cause })
  }
}

export class DatabaseTimeoutError extends PersistenceError {
  constructor(message: string, cause?: unknown) {
    super('tempo-esgotado', message, { cause })
  }
}

/** Lançado quando uma coluna de enum/status contém um valor fora das constantes conhecidas do domínio. */
export class UnexpectedPersistedValueError extends PersistenceError {
  constructor(message: string) {
    super('valor-persistido-inesperado', message)
  }
}

export class UnexpectedPersistenceError extends PersistenceError {
  constructor(message: string, cause?: unknown) {
    super('erro-inesperado', message, { cause })
  }
}

interface MysqlDriverErrorLike {
  code?: string
  sqlMessage?: string
  message?: string
}

/**
 * Nomes das constraints compostas que existem exclusivamente para impor o
 * isolamento por household (DT-09, Bloco 03/13) — são identificadores de
 * schema estáveis, não segredos nem dados de usuário. Usados apenas para
 * categorizar o erro; nunca ecoados na mensagem pública.
 */
const HOUSEHOLD_SCOPE_CONSTRAINT_NAMES = [
  'financial_entries_period_household_fk',
  'financial_entries_category_household_fk',
  'financial_entries_responsible_member_household_fk',
  'financial_entries_responsible_member_household_check',
]

function mentionsHouseholdScopeConstraint(driverError: MysqlDriverErrorLike): boolean {
  const text = `${driverError.sqlMessage ?? ''} ${driverError.message ?? ''}`
  return HOUSEHOLD_SCOPE_CONSTRAINT_NAMES.some((name) => text.includes(name))
}

function hasErrorCode(value: unknown): value is MysqlDriverErrorLike {
  return typeof value === 'object' && value !== null && 'code' in value
}

/**
 * O Drizzle envolve todo erro de query em `DrizzleQueryError`, cuja própria
 * `message` é só "Failed query: ... params: ..." — o erro real do driver
 * mysql2 (com `code`/`sqlMessage`) fica um nível abaixo, em `.cause`. Sem
 * este unwrap, toda falha de query real (incluindo violações de FK/CHECK)
 * caía no fallback genérico `UnexpectedPersistenceError`, nunca nas
 * categorias específicas abaixo — bug encontrado e corrigido durante o
 * smoke-test do Bloco 14 (ver DT-10).
 */
function unwrapDriverError(error: unknown): MysqlDriverErrorLike {
  if (hasErrorCode(error)) return error
  if (error instanceof Error && hasErrorCode(error.cause)) return error.cause
  return (error ?? {}) as MysqlDriverErrorLike
}

/**
 * Traduz qualquer erro capturado ao redor de uma operação de repositório
 * Drizzle para um `PersistenceError` sanitizado. Reconhece pelo `code`
 * estável do mysql2 (nunca pela mensagem bruta, que pode conter valores) e,
 * para erros de conexão, reaproveita `categorizeConnectionError` — a mesma
 * função usada pelos scripts de banco desde o Bloco 13.
 */
export function translatePersistenceError(error: unknown): PersistenceError {
  if (error instanceof PersistenceError) return error

  const driverError = unwrapDriverError(error)
  const code = driverError.code ?? ''

  if (mentionsHouseholdScopeConstraint(driverError)) {
    return new HouseholdScopeViolationError(
      'Operação viola o isolamento por household: período, categoria ou membro responsável pertence a outro household.',
      error,
    )
  }

  if (code === 'ER_DUP_ENTRY') {
    return new DuplicateRecordError('Registro duplicado — violação de restrição de unicidade.', error)
  }

  if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_NO_REFERENCED_ROW') {
    return new ForeignKeyViolationError('Referência inválida — o registro relacionado não existe.', error)
  }

  if (code === 'ER_ROW_IS_REFERENCED_2' || code === 'ER_ROW_IS_REFERENCED') {
    return new ForeignKeyViolationError('Registro ainda referenciado por outro — operação bloqueada.', error)
  }

  if (code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return new CheckConstraintViolationError('Violação de restrição de integridade (CHECK).', error)
  }

  if (code === 'ER_LOCK_WAIT_TIMEOUT') {
    return new DatabaseTimeoutError('Tempo de espera por bloqueio no banco esgotado.', error)
  }

  const message = driverError.message ?? (error instanceof Error ? error.message : String(error))
  const connectionCategory = categorizeConnectionError(message)
  if (connectionCategory !== 'erro de banco de dados não classificado') {
    if (connectionCategory === 'tempo de conexão esgotado') {
      return new DatabaseTimeoutError(`Falha de conexão: ${connectionCategory}.`, error)
    }
    return new DatabaseConnectionError(`Falha de conexão: ${connectionCategory}.`, error)
  }

  return new UnexpectedPersistenceError('Erro inesperado de persistência.', error)
}
