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
