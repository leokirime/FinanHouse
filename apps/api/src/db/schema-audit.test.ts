import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  assertAfterState,
  assertAuditEnvironmentAllowed,
  assertBeforeState,
  EXPECTED_APPLICATION_TABLES,
  parseAuditPhase,
  SchemaAuditError,
} from './schema-audit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT_SCRIPT_PATH = path.resolve(__dirname, '../../scripts/db-audit-schema.ts')

describe('parseAuditPhase', () => {
  it('rejeita fase inválida ou ausente', () => {
    expect(() => parseAuditPhase([])).toThrow(SchemaAuditError)
    expect(() => parseAuditPhase(['--phase=invalid'])).toThrow(SchemaAuditError)
  })

  it('aceita --phase=before', () => {
    expect(parseAuditPhase(['--phase=before'])).toBe('before')
  })

  it('aceita --phase=after', () => {
    expect(parseAuditPhase(['--phase=after'])).toBe('after')
  })
})

describe('assertAuditEnvironmentAllowed', () => {
  it('aceita development com finanhouse_dev', () => {
    expect(() => assertAuditEnvironmentAllowed({ environment: 'development', database: 'finanhouse_dev' })).not.toThrow()
  })

  it('rejeita production', () => {
    expect(() => assertAuditEnvironmentAllowed({ environment: 'production', database: 'finanhouse_prod' })).toThrow(
      SchemaAuditError,
    )
  })

  it('rejeita banco errado mesmo em development', () => {
    expect(() => assertAuditEnvironmentAllowed({ environment: 'development', database: 'finanhouse_prod' })).toThrow(
      SchemaAuditError,
    )
  })
})

describe('assertBeforeState', () => {
  it('aceita schema vazio (nenhuma tabela, nenhum journal)', () => {
    expect(() => assertBeforeState({ existingApplicationTables: [], migrationsTableExists: false })).not.toThrow()
  })

  it('rejeita quando alguma tabela da aplicação já existe (estado parcial)', () => {
    expect(() =>
      assertBeforeState({ existingApplicationTables: ['users'], migrationsTableExists: false }),
    ).toThrow(SchemaAuditError)
  })

  it('rejeita quando o journal de migration já existe', () => {
    expect(() => assertBeforeState({ existingApplicationTables: [], migrationsTableExists: true })).toThrow(
      SchemaAuditError,
    )
  })
})

describe('assertAfterState', () => {
  const allTablesZeroRows = Object.fromEntries(EXPECTED_APPLICATION_TABLES.map((table) => [table, 0]))

  it('aceita as seis tabelas, journal com uma migration e zero registros', () => {
    expect(() =>
      assertAfterState({
        existingApplicationTables: [...EXPECTED_APPLICATION_TABLES],
        migrationsRows: [{ hash: 'abc123' }],
        rowCounts: allTablesZeroRows,
      }),
    ).not.toThrow()
  })

  it('rejeita quando alguma tabela está ausente', () => {
    const incomplete = EXPECTED_APPLICATION_TABLES.filter((table) => table !== 'users')
    expect(() =>
      assertAfterState({
        existingApplicationTables: [...incomplete],
        migrationsRows: [{ hash: 'abc123' }],
        rowCounts: allTablesZeroRows,
      }),
    ).toThrow(SchemaAuditError)
  })

  it('rejeita quando o journal está ausente (nenhuma linha de migration)', () => {
    expect(() =>
      assertAfterState({
        existingApplicationTables: [...EXPECTED_APPLICATION_TABLES],
        migrationsRows: [],
        rowCounts: allTablesZeroRows,
      }),
    ).toThrow(SchemaAuditError)
  })

  it('rejeita quando nenhuma migration está registrada no journal (linhas vazias)', () => {
    expect(() =>
      assertAfterState({
        existingApplicationTables: [...EXPECTED_APPLICATION_TABLES],
        migrationsRows: [],
        rowCounts: allTablesZeroRows,
      }),
    ).toThrow(/journal/)
  })

  it('rejeita quando alguma tabela contém registros (estado inicial esperado é zero)', () => {
    expect(() =>
      assertAfterState({
        existingApplicationTables: [...EXPECTED_APPLICATION_TABLES],
        migrationsRows: [{ hash: 'abc123' }],
        rowCounts: { ...allTablesZeroRows, users: 1 },
      }),
    ).toThrow(SchemaAuditError)
  })
})

describe('proteção contra vazamento de dados sensíveis', () => {
  it('mensagens de erro nunca mencionam host, porta, usuário, senha ou variáveis de conexão', () => {
    const sensitiveMarkers = ['DATABASE_HOST', 'DATABASE_PASSWORD', 'DATABASE_USER', 'password', 'host=', 'port=']

    const errors = [
      () => parseAuditPhase([]),
      () => assertAuditEnvironmentAllowed({ environment: 'production', database: 'finanhouse_prod' }),
      () => assertBeforeState({ existingApplicationTables: ['users'], migrationsTableExists: false }),
      () =>
        assertAfterState({
          existingApplicationTables: [],
          migrationsRows: [],
          rowCounts: {},
        }),
    ]

    for (const run of errors) {
      try {
        run()
        throw new Error('deveria ter lançado SchemaAuditError')
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaAuditError)
        const message = (error as Error).message
        for (const marker of sensitiveMarkers) {
          expect(message).not.toContain(marker)
        }
      }
    }
  })
})

describe('apps/api/scripts/db-audit-schema.ts — não contém comandos destrutivos', () => {
  const source = readFileSync(AUDIT_SCRIPT_PATH, 'utf-8')
  const DESTRUCTIVE_STATEMENT_PATTERN = /\b(DROP|TRUNCATE|DELETE|INSERT|UPDATE|ALTER|GRANT|REVOKE)\s/i

  it('só executa consultas de leitura (information_schema, SELECT, SHOW)', () => {
    expect(source).not.toMatch(DESTRUCTIVE_STATEMENT_PATTERN)
    expect(source).toMatch(/information_schema\.TABLES/)
    expect(source).toMatch(/SELECT COUNT\(\*\)/)
  })

  it('fecha a conexão em finally', () => {
    expect(source).toMatch(/finally\s*\{\s*await connection\.end\(\)/)
  })
})
