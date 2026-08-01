import { describe, expect, it } from 'vitest'
import {
  assertResponsibleMemberAfterState,
  assertResponsibleMemberBeforeState,
  type ResponsibleMemberAfterStateInput,
  type ResponsibleMemberBeforeStateInput,
} from './responsible-member-integrity-audit.js'
import { EXPECTED_APPLICATION_TABLES, SchemaAuditError } from './schema-audit.js'

const zeroRowCounts = Object.fromEntries(EXPECTED_APPLICATION_TABLES.map((table) => [table, 0]))

function validBeforeInput(overrides: Partial<ResponsibleMemberBeforeStateInput> = {}): ResponsibleMemberBeforeStateInput {
  return {
    existingApplicationTables: [...EXPECTED_APPLICATION_TABLES],
    migrationsRows: [{ hash: 'hash-0000' }],
    rowCounts: zeroRowCounts,
    auxiliaryColumnExists: false,
    oldSimpleForeignKeyExists: true,
    newCompositeForeignKeyExists: false,
    ...overrides,
  }
}

function validAfterInput(overrides: Partial<ResponsibleMemberAfterStateInput> = {}): ResponsibleMemberAfterStateInput {
  return {
    existingApplicationTables: [...EXPECTED_APPLICATION_TABLES],
    migrationsRows: [{ hash: 'hash-0000' }, { hash: 'hash-0001' }],
    rowCounts: zeroRowCounts,
    auxiliaryColumnExists: true,
    auxiliaryColumnNullable: true,
    parentUniqueIndexExists: true,
    childIndexExists: true,
    oldSimpleForeignKeyExists: false,
    newCompositeForeignKeyExists: true,
    newForeignKeyDeleteRule: 'RESTRICT',
    checkConstraintExists: true,
    ...overrides,
  }
}

describe('assertResponsibleMemberBeforeState', () => {
  it('aceita o estado pré-correção esperado (seis tabelas, uma migration, tabelas vazias, FK simples presente, nada da correção ainda)', () => {
    expect(() => assertResponsibleMemberBeforeState(validBeforeInput())).not.toThrow()
  })

  it('rejeita quando alguma tabela da aplicação está ausente', () => {
    expect(() =>
      assertResponsibleMemberBeforeState(
        validBeforeInput({ existingApplicationTables: EXPECTED_APPLICATION_TABLES.filter((t) => t !== 'users') }),
      ),
    ).toThrow(SchemaAuditError)
  })

  it('rejeita quando o journal não tem exatamente uma migration registrada', () => {
    expect(() => assertResponsibleMemberBeforeState(validBeforeInput({ migrationsRows: [] }))).toThrow(SchemaAuditError)
    expect(() =>
      assertResponsibleMemberBeforeState(validBeforeInput({ migrationsRows: [{ hash: 'a' }, { hash: 'b' }] })),
    ).toThrow(SchemaAuditError)
  })

  it('rejeita quando alguma tabela contém registros (estado parcial)', () => {
    expect(() =>
      assertResponsibleMemberBeforeState(validBeforeInput({ rowCounts: { ...zeroRowCounts, financial_entries: 1 } })),
    ).toThrow(SchemaAuditError)
  })

  it('rejeita quando a coluna auxiliar já existe antes da migration', () => {
    expect(() => assertResponsibleMemberBeforeState(validBeforeInput({ auxiliaryColumnExists: true }))).toThrow(
      SchemaAuditError,
    )
  })

  it('rejeita quando a FK simples antiga não está presente', () => {
    expect(() => assertResponsibleMemberBeforeState(validBeforeInput({ oldSimpleForeignKeyExists: false }))).toThrow(
      SchemaAuditError,
    )
  })

  it('rejeita quando a FK composta nova já existe antes da migration', () => {
    expect(() =>
      assertResponsibleMemberBeforeState(validBeforeInput({ newCompositeForeignKeyExists: true })),
    ).toThrow(SchemaAuditError)
  })
})

