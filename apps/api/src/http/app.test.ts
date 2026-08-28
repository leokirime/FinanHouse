import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { InMemoryInstallmentTransactionRunner } from '../infrastructure/repositories/memory/index.js'
import { createHttpApp } from './app.js'
import { sessionCookieOptions } from './plugins/auth.js'
import { buildTestApp, buildTestRepositories } from './test-support/build-test-app.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function testTransactionRunner(repositories: ReturnType<typeof buildTestRepositories>) {
  return new InMemoryInstallmentTransactionRunner(
    repositories.installmentPlans,
    repositories.entries,
    repositories.periods,
    repositories.categories,
  )
}

describe('createHttpApp', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  it('cria a aplicação sem efeitos colaterais (sem lançar, sem abrir conexão)', () => {
    expect(() => {
      app = buildTestApp()
    }).not.toThrow()
  })

  /**
   * Sessão 14, Bloco 01 — remediação do NO-GO de deploy pós-Sessão 12: até
   * aqui, `runtimeMode: 'production'` era recusado incondicionalmente. Agora
   * a aplicação PODE ser construída em produção, mas só com pré-condições de
   * CORS explícitas e seguras — fail closed em qualquer outro caso, nunca um
   * fallback silencioso para localhost.
   */
  describe('runtimeMode "production" — validação de pré-condições (fail closed)', () => {
    it('production SEM corsAllowedOrigins configuradas: rejeita (usaria o padrão de desenvolvimento, inseguro em produção)', () => {
      const repositories = buildTestRepositories()
      expect(() =>
        createHttpApp({
          repositories,
          runtimeMode: 'production',
          logger: false,
          installmentTransactionRunner: testTransactionRunner(repositories),
        }),
      ).toThrow(/CORS/)
    })

    it('production com corsAllowedOrigins vazia: rejeita', () => {
      const repositories = buildTestRepositories()
      expect(() =>
        createHttpApp({
          repositories,
          runtimeMode: 'production',
          logger: false,
          installmentTransactionRunner: testTransactionRunner(repositories),
          corsAllowedOrigins: [],
        }),
      ).toThrow(/CORS/)
    })

    it('production com origem localhost/127.0.0.1: rejeita, mesmo que não vazia', () => {
      const repositories = buildTestRepositories()
      expect(() =>
        createHttpApp({
          repositories,
          runtimeMode: 'production',
          logger: false,
          installmentTransactionRunner: testTransactionRunner(repositories),
          corsAllowedOrigins: ['http://localhost:5173'],
        }),
      ).toThrow(/localhost/)
    })

    it('production com origem pública válida: constrói normalmente', () => {
      const repositories = buildTestRepositories()
      expect(() => {
        app = createHttpApp({
          repositories,
          runtimeMode: 'production',
          logger: false,
          installmentTransactionRunner: testTransactionRunner(repositories),
          corsAllowedOrigins: ['https://app.housemanager.example'],
        })
      }).not.toThrow()
    })

    it('em produção, o cookie de sessão sempre exige Secure — invariante preservada (sessionCookieOptions)', () => {
      expect(sessionCookieOptions('production').secure).toBe(true)
    })
  })

  it('aceita runtimeMode "development" e "test" normalmente, sem exigir corsAllowedOrigins (cai para as origens locais do Vite)', () => {
    expect(() => {
      app = buildTestApp()
    }).not.toThrow()
    const repositories = buildTestRepositories()
    expect(() =>
      createHttpApp({
        repositories,
        runtimeMode: 'development',
        logger: false,
        installmentTransactionRunner: testTransactionRunner(repositories),
      }),
    ).not.toThrow()
  })

  it('encerra a aplicação sem lançar (close controlado)', async () => {
    app = buildTestApp()
    await expect(app.close()).resolves.toBeUndefined()
    app = undefined
  })

  it('GET /health retorna 200 sem consultar dependências', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok', service: 'finanhouse-api' })
  })

  it('GET /ready usa a dependência de readiness injetada (sem conexão real) e retorna 200 quando pronta', async () => {
    app = buildTestApp({
      readiness: async () => ({
        ready: true,
        checks: { configResolved: true, poolAvailable: true, connectionOk: true, tlsActive: true },
      }),
    })
    const response = await app.inject({ method: 'GET', url: '/ready' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      data: { ready: true, checks: { configResolved: true, poolAvailable: true, connectionOk: true, tlsActive: true } },
    })
  })

  it('GET /ready retorna 503 quando a dependência injetada reporta indisponibilidade', async () => {
    app = buildTestApp({
      readiness: async () => ({
        ready: false,
        checks: { configResolved: true, poolAvailable: true, connectionOk: false, tlsActive: false },
      }),
    })
    const response = await app.inject({ method: 'GET', url: '/ready' })
    expect(response.statusCode).toBe(503)
  })

  it('GET /ready nunca propaga o erro bruto da verificação de disponibilidade', async () => {
    app = buildTestApp({
      readiness: async () => {
        throw new Error('connect ECONNREFUSED minha-instancia-secreta.aivencloud.com:12345')
      },
    })
    const response = await app.inject({ method: 'GET', url: '/ready' })
    expect(response.statusCode).toBe(503)
    const text = response.body
    expect(text).not.toContain('aivencloud')
    expect(text).not.toContain('12345')
  })

  it('sem dependência de readiness injetada, o padrão é "não pronto" (nunca abre conexão sozinho)', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/ready' })
    expect(response.statusCode).toBe(503)
    expect(response.json().data.ready).toBe(false)
  })

  it('CORS: origem local permitida (127.0.0.1:5173) recebe o cabeçalho Access-Control-Allow-Origin', async () => {
    app = buildTestApp()
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://127.0.0.1:5173' },
    })
    expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5173')
  })

  it('CORS: origem local permitida (localhost:5173) recebe o cabeçalho', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'http://localhost:5173' } })
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('CORS: origem não permitida não recebe o cabeçalho (nunca wildcard)', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'http://evil.example' } })
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('CORS: nunca usa "*" como origem permitida em nenhuma resposta', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'http://127.0.0.1:5173' } })
    expect(response.headers['access-control-allow-origin']).not.toBe('*')
  })

  it('CORS: requisição OPTIONS (preflight) responde 204 sem corpo', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'OPTIONS', url: '/health', headers: { origin: 'http://127.0.0.1:5173' } })
    expect(response.statusCode).toBe(204)
  })

  it('CORS: corsAllowedOrigins customizada é respeitada de ponta a ponta (Sessão 14, Bloco 01) — origem configurada passa, origem local deixa de passar', async () => {
    const repositories = buildTestRepositories()
    app = createHttpApp({
      repositories,
      runtimeMode: 'test',
      logger: false,
      installmentTransactionRunner: testTransactionRunner(repositories),
      corsAllowedOrigins: ['https://app.housemanager.example'],
    })

    const allowed = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'https://app.housemanager.example' } })
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.housemanager.example')

    const rejected = await app.inject({ method: 'GET', url: '/health', headers: { origin: 'http://127.0.0.1:5173' } })
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('rota inexistente retorna 404 (sem stack trace nem detalhe interno)', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/nao-existe' })
    expect(response.statusCode).toBe(404)
    expect(response.body).not.toContain('at ')
  })
})

