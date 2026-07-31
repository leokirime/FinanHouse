/**
 * Verificação segura de conectividade com o banco Aiven configurado.
 *
 * NÃO é executado automaticamente por nenhum outro script ou hook — apenas
 * manualmente, com `apps/api/.env.local` já preenchido com credenciais
 * reais do Aiven.
 *
 * Uso: npm run db:check
 *
 * Regras: abre exatamente uma conexão (sem pool), nunca escreve no banco,
 * fecha a conexão mesmo em caso de erro, e nunca imprime host, porta,
 * usuário, senha, certificado ou a string de conexão completa — apenas
 * dados não sensíveis (provider, ambiente, banco atual, versão do MySQL,
 * status de TLS e sucesso/falha).
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { DatabaseConfigError, resolveDatabaseConfig } from '../src/config/database-config.js'
import { categorizeConnectionError } from './lib/sanitize-error.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../.env.local')

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(ENV_LOCAL_PATH)
  } catch {
    console.error(`Arquivo de credenciais não encontrado: ${ENV_LOCAL_PATH}`)
    process.exit(1)
  }
}

async function main(): Promise<void> {
  loadLocalEnv()

  let config
  try {
    config = resolveDatabaseConfig(process.env)
  } catch (error) {
    const message = error instanceof DatabaseConfigError ? error.message : 'Configuração de banco inválida.'
    console.error(`\nConfiguração inválida: ${message}`)
    process.exit(1)
  }

  console.log(`Provider: ${config.provider}`)
  console.log(`Ambiente: ${config.environment}`)
  console.log(`Banco configurado: ${config.database}`)

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl,
  })

  try {
    const [okRows] = (await connection.query('SELECT 1 AS ok')) as [Array<{ ok: number }>, unknown]
    console.log(`Conectividade: ${okRows[0]?.ok === 1 ? 'sucesso' : 'falha'}`)

    const [versionRows] = (await connection.query('SELECT VERSION() AS version')) as [Array<{ version: string }>, unknown]
    console.log(`Versão do MySQL: ${versionRows[0]?.version ?? 'desconhecida'}`)

    const [databaseRows] = (await connection.query('SELECT DATABASE() AS db')) as [Array<{ db: string }>, unknown]
    const activeDatabase = databaseRows[0]?.db
    console.log(`Banco ativo corresponde ao configurado: ${activeDatabase === config.database ? 'sim' : 'não'}`)

    const [cipherRows] = (await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")) as [
      Array<{ Value: string }>,
      unknown,
    ]
    const cipher = cipherRows[0]?.Value ?? ''
    console.log(`TLS ativo: ${cipher.length > 0 ? 'sim' : 'não'}`)

    console.log('\nVerificação concluída com sucesso.')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\nFalha na verificação. Categoria: ${categorizeConnectionError(message)}`)
    process.exitCode = 1
  } finally {
    await connection.end()
  }
}

main()
