import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATION_PATH = path.resolve(__dirname, '../../../../database/migrations/0000_initial_financial_domain.sql')
const DRIZZLE_CONFIG_PATH = path.resolve(__dirname, '../../drizzle.config.ts')

const DESTRUCTIVE_STATEMENT_PATTERN = /^\s*(DROP|TRUNCATE|DELETE|INSERT|GRANT|REVOKE)\b/im

describe('migration inicial (0000_initial_financial_domain.sql) — não acessa o banco', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf-8')

  it('não contém comandos destrutivos ou de escrita de dados', () => {
    expect(sql).not.toMatch(DESTRUCTIVE_STATEMENT_PATTERN)
  })

  it('cria exatamente seis tabelas', () => {
    const matches = sql.match(/^CREATE TABLE/gim) ?? []
    expect(matches).toHaveLength(6)
  })

  it('não contém credenciais, host ou nome de banco real', () => {
    expect(sql.toLowerCase()).not.toMatch(/clever-cloud|password\s*[:=]|mysql:\/\//)
  })

  it('usa DECIMAL para valores monetários, nunca FLOAT/DOUBLE', () => {
    expect(sql).not.toMatch(/\bfloat\b|\bdouble\b/i)
    expect(sql).toMatch(/decimal\(13,2\)/)
  })

  it('usa o vocabulário previsto/realizado — sem "paid" ou "payment_date"', () => {
    expect(sql.toLowerCase()).not.toMatch(/\bpaid\b|payment_date/)
    expect(sql).toMatch(/'realized'/)
    expect(sql).toMatch(/realization_date/)
  })

  it('declara as foreign keys compostas de period_id e category_id com household_id', () => {
    expect(sql).toMatch(
      /FOREIGN KEY \(`period_id`,`household_id`\) REFERENCES `monthly_periods`\(`id`,`household_id`\) ON DELETE restrict/,
    )
    expect(sql).toMatch(
      /FOREIGN KEY \(`category_id`,`household_id`\) REFERENCES `categories`\(`id`,`household_id`\) ON DELETE restrict/,
    )
  })

  it('declara unique(id, household_id) em categories e monthly_periods (alvo das FKs compostas)', () => {
    expect(sql).toMatch(/categories_id_household_id_unique.*UNIQUE\(`id`,`household_id`\)/)
    expect(sql).toMatch(/monthly_periods_id_household_id_unique.*UNIQUE\(`id`,`household_id`\)/)
  })
})

describe('drizzle.config.ts — não contém credenciais', () => {
  const config = readFileSync(DRIZZLE_CONFIG_PATH, 'utf-8')

  it('não declara dbCredentials nem valores de conexão', () => {
    expect(config).not.toMatch(/dbCredentials/)
    expect(config).not.toMatch(/password|DATABASE_HOST|DATABASE_USER|DATABASE_PASSWORD/i)
  })
})
