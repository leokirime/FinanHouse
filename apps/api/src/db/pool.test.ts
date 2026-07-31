import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createPoolMock } = vi.hoisted(() => ({
  createPoolMock: vi.fn((_options: Record<string, unknown>) => ({ end: vi.fn() })),
}))

vi.mock('mysql2/promise', () => ({
  default: { createPool: createPoolMock },
}))

const VALID_CONFIG = {
  provider: 'aiven' as const,
  environment: 'development' as const,
  host: 'finanhouse-mysql-example.aivencloud.com',
  port: 23306,
  user: 'finanhouse_dev_app',
  password: 'segredo-de-teste',
  database: 'finanhouse_dev',
  ssl: {
    ca: '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----\n',
    rejectUnauthorized: true as const,
    minVersion: 'TLSv1.2' as const,
  },
}

describe('createDatabasePool', () => {
  beforeEach(() => {
    createPoolMock.mockClear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('não chama createPool durante a importação do módulo', async () => {
    await import('./pool.js')
    expect(createPoolMock).not.toHaveBeenCalled()
  })

  it('cria o pool apenas quando a factory é chamada explicitamente', async () => {
    const { createDatabasePool } = await import('./pool.js')
    expect(createPoolMock).not.toHaveBeenCalled()

    createDatabasePool(VALID_CONFIG)
    expect(createPoolMock).toHaveBeenCalledTimes(1)
  })

  it('usa rejectUnauthorized true e minVersion TLSv1.2 no ssl do pool', async () => {
    const { createDatabasePool } = await import('./pool.js')
    createDatabasePool(VALID_CONFIG)

    const [options] = createPoolMock.mock.calls.at(-1)!
    expect(options.ssl).toMatchObject({ rejectUnauthorized: true, minVersion: 'TLSv1.2' })
  })

  it('nunca inclui override de checkServerIdentity na configuração ssl do pool', async () => {
    const { createDatabasePool } = await import('./pool.js')
    createDatabasePool(VALID_CONFIG)

    const [options] = createPoolMock.mock.calls.at(-1)!
    expect('checkServerIdentity' in (options.ssl as object)).toBe(false)
  })

  it('não expõe a senha em nenhum valor fora do objeto de config passado ao driver', async () => {
    const { createDatabasePool } = await import('./pool.js')
    createDatabasePool(VALID_CONFIG)

    const [options] = createPoolMock.mock.calls.at(-1)!
    expect(options.password).toBe(VALID_CONFIG.password)
  })
})
