/**
 * Smoke-test transacional do fluxo real de autenticação e sessão (login,
 * validação de sessão, proteção de rota financeira, logout, revogação —
 * Bloco 19, DT-14) contra o banco `finanhouse_dev` (Aiven). Segue o mesmo
 * padrão de `db-smoke-category-budgets.ts`/`db-smoke-http.ts`: cria dados
 * totalmente sintéticos (usuário, households, vínculo, categoria) dentro de
 * uma única transação, monta a aplicação HTTP real sobre repositórios
 * vinculados a essa transação, exercita as rotas via `app.inject()` (sem
 * socket de rede), e SEMPRE executa ROLLBACK ao final — nunca commit.
 *
 * Diferente dos smokes anteriores, este roda sobre um banco que já tem os
 * dois usuários reais com senha configurada (Bloco 19) — por isso não
 * assume tabelas vazias: só confirma que as contagens de TODAS as oito
 * tabelas da aplicação são idênticas antes e depois do rollback (mesmo
 * raciocínio de `db-smoke-category-budgets.ts`).
 *
 * Credenciais sintéticas (e-mail/senha) são geradas em memória
 * (`auth-smoke-fixture.ts`) — nunca vêm de `.env.local`, nunca são
 * impressas, nunca aparecem em erro. As senhas reais dos dois usuários
 * existentes NUNCA são usadas nem alteradas por este script.
 *
 * NÃO é executado automaticamente. Exige simultaneamente:
 *   1. `apps/api/.env.local` preenchido com credenciais reais do Aiven;
 *   2. DATABASE_PROVIDER=aiven, DATABASE_ENV=development, DATABASE_NAME=finanhouse_dev;
 *   3. migration `0003_auth_sessions.sql` já aplicada (ao menos 4 migrations registradas);
 *   4. `CONFIRM_AUTH_SMOKE_TEST=true` definido explicitamente no ambiente;
 *   5. autorização explícita do proprietário do projeto para esta execução.
 *
 * Uso: CONFIRM_AUTH_SMOKE_TEST=true npm run db:smoke:auth-sessions
 */
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import type { ResultSetHeader } from 'mysql2/promise'
import { DatabaseConfigError, resolveDatabaseConfig } from '../src/config/database-config.js'
import { AuthSmokeGuardError, assertAuthSmokeEnvironmentAllowed, assertAuthSmokeMigrationsPresent } from '../src/db/auth-smoke-guard.js'
import { generateSyntheticAuthFixture } from '../src/db/auth-smoke-fixture.js'
import { categorizeConnectionError } from '../src/db/sanitize-error.js'
import { EXPECTED_APPLICATION_TABLES, MIGRATIONS_TABLE_NAME } from '../src/db/schema-audit.js'
import { categories, householdMembers, households, users } from '../src/db/schema/index.js'
import { assertNoResidualData } from '../src/db/smoke-repositories-guard.js'
import { createHttpApp } from '../src/http/app.js'
import { createDrizzleRepositories } from '../src/infrastructure/repositories/drizzle/index.js'
import { DrizzleInstallmentTransactionRunner } from '../src/infrastructure/repositories/drizzle/drizzle-installment-transaction-runner.js'
import type { DrizzleDb } from '../src/infrastructure/repositories/drizzle/types.js'
import { hashPassword } from '../src/security/password-hashing.js'
import { hashSessionToken } from '../src/security/session-token.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_LOCAL_PATH = path.resolve(__dirname, '../.env.local')
const ALL_TABLES = [...EXPECTED_APPLICATION_TABLES, 'category_budgets', 'auth_sessions'] as const

/** Sinaliza sucesso do cenário completo — nunca deve chegar a um `COMMIT`. */
class SmokeRollbackSignal extends Error {}

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(ENV_LOCAL_PATH)
  } catch {
    console.error(`Arquivo de credenciais não encontrado: ${ENV_LOCAL_PATH}`)
    process.exit(1)
  }
}

async function readRowCounts(connection: mysql.Connection): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const table of ALL_TABLES) {
    const [rows] = (await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``)) as [Array<{ total: number }>, unknown]
    counts[table] = Number(rows[0]?.total ?? 0)
  }
  return counts
}

