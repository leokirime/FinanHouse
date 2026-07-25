/**
 * Inventário somente leitura do MySQL já existente na Clever Cloud.
 *
 * Não execute isto automaticamente. Rode manualmente, depois de:
 *   1. preencher apps/api/.env.local com as credenciais reais;
 *   2. confirmar explicitamente ao agente que as credenciais foram preenchidas.
 *
 * Uso: npm run inspect:db
 *
 * Regras (ver Docs/03_contracts/contrato_banco_dados.md e
 * Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_02_inventario_seguro_do_banco_existente.md):
 * - Somente as consultas fixas abaixo são executadas. Nenhuma entrada externa vira SQL.
 * - Nenhum valor de credencial (nem host, porta, usuário, senha, nome do banco) é impresso
 *   em nenhuma saída — nem em sucesso, nem em erro.
 * - Nenhum conteúdo de linha (dados financeiros/pessoais) é lido ou registrado.
 * - Nenhuma escrita no banco (DDL/DML) ocorre neste script.
 * - Uma única conexão é aberta (sem pool) e sempre fechada em `finally`.
 * - Erros de SSL/TLS nunca são "corrigidos" automaticamente — o script apenas para e informa
 *   que a configuração precisa de revisão manual.
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { writeInventoryDocs } from './write-inventory-docs.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../../apps/api/.env.local')
const OUTPUT_DIR = path.resolve(__dirname, '../current-schema')
const DEFAULT_CONNECT_TIMEOUT = 10000

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(ENV_LOCAL_PATH)
  } catch {
    console.error(`Arquivo de credenciais não encontrado: ${ENV_LOCAL_PATH}`)
    console.error('Preencha apps/api/.env.local antes de rodar a inspeção.')
    process.exit(1)
  }
}

interface ValidationResult {
  ok: boolean
  connectTimeout: number
  useSsl: boolean
  invalidVars: string[]
  missingVars: string[]
}

function validateEnv(): ValidationResult {
  const missingVars: string[] = []
  const invalidVars: string[] = []
  const statusLines: string[] = []

  for (const key of ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'] as const) {
    const present = Boolean(process.env[key]?.trim())
    if (!present) missingVars.push(key)
    statusLines.push(`${key}: ${present ? 'configurado' : 'ausente'}`)
  }

  const portRaw = process.env.DATABASE_PORT
  const port = Number(portRaw)
  const portPresent = Boolean(portRaw?.trim())
  const portValid = portPresent && Number.isInteger(port) && port >= 1 && port <= 65535
  if (!portPresent) missingVars.push('DATABASE_PORT')
  else if (!portValid) invalidVars.push('DATABASE_PORT')
  statusLines.push(`DATABASE_PORT: ${!portPresent ? 'ausente' : portValid ? 'configurado' : 'formato inválido'}`)

  const sslRaw = process.env.DATABASE_SSL?.trim().toLowerCase()
  const sslPresent = Boolean(sslRaw)
  const sslValid = sslPresent && (sslRaw === 'true' || sslRaw === 'false')
  if (!sslPresent) missingVars.push('DATABASE_SSL')
  else if (!sslValid) invalidVars.push('DATABASE_SSL')
  statusLines.push(`DATABASE_SSL: ${!sslPresent ? 'ausente' : sslValid ? 'configurado' : 'formato inválido (use "true" ou "false")'}`)

  const timeoutRaw = process.env.DATABASE_CONNECT_TIMEOUT
  const timeoutPresent = Boolean(timeoutRaw?.trim())
  const timeoutValue = timeoutPresent ? Number(timeoutRaw) : DEFAULT_CONNECT_TIMEOUT
  const timeoutValid = !timeoutPresent || (Number.isFinite(timeoutValue) && timeoutValue > 0)
  if (timeoutPresent && !timeoutValid) invalidVars.push('DATABASE_CONNECT_TIMEOUT')
  statusLines.push(
    `DATABASE_CONNECT_TIMEOUT: ${!timeoutPresent ? 'padrão aplicado' : timeoutValid ? 'configurado' : 'formato inválido'}`,
  )

  console.log('Status das variáveis de ambiente (valores nunca são exibidos):')
  for (const line of statusLines) console.log(`  ${line}`)

  return {
    ok: missingVars.length === 0 && invalidVars.length === 0,
    connectTimeout: timeoutValid ? timeoutValue : DEFAULT_CONNECT_TIMEOUT,
    useSsl: sslValid && sslRaw === 'true',
    invalidVars,
    missingVars,
  }
}

async function main() {
  loadLocalEnv()
  const validation = validateEnv()

  if (!validation.ok) {
    console.error('\nInspeção interrompida. Variáveis pendentes:')
    for (const key of validation.missingVars) console.error(`  ausente: ${key}`)
    for (const key of validation.invalidVars) console.error(`  formato inválido: ${key}`)
    process.exit(1)
  }

  const configuredDatabaseName = process.env.DATABASE_NAME as string
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: configuredDatabaseName,
    ssl: validation.useSsl ? {} : undefined,
    connectTimeout: validation.connectTimeout,
  })

  try {
    const [[{ ok }]] = (await connection.query('SELECT 1 AS ok')) as any
    console.log(`\nConectividade: ${ok === 1 ? 'OK' : 'falhou'}`)

    const [[{ version }]] = (await connection.query('SELECT VERSION() AS version')) as any
    const [[{ db }]] = (await connection.query('SELECT DATABASE() AS db')) as any
    console.log(`Versão do MySQL: ${version}`)
    console.log(`Banco configurado corresponde ao banco ativo: ${db === configuredDatabaseName ? 'sim' : 'não'}`)

    const [tableRows] = (await connection.query(
      'SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, TABLE_ROWS FROM information_schema.tables WHERE TABLE_SCHEMA = ?',
      [db],
    )) as any
    console.log(`Tabelas encontradas: ${tableRows.length}`)

    const [columnRows] = (await connection.query(
      `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE,
              IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA
       FROM information_schema.columns WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      [db],
    )) as any

    const [indexRows] = (await connection.query(
      'SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX FROM information_schema.statistics WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX',
      [db],
    )) as any

    const [foreignKeyRows] = (await connection.query(
      'SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.key_column_usage WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL',
      [db],
    )) as any

    const [referentialRows] = (await connection.query(
      'SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME, UPDATE_RULE, DELETE_RULE FROM information_schema.referential_constraints WHERE CONSTRAINT_SCHEMA = ?',
      [db],
    )) as any

    writeInventoryDocs(OUTPUT_DIR, {
      mysqlVersion: version,
      tables: tableRows,
      columns: columnRows,
      indexes: indexRows,
      foreignKeys: foreignKeyRows,
      referentialConstraints: referentialRows,
    })

    console.log(`\nInventário sanitizado escrito em: ${OUTPUT_DIR}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const category = categorizeError(message)
    console.error('\nFalha durante a inspeção. Categoria sanitizada do erro:')
    console.error(`  ${category.label}`)
    if (category.isSslIssue) {
      console.error(
        '  SSL/TLS incompatível detectado. DATABASE_SSL não foi alterado automaticamente — revise manualmente a configuração antes de tentar novamente.',
      )
    }
    process.exitCode = 1
  } finally {
    await connection.end()
  }
}

function categorizeError(message: string): { label: string; isSslIssue: boolean } {
  const lower = message.toLowerCase()
  if (lower.includes('access denied')) return { label: 'autenticação recusada', isSslIssue: false }
  if (lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('ehostunreach'))
    return { label: 'host inacessível', isSslIssue: false }
  if (lower.includes('etimedout') || lower.includes('timeout')) return { label: 'timeout', isSslIssue: false }
  if (lower.includes('unknown database')) return { label: 'banco inexistente', isSslIssue: false }
  if (lower.includes('ssl') || lower.includes('tls') || lower.includes('certificate'))
    return { label: 'SSL/TLS incompatível', isSslIssue: true }
  if (lower.includes('access') && lower.includes('denied')) return { label: 'permissão insuficiente', isSslIssue: false }
  if (lower.includes('permission')) return { label: 'permissão insuficiente', isSslIssue: false }
  return { label: 'erro desconhecido sanitizado', isSslIssue: false }
}

main()
