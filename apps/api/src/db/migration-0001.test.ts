import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATION_PATH = path.resolve(__dirname, '../../../../database/migrations/0001_responsible_member_household_integrity.sql')
const INITIAL_MIGRATION_PATH = path.resolve(__dirname, '../../../../database/migrations/0000_initial_financial_domain.sql')

const DESTRUCTIVE_STATEMENT_PATTERN = /^\s*(DROP|TRUNCATE|DELETE|INSERT|GRANT|REVOKE)\b/im

describe('migration incremental (0001_responsible_member_household_integrity.sql) — não acessa o banco', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf-8')

  it('não contém comandos destrutivos de linha (DROP TABLE/TRUNCATE/DELETE/INSERT) — só "ALTER TABLE ... DROP FOREIGN KEY" é permitido', () => {
    expect(sql).not.toMatch(DESTRUCTIVE_STATEMENT_PATTERN)
    expect(sql.toUpperCase()).not.toMatch(/DROP\s+TABLE/)
    expect(sql.toUpperCase()).not.toMatch(/DROP\s+COLUMN/)
  })

  it('remove exclusivamente a FK simples antiga de responsible_member_id, uma única vez', () => {
    expect(sql).toMatch(/DROP FOREIGN KEY `financial_entries_responsible_member_id_household_members_id_fk`/)
    const dropForeignKeyMatches = sql.match(/DROP FOREIGN KEY/g) ?? []
    expect(dropForeignKeyMatches).toHaveLength(1)
  })

  it('adiciona a coluna auxiliar responsible_member_household_id como nullable (sem NOT NULL)', () => {
    expect(sql).toMatch(/ADD `responsible_member_household_id` bigint unsigned;/)
  })

  it('adiciona unique(id, household_id) em household_members, alvo da nova FK composta', () => {
    expect(sql).toMatch(/household_members_id_household_id_unique.*UNIQUE\(`id`,`household_id`\)/)
  })

  it('adiciona a CHECK constraint de consistência entre responsible_member_household_id e household_id', () => {
    expect(sql).toMatch(/financial_entries_responsible_member_household_check/)
    expect(sql).toMatch(/responsible_member_household_id`\s*=\s*`financial_entries`\.`household_id`/)
  })

  it('adiciona a FK composta com ON DELETE RESTRICT sobre (responsible_member_id, responsible_member_household_id) — não SET NULL: MySQL proíbe SET NULL em coluna também usada em CHECK (erro 3823)', () => {
    expect(sql).toMatch(
      /FOREIGN KEY \(`responsible_member_id`,`responsible_member_household_id`\) REFERENCES `household_members`\(`id`,`household_id`\) ON DELETE restrict/,
    )
  })

  it('cria índice para as colunas filhas da nova FK composta', () => {
    expect(sql).toMatch(
      /CREATE INDEX `financial_entries_responsible_member_household_idx` ON `financial_entries` \(`responsible_member_id`,`responsible_member_household_id`\)/,
    )
  })

  it('não contém credenciais, host ou nome de provedor real', () => {
    expect(sql.toLowerCase()).not.toMatch(/clever-cloud|aivencloud|password\s*[:=]|mysql:\/\//)
  })

  it('não altera valores financeiros nem colunas monetárias existentes', () => {
    expect(sql).not.toMatch(/expected_amount|actual_amount/i)
  })

  it('não menciona a tabela category_budgets nem qualquer extensão futura fora de escopo', () => {
    expect(sql).not.toMatch(/category_budgets|recurrence_rules|installment_plans|period_status_history/i)
  })
})

describe('migration inicial (0000) permanece intacta após a migration incremental', () => {
  const sql = readFileSync(INITIAL_MIGRATION_PATH, 'utf-8')

  it('continua criando exatamente seis tabelas', () => {
    const matches = sql.match(/^CREATE TABLE/gim) ?? []
    expect(matches).toHaveLength(6)
  })

  it('continua declarando a FK simples original de responsible_member_id (removida apenas pela migration 0001, não editada aqui)', () => {
    expect(sql).toMatch(
      /FOREIGN KEY \(`responsible_member_id`\) REFERENCES `household_members`\(`id`\) ON DELETE set null/,
    )
  })
})
