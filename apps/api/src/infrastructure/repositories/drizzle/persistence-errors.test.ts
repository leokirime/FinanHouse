import { describe, expect, it } from 'vitest'
import {
  CheckConstraintViolationError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  DuplicateRecordError,
  ForeignKeyViolationError,
  HouseholdScopeViolationError,
  PersistenceError,
  UnexpectedPersistenceError,
  translatePersistenceError,
} from './persistence-errors.js'

describe('translatePersistenceError', () => {
  it('traduz ER_DUP_ENTRY para DuplicateRecordError', () => {
    const error = translatePersistenceError({ code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry 'x' for key 'y'" })
    expect(error).toBeInstanceOf(DuplicateRecordError)
    expect(error.category).toBe('conflito-de-unicidade')
  })

  it('traduz ER_NO_REFERENCED_ROW_2 para ForeignKeyViolationError', () => {
    const error = translatePersistenceError({ code: 'ER_NO_REFERENCED_ROW_2', sqlMessage: 'Cannot add or update a child row' })
    expect(error).toBeInstanceOf(ForeignKeyViolationError)
  })

  it('traduz ER_ROW_IS_REFERENCED_2 para ForeignKeyViolationError', () => {
    const error = translatePersistenceError({ code: 'ER_ROW_IS_REFERENCED_2', sqlMessage: 'Cannot delete or update a parent row' })
    expect(error).toBeInstanceOf(ForeignKeyViolationError)
  })

  it('traduz ER_CHECK_CONSTRAINT_VIOLATED para CheckConstraintViolationError', () => {
    const error = translatePersistenceError({ code: 'ER_CHECK_CONSTRAINT_VIOLATED', sqlMessage: 'Check constraint violated' })
    expect(error).toBeInstanceOf(CheckConstraintViolationError)
  })

  it('traduz ER_LOCK_WAIT_TIMEOUT para DatabaseTimeoutError', () => {
    const error = translatePersistenceError({ code: 'ER_LOCK_WAIT_TIMEOUT', sqlMessage: 'Lock wait timeout exceeded' })
    expect(error).toBeInstanceOf(DatabaseTimeoutError)
  })

  it('reconhece violação da FK composta do membro responsável como HouseholdScopeViolationError', () => {
    const error = translatePersistenceError({
      code: 'ER_NO_REFERENCED_ROW_2',
      sqlMessage:
        "Cannot add or update a child row: a foreign key constraint fails (`finanhouse_dev`.`financial_entries`, CONSTRAINT `financial_entries_responsible_member_household_fk` FOREIGN KEY (...))",
    })
    expect(error).toBeInstanceOf(HouseholdScopeViolationError)
    expect(error.category).toBe('conflito-de-household')
  })

  it('reconhece violação da CHECK de consistência do membro responsável como HouseholdScopeViolationError', () => {
    const error = translatePersistenceError({
      code: 'ER_CHECK_CONSTRAINT_VIOLATED',
      sqlMessage: "Check constraint 'financial_entries_responsible_member_household_check' is violated.",
    })
    expect(error).toBeInstanceOf(HouseholdScopeViolationError)
  })

  it('traduz erro de conexão (ENOTFOUND) reaproveitando categorizeConnectionError', () => {
    const error = translatePersistenceError(new Error('getaddrinfo ENOTFOUND minha-instancia.aivencloud.com'))
    expect(error).toBeInstanceOf(DatabaseConnectionError)
    expect(error.category).toBe('erro-de-conexao')
  })

  it('traduz erro de timeout de conexão (ETIMEDOUT) para DatabaseTimeoutError', () => {
    const error = translatePersistenceError(new Error('connect ETIMEDOUT'))
    expect(error).toBeInstanceOf(DatabaseTimeoutError)
  })

  it('cai em UnexpectedPersistenceError para erro totalmente desconhecido', () => {
    const error = translatePersistenceError(new Error('algo inesperado'))
    expect(error).toBeInstanceOf(UnexpectedPersistenceError)
    expect(error.category).toBe('erro-inesperado')
  })

  it('retorna o próprio erro quando já é um PersistenceError', () => {
    const original = new DuplicateRecordError('já traduzido')
    expect(translatePersistenceError(original)).toBe(original)
  })

  it('nunca inclui host, usuário, senha ou Service URI na mensagem pública', () => {
    const error = translatePersistenceError(
      new Error('connect ECONNREFUSED minha-instancia-secreta.aivencloud.com:12345 user=finanhouse_dev_app'),
    )
    expect(error.message).not.toMatch(/aivencloud|12345|finanhouse_dev_app/)
  })

  it('mantém o erro original apenas em cause, nunca na message', () => {
    const originalError = { code: 'ER_DUP_ENTRY', sqlMessage: 'Duplicate entry sensitive-value for key x' }
    const error = translatePersistenceError(originalError) as PersistenceError
    expect(error.message).not.toContain('sensitive-value')
    expect(error.cause).toBe(originalError)
  })

  describe('erros envolvidos em DrizzleQueryError (bug real encontrado no smoke-test do Bloco 14)', () => {
    /**
     * O Drizzle envolve todo erro de query real em `DrizzleQueryError` — uma
     * classe `Error` própria cuja `message` é só "Failed query: ... params:
     * ...", nunca com `code`/`sqlMessage` diretamente nela. O erro do
     * mysql2 (com `code`/`sqlMessage`) fica em `.cause`. Simula esse
     * formato sem depender do drizzle-orm real.
     */
    function buildDrizzleQueryError(driverError: { code: string; sqlMessage?: string }): Error {
      const wrapper = new Error('Failed query: insert into `financial_entries` (...) values (...)\nparams: 1,2,3')
      ;(wrapper as Error & { cause?: unknown }).cause = driverError
      return wrapper
    }

    it('desembrulha DrizzleQueryError e traduz ER_DUP_ENTRY corretamente', () => {
      const wrapped = buildDrizzleQueryError({ code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry 'x' for key 'y'" })
      const error = translatePersistenceError(wrapped)
      expect(error).toBeInstanceOf(DuplicateRecordError)
    })

    it('desembrulha DrizzleQueryError e reconhece violação da FK composta do membro responsável', () => {
      const wrapped = buildDrizzleQueryError({
        code: 'ER_NO_REFERENCED_ROW_2',
        sqlMessage:
          "Cannot add or update a child row: a foreign key constraint fails (CONSTRAINT `financial_entries_responsible_member_household_fk`)",
      })
      const error = translatePersistenceError(wrapped)
      expect(error).toBeInstanceOf(HouseholdScopeViolationError)
    })

    it('não trata DrizzleQueryError como erro genérico quando a causa tem código reconhecível', () => {
      const wrapped = buildDrizzleQueryError({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' })
      const error = translatePersistenceError(wrapped)
      expect(error).toBeInstanceOf(CheckConstraintViolationError)
      expect(error).not.toBeInstanceOf(UnexpectedPersistenceError)
    })

    it('preserva o fallback genérico quando a causa não tem código reconhecível', () => {
      const wrapper = new Error('Failed query: select 1')
      ;(wrapper as Error & { cause?: unknown }).cause = new Error('algo sem código')
      const error = translatePersistenceError(wrapper)
      expect(error).toBeInstanceOf(UnexpectedPersistenceError)
    })
  })
})
