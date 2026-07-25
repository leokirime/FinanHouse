/**
 * Diagnóstico de TLS/SSL da conexão com o MySQL existente na Clever Cloud.
 *
 * Não execute isto automaticamente. Rode manualmente — as credenciais já devem
 * estar preenchidas em apps/api/.env.local (preenchidas no Bloco 02).
 *
 * Uso: npm run test:tls -- <modo>
 *   (ou: npx tsx database/inspection/test-tls.ts <modo>)
 *
 * Modos disponíveis:
 *   current            (padrão) — usa exatamente a configuração DATABASE_SSL
 *                       atual do apps/api/.env.local, sem alterá-la.
 *   strict              — força `ssl: { rejectUnauthorized: true }`, ignorando
 *                       DATABASE_SSL. É a configuração que qualquer decisão de
 *                       produção precisa satisfazer (ver
 *                       Docs/03_contracts/contrato_banco_dados.md e
 *                       database/current-schema/tls-inspection.md, seção 4).
 *   custom-ca           — força `ssl: { ca, rejectUnauthorized: true,
 *                       servername? }` usando DATABASE_SSL_CA_PATH (arquivo
 *                       local, fora do controle de versão) e, se definido,
 *                       DATABASE_SSL_SERVERNAME. Erra explicitamente se
 *                       DATABASE_SSL_CA_PATH não estiver definido.
 *   insecure-diagnostic — força `ssl: { rejectUnauthorized: false }`. NUNCA é
 *                       uma configuração de produção válida (ver decisão de
 *                       segurança em tls-inspection.md). Exige o argumento
 *                       extra --confirm-insecure para rodar; sem ele, o
 *                       script recusa e explica por quê. Uso exclusivamente
 *                       diagnóstico — nunca usado pela aplicação ou por
 *                       `drizzle-kit migrate`.
 *
 * Regras (ver Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/
 * bloco_04_validacao_tls_e_revisao_pre_migration.md):
 * - Nenhum valor de credencial (host, porta, usuário, senha, nome do banco,
 *   string de conexão) é impresso em nenhuma saída — nem em sucesso, nem em erro.
 * - Uma única conexão é aberta (sem pool), somente leitura, com timeout curto,
 *   e sempre fechada em `finally`.
 * - Apenas consultas de diagnóstico são executadas: SELECT 1, SELECT VERSION(),
 *   SELECT DATABASE(), e variáveis de status de sessão do MySQL relacionadas a
 *   TLS (Ssl_cipher, Ssl_version) — nenhuma tabela da aplicação é consultada.
 * - Este script nunca escreve em DATABASE_SSL nem em nenhum arquivo de ambiente.
 * - Não aceita SQL externo por argumento, variável ou entrada — apenas os
 *   modos de conexão listados acima.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import mysql, { type SslOptions } from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../../apps/api/.env.local')
const DEFAULT_CONNECT_TIMEOUT = 10000

const MODES = ['current', 'strict', 'custom-ca', 'insecure-diagnostic'] as const
type Mode = (typeof MODES)[number]

function parseMode(): Mode {
  const arg = process.argv[2]
  if (!arg) return 'current'
  if ((MODES as readonly string[]).includes(arg)) return arg as Mode
  console.error(`Modo desconhecido: "${arg}". Modos válidos: ${MODES.join(', ')}`)
  process.exit(1)
}

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(ENV_LOCAL_PATH)
  } catch {
    console.error(`Arquivo de credenciais não encontrado: ${ENV_LOCAL_PATH}`)
    console.error('Preencha apps/api/.env.local antes de rodar o diagnóstico de TLS.')
    process.exit(1)
  }
}

function reportVariableStatus(): boolean {
  const keys = ['DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_SSL'] as const
  let allPresent = true
  console.log('Status das variáveis de ambiente (valores nunca são exibidos):')
  for (const key of keys) {
    const present = Boolean(process.env[key]?.trim())
    console.log(`  ${key}: ${present ? 'configurado' : 'ausente'}`)
    if (!present) allPresent = false
  }
  return allPresent
}

function resolveSslOptions(mode: Mode): SslOptions | undefined {
  switch (mode) {
    case 'current': {
      const useSsl = (process.env.DATABASE_SSL ?? '').trim().toLowerCase() === 'true'
      console.log(`\nModo: current — usando DATABASE_SSL do .env.local (${useSsl ? 'true' : 'false'}).`)
      return useSsl ? {} : undefined
    }
    case 'strict': {
      console.log('\nModo: strict — forçando rejectUnauthorized: true (ignora DATABASE_SSL).')
      return { rejectUnauthorized: true }
    }
    case 'custom-ca': {
      const caPath = process.env.DATABASE_SSL_CA_PATH?.trim()
      if (!caPath) {
        console.error('\nModo: custom-ca requer DATABASE_SSL_CA_PATH apontando para um arquivo de CA local.')
        console.error('Essa variável ainda não está aprovada/configurada — ver database/current-schema/tls-inspection.md, seção 6.')
        process.exit(1)
      }
      const ca = readFileSync(caPath, 'utf-8')
      const servername = process.env.DATABASE_SSL_SERVERNAME?.trim()
      console.log('\nModo: custom-ca — forçando rejectUnauthorized: true com CA customizada.')
      // `servername` (SNI) não está no tipo `SslOptions` do mysql2, mas é repassado ao
      // `tls.connect` subjacente do Node — mantido via cast pontual.
      return servername
        ? ({ ca, rejectUnauthorized: true, servername } as SslOptions)
        : { ca, rejectUnauthorized: true }
    }
    case 'insecure-diagnostic': {
      if (process.argv[3] !== '--confirm-insecure') {
        console.error('\nModo: insecure-diagnostic requer o argumento extra --confirm-insecure para rodar.')
        console.error('Este modo NUNCA é uma configuração de produção válida — apenas diagnóstico manual pontual.')
        console.error('Uso: npm run test:tls -- insecure-diagnostic --confirm-insecure')
        process.exit(1)
      }
      console.warn(
        '\n⚠️  Modo: insecure-diagnostic — forçando rejectUnauthorized: false.\n' +
          '⚠️  A identidade do servidor NÃO será validada nesta conexão.\n' +
          '⚠️  Resultado é apenas informativo — nunca usar esta configuração na aplicação ou em drizzle-kit migrate.',
      )
      return { rejectUnauthorized: false }
    }
  }
}

async function main() {
  const mode = parseMode()
  loadLocalEnv()

  if (!reportVariableStatus()) {
    console.error('\nUma ou mais variáveis obrigatórias estão ausentes. Diagnóstico interrompido.')
    process.exit(1)
  }

  const configuredDatabaseName = process.env.DATABASE_NAME as string
  const connectTimeout = Number(process.env.DATABASE_CONNECT_TIMEOUT ?? DEFAULT_CONNECT_TIMEOUT)
  const ssl = resolveSslOptions(mode)

  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: configuredDatabaseName,
    ssl,
    connectTimeout,
  })

  try {
    const [[{ ok }]] = (await connection.query('SELECT 1 AS ok')) as any
    console.log(`\nConectividade: ${ok === 1 ? 'sucesso' : 'falha'}`)

    const [[{ version }]] = (await connection.query('SELECT VERSION() AS version')) as any
    const [[{ db }]] = (await connection.query('SELECT DATABASE() AS db')) as any
    console.log(`Versão do MySQL: ${version}`)
    console.log(`Banco configurado corresponde ao banco ativo: ${db === configuredDatabaseName ? 'sim' : 'não'}`)

    const [cipherRows] = (await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")) as any
    const [tlsVersionRows] = (await connection.query("SHOW SESSION STATUS LIKE 'Ssl_version'")) as any
    const cipher: string = cipherRows[0]?.Value ?? ''
    const tlsVersion: string = tlsVersionRows[0]?.Value ?? ''
    const tlsActive = cipher.length > 0

    console.log(`\nTLS ativo nesta sessão: ${tlsActive ? 'sim' : 'não'}`)
    console.log(`Protocolo: ${tlsVersion || 'não identificado'}`)
    console.log(`Cifra: ${cipher || 'não identificada'}`)

    if (!tlsActive) {
      console.warn(
        '\nAVISO: TLS não está ativo nesta sessão. Nenhuma correção automática será aplicada.\n' +
          'Registrar como pendência P2 e revisar a configuração antes de aplicar a migration ou inserir dados reais.',
      )
    } else if (mode !== 'strict' && mode !== 'custom-ca') {
      console.warn(
        '\nAVISO: TLS ativo, mas a identidade do servidor pode não ter sido validada neste modo.\n' +
          'Apenas os modos "strict" e "custom-ca" confirmam validação de certificado.',
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('\nFalha durante o diagnóstico. Categoria sanitizada do erro:')
    console.error(`  ${categorizeError(message)}`)
    process.exitCode = 1
  } finally {
    await connection.end()
  }
}

function categorizeError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('access denied')) return 'autenticação recusada'
  if (lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('ehostunreach'))
    return 'host inacessível'
  if (lower.includes('etimedout') || lower.includes('timeout')) return 'timeout'
  if (lower.includes('unknown database')) return 'banco inexistente'
  if (lower.includes('ssl') || lower.includes('tls') || lower.includes('certificate')) return 'SSL/TLS incompatível'
  return 'erro desconhecido sanitizado'
}

main()