async function main(): Promise<void> {
  if (process.env.CONFIRM_AUTH_SMOKE_TEST !== 'true') {
    console.error(
      '\nCONFIRM_AUTH_SMOKE_TEST=true é obrigatório para executar o smoke-test transacional de autenticação.\n' +
        'Sem essa confirmação explícita, nenhuma conexão é aberta e nenhuma transação é iniciada.',
    )
    process.exit(1)
  }

  loadLocalEnv()

  let config
  try {
    config = resolveDatabaseConfig(process.env)
  } catch (error) {
    const message = error instanceof DatabaseConfigError ? error.message : 'Configuração de banco inválida.'
    console.error(`\nConfiguração inválida: ${message}`)
    process.exit(1)
  }

  try {
    assertAuthSmokeEnvironmentAllowed({
      provider: config.provider,
      environment: config.environment,
      database: config.database,
      confirmFlag: process.env.CONFIRM_AUTH_SMOKE_TEST,
    })
  } catch (error) {
    const message = error instanceof AuthSmokeGuardError ? error.message : 'Ambiente não permitido para o smoke-test.'
    console.error(`\n${message}`)
    process.exit(1)
  }

  console.log(`Provider: ${config.provider}`)
  console.log(`Ambiente: ${config.environment}`)
  console.log(`Banco: ${config.database}`)

  let connection: mysql.Connection | undefined
  let initialCounts: Record<string, number> = {}
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
      throw new AuthSmokeGuardError('TLS não está ativo na conexão — smoke-test abortado antes de qualquer escrita.')
    }

    const [migrationsRows] = (await connection.query(`SELECT \`hash\` FROM \`${MIGRATIONS_TABLE_NAME}\``)) as [Array<{ hash: string }>, unknown]
    assertAuthSmokeMigrationsPresent({ migrationsRows })
    console.log(`Migrations registradas: ${migrationsRows.length}`)

    const [authSessionsTableRows] = (await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auth_sessions'",
    )) as [Array<{ TABLE_NAME: string }>, unknown]
    if (authSessionsTableRows.length === 0) {
      throw new AuthSmokeGuardError('Tabela auth_sessions não existe — a migration 0003 precisa estar aplicada antes deste smoke-test.')
    }

    initialCounts = await readRowCounts(connection)
    console.log(`Contagens iniciais (dado real preservado): ${JSON.stringify(initialCounts)}`)

    const db = drizzle(connection)

    console.log('\nIniciando transação sintética...')
    try {
      await db.transaction(async (tx) => {
        const repositories = createDrizzleRepositories(tx as unknown as DrizzleDb)
        const app = createHttpApp({
          repositories,
          runtimeMode: 'development',
          logger: false,
          // Nunca usada por este smoke (não exercita rotas de parcelamento) — apenas satisfaz o
          // contrato de `createHttpApp` (Sessão 12, Bloco 04).
          installmentTransactionRunner: new DrizzleInstallmentTransactionRunner(tx as unknown as DrizzleDb),
          readiness: async () => ({
            ready: true,
            checks: { configResolved: true, poolAvailable: true, connectionOk: true, tlsActive: true },
          }),
        })

        // 1) Credenciais sintéticas em memória — nunca de .env.local, nunca impressas, nunca persistidas fora desta transação.
        const fixture = generateSyntheticAuthFixture()
        const passwordHash = await hashPassword(fixture.password)

        // 2) Usuário, dois households e vínculo sintéticos — vínculo ativo só com o household A.
        const [syntheticUser] = (await tx
          .insert(users)
          .values({ displayName: 'Smoke Auth User', email: fixture.email, status: 'active', passwordHash, passwordConfiguredAt: new Date() })) as unknown as [
          ResultSetHeader,
          unknown,
        ]
        const syntheticUserId = syntheticUser.insertId

        const [householdA] = (await tx
          .insert(households)
          .values({ name: 'Smoke Auth Household A', createdByUserId: syntheticUserId })) as unknown as [ResultSetHeader, unknown]
        const householdAId = householdA.insertId

        const [householdB] = (await tx
          .insert(households)
          .values({ name: 'Smoke Auth Household B', createdByUserId: syntheticUserId })) as unknown as [ResultSetHeader, unknown]
        const householdBId = householdB.insertId

        await tx.insert(householdMembers).values({ householdId: householdAId, userId: syntheticUserId, role: 'owner', status: 'active' })
        await tx.insert(categories).values({ householdId: householdAId, name: 'Smoke Auth Categoria', entryType: 'expense', status: 'active' })

        // 3) Login real via HTTP.
        const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: fixture.email, password: fixture.password } })
        console.log(`POST /api/v1/auth/login: ${login.statusCode === 200 ? 'aprovado' : 'reprovado'} (status ${login.statusCode})`)
        if (login.statusCode !== 200) throw new Error('Smoke-test reprovado: login com credenciais sintéticas válidas não retornou 200.')

        const loginBody = login.json()
        const loginNeverLeaksHash = !login.body.includes('passwordHash') && !login.body.toLowerCase().includes('argon2')
        const loginIdentityHasNoHashField = !('passwordHash' in loginBody.data.user)
        console.log(`Resposta de login nunca expõe passwordHash/hash: ${loginNeverLeaksHash && loginIdentityHasNoHashField ? 'aprovado' : 'reprovado'}`)
        if (!loginNeverLeaksHash || !loginIdentityHasNoHashField) {
          throw new Error('Smoke-test reprovado: resposta de login vazou passwordHash ou fragmento do hash.')
        }

        const cookie = login.cookies.find((entry) => entry.name === 'finanhouse_session')
        const cookieOk = cookie !== undefined && cookie.httpOnly === true && cookie.sameSite === 'Lax' && cookie.path === '/'
        console.log(`Cookie de sessão presente, HttpOnly, SameSite=Lax: ${cookieOk ? 'aprovado' : 'reprovado'}`)
        if (!cookieOk || !cookie) throw new Error('Smoke-test reprovado: cookie de sessão ausente ou com atributos incorretos.')

        const tokenNeverInBody = !login.body.includes(cookie.value)
        console.log(`Token de sessão nunca aparece no corpo da resposta: ${tokenNeverInBody ? 'aprovado' : 'reprovado'}`)
        if (!tokenNeverInBody) throw new Error('Smoke-test reprovado: token de sessão vazou no corpo da resposta de login.')

        const cookieHeader = `${cookie.name}=${cookie.value}`

        // 4) Validação de sessão via HTTP.
        const session = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: cookieHeader } })
        const sessionBody = session.statusCode === 200 ? session.json() : undefined
        const sessionOk = session.statusCode === 200 && sessionBody?.data.householdId === householdAId
        console.log(`GET /api/v1/auth/session: ${sessionOk ? 'aprovado' : 'reprovado'} (status ${session.statusCode})`)
        if (!sessionOk || !sessionBody) throw new Error('Smoke-test reprovado: validação de sessão não retornou o household esperado.')

        const identityHasNoPasswordHash = !('passwordHash' in sessionBody.data.user)
        console.log(`Identidade retornada por /session nunca contém passwordHash: ${identityHasNoPasswordHash ? 'aprovado' : 'reprovado'}`)
        if (!identityHasNoPasswordHash) throw new Error('Smoke-test reprovado: identidade da sessão expôs passwordHash.')

        // 5) Acesso a rota financeira protegida do household autorizado (somente leitura — nenhum dado é criado).
        const protectedRoute = await app.inject({ method: 'GET', url: `/api/v1/households/${householdAId}/categories`, headers: { cookie: cookieHeader } })
        console.log(`GET .../categories (household autorizado): ${protectedRoute.statusCode === 200 ? 'aprovado' : 'reprovado'} (status ${protectedRoute.statusCode})`)
        if (protectedRoute.statusCode !== 200) throw new Error('Smoke-test reprovado: rota financeira protegida não respondeu 200 com sessão válida.')

        // 6) Cookie inválido/forjado é rejeitado (401).
        const invalidCookie = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: 'finanhouse_session=token-forjado-nao-existe' } })
        console.log(`GET /api/v1/auth/session com cookie inválido: ${invalidCookie.statusCode === 401 ? 'aprovado' : 'reprovado'} (status ${invalidCookie.statusCode})`)
        if (invalidCookie.statusCode !== 401) throw new Error('Smoke-test reprovado: cookie inválido não retornou 401.')

        // 7) Household divergente é rejeitado sem vazamento de dados (404, nunca 401/403).
        const wrongHousehold = await app.inject({ method: 'GET', url: `/api/v1/households/${householdBId}/categories`, headers: { cookie: cookieHeader } })
        console.log(`GET .../categories (household divergente): ${wrongHousehold.statusCode === 404 ? 'aprovado' : 'reprovado'} (status ${wrongHousehold.statusCode})`)
        if (wrongHousehold.statusCode !== 404) throw new Error('Smoke-test reprovado: household divergente não retornou 404.')

        // 8) createdByUserId nunca é aceito no corpo — rejeitado (400) antes de qualquer escrita financeira; nenhuma movimentação é criada.
        const forgedCreatedBy = await app.inject({
          method: 'POST',
          url: `/api/v1/households/${householdAId}/entries`,
          headers: { cookie: cookieHeader },
          payload: { periodId: 1, categoryId: 1, createdByUserId: 999999, entryType: 'expense', description: 'Tentativa sintética', expectedAmount: '1.00' },
        })
        console.log(
          `POST .../entries com createdByUserId forjado no corpo: ${forgedCreatedBy.statusCode === 400 ? 'aprovado (rejeitado, nenhuma movimentação criada)' : 'reprovado'} (status ${forgedCreatedBy.statusCode})`,
        )
        if (forgedCreatedBy.statusCode !== 400) throw new Error('Smoke-test reprovado: createdByUserId no corpo não foi rejeitado.')

        // 9) Segundo login sequencial do MESMO usuário — regressão do risco de concorrência
        // encontrado no teste manual do Bloco 19: nenhuma versão anterior do repositório (nem a que
        // calculava `id` via `information_schema`, nem a que usava `MAX(id) + 1`) garantia que duas
        // sessões criadas em sequência recebessem `id`s realmente independentes sem risco de colisão
        // sob login concorrente. A correção definitiva delega o `id` inteiramente ao `AUTO_INCREMENT`
        // nativo do MySQL (via `insertId`) — nunca calculado em código.
        const secondLogin = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: fixture.email, password: fixture.password } })
        console.log(`POST /api/v1/auth/login (segunda vez, mesmo usuário): ${secondLogin.statusCode === 200 ? 'aprovado' : 'reprovado'} (status ${secondLogin.statusCode})`)
        if (secondLogin.statusCode !== 200) throw new Error('Smoke-test reprovado: segundo login não retornou 200.')

        const secondCookie = secondLogin.cookies.find((entry) => entry.name === 'finanhouse_session')
        if (!secondCookie) throw new Error('Smoke-test reprovado: segundo login não devolveu cookie de sessão.')
        const secondCookieHeader = `${secondCookie.name}=${secondCookie.value}`

        // 10) As duas sessões são válidas SIMULTANEAMENTE — nenhuma invalida a outra.
        const firstSessionStillValid = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: cookieHeader } })
        const secondSessionValid = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: secondCookieHeader } })
        console.log(
          `Ambas as sessões válidas simultaneamente: ${firstSessionStillValid.statusCode === 200 && secondSessionValid.statusCode === 200 ? 'aprovado' : 'reprovado'} (status ${firstSessionStillValid.statusCode}/${secondSessionValid.statusCode})`,
        )
        if (firstSessionStillValid.statusCode !== 200 || secondSessionValid.statusCode !== 200) {
          throw new Error('Smoke-test reprovado: as duas sessões do mesmo usuário deveriam continuar válidas simultaneamente.')
        }

        // 11) Confirma diretamente no repositório real que os dois ids/hashes são distintos — nunca imprime os valores.
        const firstStoredSession = await repositories.authSessions.findByTokenHash(hashSessionToken(cookie.value))
        const secondStoredSession = await repositories.authSessions.findByTokenHash(hashSessionToken(secondCookie.value))
        const idsAreDifferent = firstStoredSession !== null && secondStoredSession !== null && firstStoredSession.id !== secondStoredSession.id
        console.log(`As duas sessões têm ids diferentes no repositório real: ${idsAreDifferent ? 'aprovado' : 'reprovado'}`)
        if (!idsAreDifferent) throw new Error('Smoke-test reprovado: as duas sessões colidiram no mesmo id.')

        // 12) Logout da PRIMEIRA sessão não afeta a segunda.
        const logoutFirst = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: cookieHeader } })
        console.log(`POST /api/v1/auth/logout (primeira sessão): ${logoutFirst.statusCode === 204 ? 'aprovado' : 'reprovado'} (status ${logoutFirst.statusCode})`)
        if (logoutFirst.statusCode !== 204) throw new Error('Smoke-test reprovado: logout da primeira sessão não retornou 204.')

        const clearedCookie = logoutFirst.cookies.find((entry) => entry.name === 'finanhouse_session')
        const cookieCleared = clearedCookie !== undefined && clearedCookie.value === ''
        console.log(`Logout limpa o cookie de sessão: ${cookieCleared ? 'aprovado' : 'reprovado'}`)
        if (!cookieCleared) throw new Error('Smoke-test reprovado: logout não limpou o cookie de sessão.')

        const secondLogoutRepeatedOnFirst = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: cookieHeader } })
        console.log(
          `POST /api/v1/auth/logout repetido na primeira sessão (idempotente): ${secondLogoutRepeatedOnFirst.statusCode === 204 ? 'aprovado' : 'reprovado'} (status ${secondLogoutRepeatedOnFirst.statusCode})`,
        )
        if (secondLogoutRepeatedOnFirst.statusCode !== 204) throw new Error('Smoke-test reprovado: logout repetido não foi idempotente.')

        const firstAfterLogout = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: cookieHeader } })
        const secondStillValidAfterFirstLogout = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: secondCookieHeader } })
        console.log(
          `Primeira sessão inválida (401) e segunda ainda válida (200) após logout seletivo: ${firstAfterLogout.statusCode === 401 && secondStillValidAfterFirstLogout.statusCode === 200 ? 'aprovado' : 'reprovado'} (status ${firstAfterLogout.statusCode}/${secondStillValidAfterFirstLogout.statusCode})`,
        )
        if (firstAfterLogout.statusCode !== 401) throw new Error('Smoke-test reprovado: primeira sessão continuou válida após seu próprio logout.')
        if (secondStillValidAfterFirstLogout.statusCode !== 200) {
          throw new Error('Smoke-test reprovado: logout da primeira sessão revogou indevidamente a segunda sessão.')
        }

        // 13) Logout da SEGUNDA sessão — agora ambas devem estar revogadas.
        const logoutSecond = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: secondCookieHeader } })
        console.log(`POST /api/v1/auth/logout (segunda sessão): ${logoutSecond.statusCode === 204 ? 'aprovado' : 'reprovado'} (status ${logoutSecond.statusCode})`)
        if (logoutSecond.statusCode !== 204) throw new Error('Smoke-test reprovado: logout da segunda sessão não retornou 204.')

        const secondAfterLogout = await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: secondCookieHeader } })
        console.log(`GET /api/v1/auth/session (segunda sessão) após seu logout: ${secondAfterLogout.statusCode === 401 ? 'aprovado' : 'reprovado'} (status ${secondAfterLogout.statusCode})`)
        if (secondAfterLogout.statusCode !== 401) throw new Error('Smoke-test reprovado: segunda sessão continuou válida após seu próprio logout.')

        // 14) Confirmação direta de que AMBAS as sessões aparecem revogadas no repositório real — nunca imprime token bruto, só o resultado.
        const firstRevokedCheck = await repositories.authSessions.findByTokenHash(hashSessionToken(cookie.value))
        const secondRevokedCheck = await repositories.authSessions.findByTokenHash(hashSessionToken(secondCookie.value))
        const bothRevoked =
          firstRevokedCheck !== null && firstRevokedCheck.revokedAt !== null && secondRevokedCheck !== null && secondRevokedCheck.revokedAt !== null
        console.log(`Ambas as sessões aparecem revogadas no repositório real: ${bothRevoked ? 'aprovado' : 'reprovado'}`)
        if (!bothRevoked) throw new Error('Smoke-test reprovado: nem todas as sessões aparecem revogadas no repositório.')

        await app.close()

        // 16) Rollback intencional — nunca um commit.
        throw new SmokeRollbackSignal('rollback intencional do smoke-test de autenticação — nenhum dado deve persistir')
      })
    } catch (error) {
      if (!(error instanceof SmokeRollbackSignal)) throw error
      console.log('\nRollback intencional executado com sucesso — nenhum dado sintético deve ter persistido.')
    }

    const finalCounts = await readRowCounts(connection)
    assertNoResidualData({ before: initialCounts, after: finalCounts })
    console.log(`Contagens finais: idênticas às iniciais em todas as tabelas (nenhum dado residual). ${JSON.stringify(finalCounts)}`)

    const [realPasswordRows] = (await connection.query('SELECT COUNT(*) AS total FROM `users` WHERE `password_hash` IS NOT NULL')) as [
      Array<{ total: number }>,
      unknown,
    ]
    console.log(`Usuários reais com senha configurada (inalterado): ${realPasswordRows[0]?.total ?? 0}`)

    const [finalMigrationsRows] = (await connection.query(`SELECT \`hash\` FROM \`${MIGRATIONS_TABLE_NAME}\``)) as [Array<{ hash: string }>, unknown]
    console.log(`Migrations registradas (inalterado): ${finalMigrationsRows.length}`)

    console.log('\nSmoke-test de autenticação aprovado.')
  } catch (error) {
    if (error instanceof AuthSmokeGuardError) {
      console.error(`\nSmoke-test reprovado: ${error.message}`)
      process.exitCode = 1
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\nFalha no smoke-test. Categoria: ${categorizeConnectionError(message)}`)
    process.exitCode = 1
  } finally {
    await connection?.end()
  }
}

main()
