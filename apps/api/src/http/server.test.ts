import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Verificação comportamental (não apenas estática) de que importar
 * `http/server.ts` não produz nenhum efeito colateral: nenhuma leitura de
 * `.env.local`, nenhuma criação de pool de conexão, nenhum bind de porta.
 * Essas operações só podem acontecer dentro de `startHttpServer()`, nunca
 * no escopo do módulo — usa mocks/spies + importação dinâmica para provar
 * isso na prática, em vez de inspecionar o texto-fonte.
 */
describe('http/server.ts — ausência de efeitos colaterais durante a importação (comportamental)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.doUnmock('../db/pool.js')
    vi.resetModules()
  })

  it('importar o módulo não chama process.loadEnvFile, não cria pool de banco e não escuta porta alguma', async () => {
    const loadEnvFileSpy = vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {})
    const createDatabasePoolMock = vi.fn()
    vi.doMock('../db/pool.js', () => ({ createDatabasePool: createDatabasePoolMock }))

    await import('./server.js')

    expect(loadEnvFileSpy).not.toHaveBeenCalled()
    expect(createDatabasePoolMock).not.toHaveBeenCalled()
  })

  it('importar o módulo não instancia a aplicação Fastify (createHttpApp nunca é chamada fora de startHttpServer)', async () => {
    vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {})
    vi.doMock('../db/pool.js', () => ({ createDatabasePool: vi.fn() }))
    const createHttpAppMock = vi.fn()
    vi.doMock('./app.js', () => ({ createHttpApp: createHttpAppMock }))

    await import('./server.js')

    expect(createHttpAppMock).not.toHaveBeenCalled()
  })

  it('exporta startHttpServer como função, sem executá-la ao importar', async () => {
    vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {})
    const createDatabasePoolMock = vi.fn()
    vi.doMock('../db/pool.js', () => ({ createDatabasePool: createDatabasePoolMock }))

    const module = await import('./server.js')

    expect(typeof module.startHttpServer).toBe('function')
    // Se a importação tivesse efeitos colaterais, o pool já teria sido criado neste ponto.
    expect(createDatabasePoolMock).not.toHaveBeenCalled()
  })
})

const VALID_CONFIG = {
  provider: 'aiven' as const,
  environment: 'development' as const,
  host: 'finanhouse-mysql-example.aivencloud.com',
  port: 23306,
  user: 'finanhouse_dev_app',
  password: 'segredo-de-teste',
  database: 'finanhouse_dev',
  ssl: { ca: 'fake', rejectUnauthorized: true as const, minVersion: 'TLSv1.2' as const },
}

class ProcessExitCalled extends Error {
  constructor(readonly code: number | undefined) {
    super(`process.exit(${code}) chamado`)
  }
}

/**
 * Reproduz o bug encontrado ao investigar a falha intermitente de
 * inicialização (Bloco 19, pós-checkpoint): `app.listen()` pode falhar por
 * um motivo completamente alheio ao banco (ex.: `EADDRINUSE`, uma instância
 * anterior do `tsx watch` ainda liberando a porta) — mas o código antigo
 * reaproveitava `categorizeConnectionError` (pensado para erros de conexão
 * com o banco) nesse catch, rotulando qualquer falha de `listen()` como
 * "erro de banco de dados não classificado". Estes testes verificam o
 * comportamento real (mocks + chamada de `startHttpServer()`), não apenas o
 * texto-fonte: a etapa de conexão com o banco e a etapa de vinculação da
 * porta HTTP agora usam classificadores e mensagens completamente separados.
 */