describe('assertResponsibleMemberAfterState', () => {
  it('aceita o estado pós-correção esperado (seis tabelas, duas migrations, coluna auxiliar nullable, FK composta RESTRICT, CHECK presente, tabelas vazias)', () => {
    expect(() => assertResponsibleMemberAfterState(validAfterInput())).not.toThrow()
  })

  it('rejeita quando alguma tabela da aplicação está ausente', () => {
    expect(() =>
      assertResponsibleMemberAfterState(
        validAfterInput({ existingApplicationTables: EXPECTED_APPLICATION_TABLES.filter((t) => t !== 'household_members') }),
      ),
    ).toThrow(SchemaAuditError)
  })

  it('rejeita quando o journal não tem exatamente duas migrations registradas', () => {
    expect(() =>
      assertResponsibleMemberAfterState(validAfterInput({ migrationsRows: [{ hash: 'hash-0000' }] })),
    ).toThrow(SchemaAuditError)
  })

  it('rejeita quando alguma tabela contém registros', () => {
    expect(() =>
      assertResponsibleMemberAfterState(validAfterInput({ rowCounts: { ...zeroRowCounts, users: 2 } })),
    ).toThrow(SchemaAuditError)
  })

  it('rejeita quando a coluna auxiliar está ausente', () => {
    expect(() => assertResponsibleMemberAfterState(validAfterInput({ auxiliaryColumnExists: false }))).toThrow(
      SchemaAuditError,
    )
  })

  it('rejeita quando a coluna auxiliar não é nullable', () => {
    expect(() => assertResponsibleMemberAfterState(validAfterInput({ auxiliaryColumnNullable: false }))).toThrow(
      SchemaAuditError,
    )
  })

  it('rejeita quando o índice único pai (household_members) está ausente', () => {
    expect(() => assertResponsibleMemberAfterState(validAfterInput({ parentUniqueIndexExists: false }))).toThrow(
      SchemaAuditError,
    )
  })

  it('rejeita quando o índice das colunas filhas está ausente', () => {
    expect(() => assertResponsibleMemberAfterState(validAfterInput({ childIndexExists: false }))).toThrow(
      SchemaAuditError,
    )
  })

  it('rejeita quando a FK simples antiga ainda está presente', () => {
    expect(() => assertResponsibleMemberAfterState(validAfterInput({ oldSimpleForeignKeyExists: true }))).toThrow(
      SchemaAuditError,
    )
  })

  it('rejeita quando a FK composta nova está ausente', () => {
    expect(() =>
      assertResponsibleMemberAfterState(validAfterInput({ newCompositeForeignKeyExists: false })),
    ).toThrow(SchemaAuditError)
  })

  it('rejeita quando DELETE_RULE não é RESTRICT (ex.: SET NULL não é mais aceito — incompatível com a CHECK, erro 3823)', () => {
    expect(() =>
      assertResponsibleMemberAfterState(validAfterInput({ newForeignKeyDeleteRule: 'SET NULL' })),
    ).toThrow(SchemaAuditError)
    expect(() =>
      assertResponsibleMemberAfterState(validAfterInput({ newForeignKeyDeleteRule: 'CASCADE' })),
    ).toThrow(SchemaAuditError)
    expect(() => assertResponsibleMemberAfterState(validAfterInput({ newForeignKeyDeleteRule: null }))).toThrow(
      SchemaAuditError,
    )
  })

  it('rejeita quando a CHECK constraint está ausente', () => {
    expect(() => assertResponsibleMemberAfterState(validAfterInput({ checkConstraintExists: false }))).toThrow(
      SchemaAuditError,
    )
  })
})

describe('proteção contra vazamento de dados sensíveis', () => {
  it('mensagens de erro nunca mencionam host, porta, usuário ou senha', () => {
    const sensitiveMarkers = ['DATABASE_HOST', 'DATABASE_PASSWORD', 'DATABASE_USER', 'password', 'host=', 'port=']
    try {
      assertResponsibleMemberBeforeState(validBeforeInput({ oldSimpleForeignKeyExists: false }))
      throw new Error('deveria ter lançado SchemaAuditError')
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaAuditError)
      const message = (error as Error).message
      for (const marker of sensitiveMarkers) {
        expect(message).not.toContain(marker)
      }
    }
  })
})