describe('bootstrap runtime (http/server.ts) — host/CORS resolvidos por configuração, nunca hardcoded (Sessão 14, Bloco 01)', () => {
  it('nunca hardcoda "0.0.0.0" como host — a resolução é sempre delegada a config/http-bind-config.ts', () => {
    const source = readFileSync(path.join(__dirname, 'server.ts'), 'utf8')
    expect(source).not.toContain("'0.0.0.0'")
    expect(source).not.toContain('"0.0.0.0"')
  })

  it('delega a resolução de host e CORS aos módulos de configuração dedicados, nunca lê process.env.HTTP_HOST/CORS_ALLOWED_ORIGINS diretamente', () => {
    const source = readFileSync(path.join(__dirname, 'server.ts'), 'utf8')
    expect(source).toContain('resolveBindHost(')
    expect(source).toContain('resolveCorsAllowedOrigins(')
    expect(source).not.toMatch(/process\.env\.(HOST|HTTP_HOST|CORS_ALLOWED_ORIGINS)\b/)
  })

  it('não chama mysql.createPool/createConnection nem lê .env.local no escopo do módulo (só dentro de funções, nunca em column 0)', () => {
    const source = readFileSync(path.join(__dirname, 'server.ts'), 'utf8')
    // Sem indentação (início de linha) indicaria uma chamada no escopo do módulo —
    // dentro de uma função (indentado) é o padrão esperado (`loadLocalEnv`/`startHttpServer`).
    expect(source).not.toMatch(/^(mysql\.createPool|mysql\.createConnection|process\.loadEnvFile)\(/m)
  })
})
