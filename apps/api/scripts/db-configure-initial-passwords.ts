/**
 * Configuração PERMANENTE das senhas iniciais dos dois usuários já
 * existentes em `finanhouse_dev` (criados pelo bootstrap estrutural do
 * Bloco 17) — Bloco 19, DT-14. Nunca cria usuário: localiza exatamente os
 * dois usuários pelos e-mails já configurados localmente
 * (`FINANHOUSE_BOOTSTRAP_OWNER_EMAIL`/`_PARTNER_EMAIL`) e grava apenas o
 * hash Argon2id da senha (`@node-rs/argon2`) — a senha em texto puro nunca é
 * persistida, nunca é impressa, nunca aparece em log.
 *
 * NÃO é executado automaticamente. Exige simultaneamente:
 *   1. `apps/api/.env.local` preenchido com credenciais reais do Aiven;
 *   2. DATABASE_PROVIDER=aiven, DATABASE_ENV=development, DATABASE_NAME=finanhouse_dev;
 *   3. migration `0003_auth_sessions.sql` já aplicada (coluna `password_hash` existente);
 *   4. `FINANHOUSE_BOOTSTRAP_OWNER_EMAIL`/`_PARTNER_EMAIL` preenchidos (mesmos do bootstrap);
 *   5. `FINANHOUSE_INITIAL_PASSWORD_OWNER`/`_PARTNER` preenchidos (mínimo 8 caracteres, nunca iguais);
 *   6. `CONFIRM_INITIAL_PASSWORDS=true` definido explicitamente no ambiente;
 *   7. autorização explícita do proprietário do projeto para esta execução
 *      (frase separada da autorização da migration).
 *
 * Se qualquer um dos dois usuários já tiver uma senha configurada, o script
 * recusa a sobrescrita a menos que `CONFIRM_PASSWORD_OVERWRITE=true` também
 * esteja definido — uma autorização estritamente separada da primeira.
 *
 * Uso: CONFIRM_INITIAL_PASSWORDS=true npm run db:configure:initial-passwords
 *
 * Nunca imprime e-mail, senha ou hash — apenas contagens e flags booleanas.
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/mysql2'
import { eq } from 'drizzle-orm'
import mysql from 'mysql2/promise'
import { DatabaseConfigError, resolveDatabaseConfig } from '../src/config/database-config.js'
import { users } from '../src/db/schema/index.js'
import { categorizeConnectionError } from '../src/db/sanitize-error.js'
import {
  assertInitialPasswordsEnvironmentAllowed,
  assertNoUnauthorizedOverwrite,
  assertUsersFoundExactly,
  InitialPasswordsGuardError,
} from '../src/db/initial-passwords-guard.js'
import { InitialPasswordsInputError, resolveInitialPasswordsInput } from '../src/db/initial-passwords-input.js'
import { hashPassword } from '../src/security/password-hashing.js'

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
  if (process.env.CONFIRM_INITIAL_PASSWORDS !== 'true') {
    console.error(
      '\nCONFIRM_INITIAL_PASSWORDS=true é obrigatório para configurar as senhas iniciais.\n' +
        'Sem essa confirmação explícita, nenhuma conexão é aberta e nenhuma senha é gravada.',
    )
    process.exit(1)
  }

  loadLocalEnv()

  let passwordsInput
  try {
    passwordsInput = resolveInitialPasswordsInput(process.env)
  } catch (error) {
    const message = error instanceof InitialPasswordsInputError ? error.message : 'Variáveis de senha inicial inválidas.'
    console.error(`\n${message}`)
    process.exit(1)
  }

  let config
  try {
    config = resolveDatabaseConfig(process.env)
  } catch (error) {
    const message = error instanceof DatabaseConfigError ? error.message : 'Configuração de banco inválida.'
    console.error(`\nConfiguração inválida: ${message}`)
    process.exit(1)
  }

  try {
    assertInitialPasswordsEnvironmentAllowed({
      provider: config.provider,
      environment: config.environment,
      database: config.database,
      confirmFlag: process.env.CONFIRM_INITIAL_PASSWORDS,
    })
  } catch (error) {
    const message = error instanceof InitialPasswordsGuardError ? error.message : 'Ambiente não permitido para configurar senhas iniciais.'
    console.error(`\n${message}`)
    process.exit(1)
  }

  console.log(`Provider: ${config.provider}`)
  console.log(`Ambiente: ${config.environment}`)
  console.log(`Banco: ${config.database}`)

  const allowOverwrite = process.env.CONFIRM_PASSWORD_OVERWRITE === 'true'

  let connection: mysql.Connection | undefined
  try {
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
    })

    const [cipherRows] = (await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")) as [Array<{ Value: string }>, unknown]
    const tlsActive = (cipherRows[0]?.Value ?? '').length > 0
    console.log(`TLS ativo: ${tlsActive ? 'sim' : 'não'}`)
    if (!tlsActive) {
      throw new InitialPasswordsGuardError('TLS não está ativo na conexão — configuração de senhas abortada antes de qualquer escrita.')
    }

    const db = drizzle(connection)

    // Hash calculado ANTES da transação — Argon2id é deliberadamente custoso; nunca segurar
    // uma transação de banco aberta durante o cálculo.
    const ownerPasswordHash = await hashPassword(passwordsInput.ownerPassword)
    const partnerPasswordHash = await hashPassword(passwordsInput.partnerPassword)

    let ownerConfigured = false
    let partnerConfigured = false

    await db.transaction(async (tx) => {
      const [ownerRows, partnerRows] = await Promise.all([
        tx.select().from(users).where(eq(users.email, passwordsInput.ownerEmail)).limit(1),
        tx.select().from(users).where(eq(users.email, passwordsInput.partnerEmail)).limit(1),
      ])
      const ownerUser = ownerRows[0]
      const partnerUser = partnerRows[0]

      assertUsersFoundExactly({ ownerFound: ownerUser !== undefined, partnerFound: partnerUser !== undefined })
      assertNoUnauthorizedOverwrite({
        ownerAlreadyConfigured: ownerUser!.passwordConfiguredAt !== null,
        partnerAlreadyConfigured: partnerUser!.passwordConfiguredAt !== null,
        allowOverwrite,
      })

      const now = new Date()
      await tx.update(users).set({ passwordHash: ownerPasswordHash, passwordConfiguredAt: now }).where(eq(users.id, ownerUser!.id))
      await tx.update(users).set({ passwordHash: partnerPasswordHash, passwordConfiguredAt: now }).where(eq(users.id, partnerUser!.id))
      ownerConfigured = true
      partnerConfigured = true
    })

    console.log('\nSenhas iniciais configuradas (transação confirmada):')
    console.log(`  owner: ${ownerConfigured ? 'sim' : 'não'} · partner: ${partnerConfigured ? 'sim' : 'não'}`)

    const [countRows] = (await connection.query(
      'SELECT COUNT(*) AS total FROM `users` WHERE `password_hash` IS NOT NULL',
    )) as [Array<{ total: number }>, unknown]
    console.log(`  usuários com senha configurada no total: ${countRows[0]?.total ?? 0}`)
  } catch (error) {
    if (error instanceof InitialPasswordsGuardError) {
      console.error(`\nConfiguração de senhas reprovada: ${error.message}`)
      process.exitCode = 1
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\nFalha ao configurar senhas iniciais. Categoria: ${categorizeConnectionError(message)}`)
    process.exitCode = 1
  } finally {
    await connection?.end()
  }
}

main()