describe('http/server.ts — startHttpServer() (comportamental, com dependências mockadas)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.doUnmock('../db/pool.js')
    vi.doUnmock('./app.js')
    vi.doUnmock('../config/database-config.js')
    vi.doUnmock('../db/connect-with-retry.js')
    vi.doUnmock('../infrastructure/repositories/drizzle/create-drizzle-repositories.js')
    vi.doUnmock('drizzle-orm/mysql2')
    vi.resetModules()
  })

  function mockCommonDependencies(options: {
    connectWithRetryResult: unknown
    listenImplementation?: () => Promise<void>
  }) {
    vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new ProcessExitCalled(typeof code === 'number' ? code : undefined)
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.doMock('../config/database-config.js', () => ({
      DatabaseConfigError: class DatabaseConfigError extends Error {},
      resolveDatabaseConfig: vi.fn(() => VALID_CONFIG),
    }))

    const connectWithRetryMock = vi.fn().mockResolvedValue(options.connectWithRetryResult)
    vi.doMock('../db/connect-with-retry.js', () => ({ connectWithRetry: connectWithRetryMock }))

    const fakePool = { pool: { getConnection: vi.fn() }, close: vi.fn().mockResolvedValue(undefined) }
    const createDatabasePoolMock = vi.fn(() => fakePool)
    vi.doMock('../db/pool.js', () => ({ createDatabasePool: createDatabasePoolMock }))

    vi.doMock('drizzle-orm/mysql2', () => ({ drizzle: vi.fn(() => ({})) }))
    vi.doMock('../infrastructure/repositories/drizzle/create-drizzle-repositories.js', () => ({
      createDrizzleRepositories: vi.fn(() => ({})),
    }))

    const listenMock = vi.fn(options.listenImplementation ?? (() => Promise.resolve(undefined)))
    const fakeApp = { listen: listenMock, close: vi.fn().mockResolvedValue(undefined) }
    const createHttpAppMock = vi.fn(() => fakeApp)
    vi.doMock('./app.js', () => ({ createHttpApp: createHttpAppMock }))

    return { exitSpy, errorSpy, fakePool, fakeApp, createHttpAppMock, listenMock }
  }

  it('conexão inicial com o banco falha (não transitório): nunca chega a criar a app HTTP nem a chamar listen()', async () => {
    const { exitSpy, errorSpy, createHttpAppMock } = mockCommonDependencies({
      connectWithRetryResult: {
        ok: false,
        attempts: 1,
        classification: { category: 'autenticação recusada pelo servidor', code: 'ER_ACCESS_DENIED_ERROR', transient: false },
        lastError: new Error('irrelevante'),
      },
    })

    const { startHttpServer } = await import('./server.js')

    await expect(startHttpServer()).rejects.toThrow(ProcessExitCalled)

    expect(createHttpAppMock).not.toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalledWith(1)
    const loggedMessage = errorSpy.mock.calls.map((call) => call.join(' ')).join('\n')
    expect(loggedMessage).toContain('Etapa: conexão inicial com o banco')
    expect(loggedMessage).toContain('autenticação recusada pelo servidor')
  })

  it('app.listen() falha (EADDRINUSE): a mensagem NUNCA menciona banco de dados — regressão do bug investigado', async () => {
    const listenError = Object.assign(new Error('listen EADDRINUSE: address already in use 127.0.0.1:3000'), {
      code: 'EADDRINUSE',
    })
    const { exitSpy, errorSpy, createHttpAppMock, listenMock } = mockCommonDependencies({
      connectWithRetryResult: { ok: true, attempts: 1 },
      listenImplementation: () => Promise.reject(listenError),
    })

    const { startHttpServer } = await import('./server.js')

    await expect(startHttpServer()).rejects.toThrow(ProcessExitCalled)

    expect(createHttpAppMock).toHaveBeenCalledTimes(1)
    expect(listenMock).toHaveBeenCalledTimes(1)
    expect(exitSpy).toHaveBeenCalledWith(1)
    const loggedMessage = errorSpy.mock.calls.map((call) => call.join(' ')).join('\n')
    expect(loggedMessage).toContain('Etapa: vinculação da porta HTTP')
    expect(loggedMessage).toContain('porta já em uso')
    expect(loggedMessage.toLowerCase()).not.toContain('banco')
  })

  it('conexão com o banco e listen() bem-sucedidos: escuta em 127.0.0.1 na porta padrão, sem chamar process.exit', async () => {
    const { exitSpy, listenMock } = mockCommonDependencies({
      connectWithRetryResult: { ok: true, attempts: 1 },
    })

    const { startHttpServer } = await import('./server.js')
    await startHttpServer()

    expect(listenMock).toHaveBeenCalledWith({ port: 3000, host: '127.0.0.1' })
    expect(exitSpy).not.toHaveBeenCalled()
  })

  /**
   * Sessão 14, Bloco 01 — remediação do NO-GO de deploy pós-Sessão 12: prova
   * de ponta a ponta (não só nos módulos de configuração isolados) de que
   * `startHttpServer()` falha fechado em produção sem configuração explícita,
   * e funciona normalmente com configuração válida — nunca chega a criar a
   * app HTTP nem a chamar `listen()` quando a configuração é insegura.
   */
  describe('produção — pré-condições de host/CORS (fail closed, ponta a ponta)', () => {
    it('NODE_ENV=production sem HTTP_HOST/CORS_ALLOWED_ORIGINS: nunca chega a resolver o banco nem a criar a app HTTP', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      const { exitSpy, errorSpy, createHttpAppMock } = mockCommonDependencies({
        connectWithRetryResult: { ok: true, attempts: 1 },
      })

      const { startHttpServer } = await import('./server.js')
      await expect(startHttpServer()).rejects.toThrow(ProcessExitCalled)

      expect(createHttpAppMock).not.toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(1)
      const loggedMessage = errorSpy.mock.calls.map((call) => call.join(' ')).join('\n')
      expect(loggedMessage).toContain('Configuração inválida')
    })

    it('NODE_ENV=production com HTTP_HOST=127.0.0.1 (mesmo com CORS configurado): rejeita antes de qualquer conexão de banco', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('HTTP_HOST', '127.0.0.1')
      vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://app.housemanager.example')
      const { exitSpy, createHttpAppMock } = mockCommonDependencies({
        connectWithRetryResult: { ok: true, attempts: 1 },
      })

      const { startHttpServer } = await import('./server.js')
      await expect(startHttpServer()).rejects.toThrow(ProcessExitCalled)

      expect(createHttpAppMock).not.toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('NODE_ENV=production com HTTP_HOST/CORS_ALLOWED_ORIGINS válidos: escuta no host configurado, sem chamar process.exit', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('HTTP_HOST', '0.0.0.0')
      vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://app.housemanager.example')
      const { exitSpy, listenMock } = mockCommonDependencies({
        connectWithRetryResult: { ok: true, attempts: 1 },
      })

      const { startHttpServer } = await import('./server.js')
      await startHttpServer()

      expect(listenMock).toHaveBeenCalledWith({ port: 3000, host: '0.0.0.0' })
      expect(exitSpy).not.toHaveBeenCalled()
    })
  })
})
