import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createHttpApp } from './app.js'
import { buildTestApp, buildTestRepositories } from './test-support/build-test-app.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

  it('recusa runtimeMode "production" — a API ainda não tem autenticação real', () => {
    expect(() =>
      createHttpApp({ repositories: buildTestRepositories(), runtimeMode: 'production', logger: false }),
    ).toThrow(/production/)
  })

  it('aceita runtimeMode "development" e "test" normalmente', () => {
    expect(() => {
      app = buildTestApp()
    }).not.toThrow()
    expect(() =>
      createHttpApp({ repositories: buildTestRepositories(), runtimeMode: 'development', logger: false }),
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

  it('rota inexistente retorna 404 (sem stack trace nem detalhe interno)', async () => {
    app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/nao-existe' })
    expect(response.statusCode).toBe(404)
    expect(response.body).not.toContain('at ')
  })
})

describe('bootstrap runtime (http/server.ts) — bind estritamente local', () => {
  it('nunca faz bind em 0.0.0.0, nem lê host de variável de ambiente', () => {
    const source = readFileSync(path.join(__dirname, 'server.ts'), 'utf8')
    expect(source).toContain("'127.0.0.1'")
    expect(source).not.toContain('0.0.0.0')
    expect(source).not.toMatch(/process\.env\.(HOST|HTTP_HOST)/)
  })

  it('não chama mysql.createPool/createConnection nem lê .env.local no escopo do módulo (só dentro de funções, nunca em column 0)', () => {
    const source = readFileSync(path.join(__dirname, 'server.ts'), 'utf8')
    // Sem indentação (início de linha) indicaria uma chamada no escopo do módulo —
    // dentro de uma função (indentado) é o padrão esperado (`loadLocalEnv`/`startHttpServer`).
    expect(source).not.toMatch(/^(mysql\.createPool|mysql\.createConnection|process\.loadEnvFile)\(/m)
  })
})
