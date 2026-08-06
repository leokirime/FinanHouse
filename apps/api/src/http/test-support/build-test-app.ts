import {
  InMemoryAuthSessionRepository,
  InMemoryCategoryBudgetRepository,
  InMemoryCategoryRepository,
  InMemoryFinancialEntryRepository,
  InMemoryHouseholdMemberRepository,
  InMemoryMonthlyPeriodRepository,
  InMemoryUserRepository,
} from '../../infrastructure/repositories/memory/index.js'
import { hashSessionToken } from '../../security/session-token.js'
import { createHttpApp, type HttpAppRepositories } from '../app.js'
import type { ReadinessCheck } from '../routes/ready.js'

/**
 * Tipo concreto (não só as portas) para que os testes possam usar `seed()`/
 * `reset()` — extras das implementações em memória, fora do contrato das
 * portas, mas estruturalmente compatíveis com `HttpAppRepositories`.
 */
export interface TestRepositories {
  entries: InMemoryFinancialEntryRepository
  periods: InMemoryMonthlyPeriodRepository
  categories: InMemoryCategoryRepository
  members: InMemoryHouseholdMemberRepository
  budgets: InMemoryCategoryBudgetRepository
  users: InMemoryUserRepository
  authSessions: InMemoryAuthSessionRepository
}

/** Repositórios em memória — nunca abrem conexão real; usados só em testes. */
export function buildTestRepositories(): TestRepositories {
  return {
    entries: new InMemoryFinancialEntryRepository(),
    periods: new InMemoryMonthlyPeriodRepository(),
    categories: new InMemoryCategoryRepository(),
    members: new InMemoryHouseholdMemberRepository(),
    budgets: new InMemoryCategoryBudgetRepository(),
    users: new InMemoryUserRepository(),
    authSessions: new InMemoryAuthSessionRepository(),
  }
}

export interface BuildTestAppOptions {
  repositories?: HttpAppRepositories
  readiness?: ReadinessCheck
  /**
   * Desde o Bloco 19 (DT-14), toda rota `/api/v1/households/:householdId/...`
   * exige sessão. Por padrão, `buildTestApp` autentica automaticamente cada
   * `app.inject()` contra o household já presente na URL (usando o primeiro
   * membro `active` já seedado em `repositories.members` para aquele
   * household) — sem exigir que as ~70 chamadas de teste pré-existentes
   * (categorias/membros/competências/movimentações/limites) mudem uma
   * linha. Testes que precisam simular ausência de sessão, sessão de outro
   * household, ou qualquer cenário de autenticação explícito devem passar
   * `autoAuth: false` e fornecer o cabeçalho `cookie` manualmente.
   */
  autoAuth?: boolean
}

/**
 * Garante (idempotente, dentro da execução de um teste) uma sessão de teste
 * válida para `householdId`, a partir do primeiro membro `active` já
 * seedado em `repositories.members` — nunca cria um household/membro do
 * zero (isso continua responsabilidade de cada teste). Lança se nenhum
 * membro ativo foi seedado para esse household ainda (o autoAuth então
 * deixa a requisição seguir sem cookie, que é o comportamento correto para
 * testes que verificam a ausência de sessão).
 */
async function ensureTestSessionToken(repositories: TestRepositories, householdId: number): Promise<string> {
  const members = await repositories.members.findByHousehold(householdId)
  const activeMember = members.find((member) => member.status === 'active')
  if (!activeMember) {
    throw new Error(`Nenhum membro ativo seedado para o household ${householdId} — autoAuth não pode autenticar esta requisição de teste.`)
  }

  const existingUser = await repositories.users.findById(activeMember.userId)
  if (!existingUser) {
    repositories.users.seed([
      {
        id: activeMember.userId,
        displayName: `Usuário de teste ${activeMember.userId}`,
        email: `usuario-teste-${activeMember.userId}@finanhouse.invalid`,
        status: 'active',
        passwordHash: null,
      },
    ])
  }

  const rawToken = `test-session-user-${activeMember.userId}-household-${householdId}`
  const tokenHash = hashSessionToken(rawToken)
  const existingSession = await repositories.authSessions.findByTokenHash(tokenHash)
  if (!existingSession) {
    await repositories.authSessions.create({
      userId: activeMember.userId,
      householdId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
  }

  return rawToken
}

const HOUSEHOLD_URL_PATTERN = /^\/api\/v1\/households\/(\d+)\//

/** Anexa automaticamente o cookie de sessão de teste a `app.inject()`, sem alterar as chamadas existentes — ver `BuildTestAppOptions.autoAuth`. */
function withAutoAuth(app: ReturnType<typeof createHttpApp>, repositories: TestRepositories): ReturnType<typeof createHttpApp> {
  const originalInject = app.inject.bind(app)

  app.inject = ((opts: unknown) => {
    const normalized: Record<string, unknown> = typeof opts === 'string' ? { url: opts } : { ...(opts as Record<string, unknown>) }
    const headers = (normalized.headers as Record<string, unknown> | undefined) ?? {}
    const hasCookie = 'cookie' in headers || 'Cookie' in headers
    const url = typeof normalized.url === 'string' ? normalized.url : ''
    const match = hasCookie ? null : HOUSEHOLD_URL_PATTERN.exec(url)

    if (!match?.[1]) return originalInject(normalized as never)

    return ensureTestSessionToken(repositories, Number(match[1]))
      .then((rawToken) => originalInject({ ...normalized, headers: { ...headers, cookie: `finanhouse_session=${rawToken}` } } as never))
      .catch(() => originalInject(normalized as never))
  }) as typeof app.inject

  return app
}

export function buildTestApp(options: BuildTestAppOptions = {}) {
  const repositories = options.repositories ?? buildTestRepositories()
  const app = createHttpApp({
    repositories,
    runtimeMode: 'test',
    logger: false,
    readiness: options.readiness,
  })

  if (options.autoAuth === false) return app
  return withAutoAuth(app, repositories as TestRepositories)
}
