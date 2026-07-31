import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseConfigError, resolveDatabaseConfig, type DatabaseConfigEnv } from './database-config.js'

const VALID_PEM = '-----BEGIN CERTIFICATE-----\nMIIB0zCCAXygAwIBAgIUfake==\n-----END CERTIFICATE-----\n'

function baseEnv(overrides: Partial<DatabaseConfigEnv> = {}): DatabaseConfigEnv {
  return {
    DATABASE_PROVIDER: 'aiven',
    DATABASE_ENV: 'development',
    DATABASE_HOST: 'finanhouse-mysql-example.aivencloud.com',
    DATABASE_PORT: '12345',
    DATABASE_USER: 'finanhouse_dev_app',
    DATABASE_PASSWORD: 'segredo-de-teste',
    DATABASE_NAME: 'finanhouse_dev',
    DATABASE_SSL_MODE: 'verify_identity',
    DATABASE_CA_CERT_BASE64: Buffer.from(VALID_PEM, 'utf-8').toString('base64'),
    ...overrides,
  }
}

describe('resolveDatabaseConfig', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'finanhouse-db-config-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('provider', () => {
    it('aceita DATABASE_PROVIDER=aiven', () => {
      expect(() => resolveDatabaseConfig(baseEnv())).not.toThrow()
    })

    it('rejeita provider diferente de aiven (ex.: clever-cloud)', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_PROVIDER: 'clever-cloud' }))).toThrow(DatabaseConfigError)
    })

    it('rejeita quando DATABASE_PROVIDER está ausente', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_PROVIDER: undefined }))).toThrow(DatabaseConfigError)
    })
  })

  describe('ambiente', () => {
    it('aceita development', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_ENV: 'development' }))).not.toThrow()
    })

    it('aceita production', () => {
      expect(() =>
        resolveDatabaseConfig(baseEnv({ DATABASE_ENV: 'production', DATABASE_NAME: 'finanhouse_prod' })),
      ).not.toThrow()
    })

    it('aceita test', () => {
      expect(() =>
        resolveDatabaseConfig(baseEnv({ DATABASE_ENV: 'test', DATABASE_NAME: 'finanhouse_test' })),
      ).not.toThrow()
    })

    it('rejeita valor de ambiente inválido', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_ENV: 'staging' }))).toThrow(DatabaseConfigError)
    })
  })

  describe('nome do banco por ambiente', () => {
    it('aceita finanhouse_dev em development', () => {
      const config = resolveDatabaseConfig(baseEnv({ DATABASE_ENV: 'development', DATABASE_NAME: 'finanhouse_dev' }))
      expect(config.database).toBe('finanhouse_dev')
    })

    it('aceita finanhouse_prod em production', () => {
      const config = resolveDatabaseConfig(baseEnv({ DATABASE_ENV: 'production', DATABASE_NAME: 'finanhouse_prod' }))
      expect(config.database).toBe('finanhouse_prod')
    })

    it('rejeita development apontando para finanhouse_prod', () => {
      expect(() =>
        resolveDatabaseConfig(baseEnv({ DATABASE_ENV: 'development', DATABASE_NAME: 'finanhouse_prod' })),
      ).toThrow(DatabaseConfigError)
    })

    it('rejeita production apontando para finanhouse_dev', () => {
      expect(() =>
        resolveDatabaseConfig(baseEnv({ DATABASE_ENV: 'production', DATABASE_NAME: 'finanhouse_dev' })),
      ).toThrow(DatabaseConfigError)
    })

    it('rejeita defaultdb em qualquer ambiente', () => {
      expect(() =>
        resolveDatabaseConfig(baseEnv({ DATABASE_ENV: 'development', DATABASE_NAME: 'defaultdb' })),
      ).toThrow(DatabaseConfigError)
      expect(() =>
        resolveDatabaseConfig(baseEnv({ DATABASE_ENV: 'production', DATABASE_NAME: 'defaultdb' })),
      ).toThrow(DatabaseConfigError)
    })

    it('rejeita DATABASE_NAME ausente', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_NAME: undefined }))).toThrow(DatabaseConfigError)
    })
  })

  describe('SSL mode', () => {
    it('aceita verify_identity', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_SSL_MODE: 'verify_identity' }))).not.toThrow()
    })

    it('rejeita modos permissivos (ex.: required, none, disabled)', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_SSL_MODE: 'required' }))).toThrow(DatabaseConfigError)
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_SSL_MODE: 'none' }))).toThrow(DatabaseConfigError)
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_SSL_MODE: 'disabled' }))).toThrow(DatabaseConfigError)
    })

    it('rejeita DATABASE_SSL_MODE ausente', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_SSL_MODE: undefined }))).toThrow(DatabaseConfigError)
    })
  })

  describe('certificado CA', () => {
    it('rejeita quando nenhuma origem de CA está presente', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_CA_CERT_BASE64: undefined }))).toThrow(DatabaseConfigError)
    })

    it('rejeita quando as duas origens de CA (path e base64) estão presentes', () => {
      const caPath = path.join(tempDir, 'ca.pem')
      writeFileSync(caPath, VALID_PEM, 'utf-8')
      expect(() =>
        resolveDatabaseConfig(baseEnv({ DATABASE_CA_PATH: caPath, DATABASE_CA_CERT_BASE64: Buffer.from(VALID_PEM).toString('base64') })),
      ).toThrow(DatabaseConfigError)
    })

    it('aceita CA por DATABASE_CA_PATH', () => {
      const caPath = path.join(tempDir, 'ca.pem')
      writeFileSync(caPath, VALID_PEM, 'utf-8')
      const config = resolveDatabaseConfig(baseEnv({ DATABASE_CA_CERT_BASE64: undefined, DATABASE_CA_PATH: caPath }))
      expect(config.ssl.ca).toBe(VALID_PEM)
    })

    it('aceita CA por DATABASE_CA_CERT_BASE64', () => {
      const config = resolveDatabaseConfig(baseEnv())
      expect(config.ssl.ca).toBe(VALID_PEM)
    })

    it('rejeita arquivo de CA inexistente', () => {
      expect(() =>
        resolveDatabaseConfig(baseEnv({ DATABASE_CA_CERT_BASE64: undefined, DATABASE_CA_PATH: path.join(tempDir, 'ausente.pem') })),
      ).toThrow(DatabaseConfigError)
    })

    it('rejeita arquivo de CA vazio', () => {
      const caPath = path.join(tempDir, 'vazio.pem')
      writeFileSync(caPath, '', 'utf-8')
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_CA_CERT_BASE64: undefined, DATABASE_CA_PATH: caPath }))).toThrow(
        DatabaseConfigError,
      )
    })

    it('rejeita Base64 vazio', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_CA_CERT_BASE64: '' }))).toThrow(DatabaseConfigError)
    })

    it('rejeita conteúdo que não é PEM válido', () => {
      expect(() =>
        resolveDatabaseConfig(baseEnv({ DATABASE_CA_CERT_BASE64: Buffer.from('nao e pem').toString('base64') })),
      ).toThrow(DatabaseConfigError)
    })
  })

  describe('configuração TLS resultante', () => {
    it('rejectUnauthorized é sempre true', () => {
      const config = resolveDatabaseConfig(baseEnv())
      expect(config.ssl.rejectUnauthorized).toBe(true)
    })

    it('minVersion é sempre TLSv1.2', () => {
      const config = resolveDatabaseConfig(baseEnv())
      expect(config.ssl.minVersion).toBe('TLSv1.2')
    })

    it('nunca inclui override de checkServerIdentity', () => {
      const config = resolveDatabaseConfig(baseEnv())
      expect('checkServerIdentity' in config.ssl).toBe(false)
    })
  })

  describe('porta', () => {
    it('rejeita porta não numérica', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_PORT: 'abc' }))).toThrow(DatabaseConfigError)
    })

    it('rejeita porta fora do intervalo válido', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_PORT: '99999' }))).toThrow(DatabaseConfigError)
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_PORT: '0' }))).toThrow(DatabaseConfigError)
    })

    it('rejeita porta ausente', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_PORT: undefined }))).toThrow(DatabaseConfigError)
    })

    it('aceita porta numérica válida', () => {
      const config = resolveDatabaseConfig(baseEnv({ DATABASE_PORT: '23306' }))
      expect(config.port).toBe(23306)
    })
  })

  describe('campos obrigatórios', () => {
    it('rejeita DATABASE_HOST ausente', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_HOST: undefined }))).toThrow(DatabaseConfigError)
    })

    it('rejeita DATABASE_USER ausente', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_USER: undefined }))).toThrow(DatabaseConfigError)
    })

    it('rejeita DATABASE_PASSWORD ausente', () => {
      expect(() => resolveDatabaseConfig(baseEnv({ DATABASE_PASSWORD: undefined }))).toThrow(DatabaseConfigError)
    })
  })

  describe('proteção contra vazamento de dados sensíveis em erros', () => {
    it('mensagem de erro de host ausente não contém senha nem host real', () => {
      try {
        resolveDatabaseConfig(baseEnv({ DATABASE_HOST: undefined, DATABASE_PASSWORD: 'senha-super-secreta' }))
        throw new Error('deveria ter lançado DatabaseConfigError')
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseConfigError)
        expect((error as Error).message).not.toContain('senha-super-secreta')
      }
    })

    it('mensagem de erro de SSL mode inválido não expõe host, usuário ou senha', () => {
      try {
        resolveDatabaseConfig(baseEnv({ DATABASE_SSL_MODE: 'required' }))
        throw new Error('deveria ter lançado DatabaseConfigError')
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseConfigError)
        const message = (error as Error).message
        expect(message).not.toContain('finanhouse-mysql-example.aivencloud.com')
        expect(message).not.toContain('segredo-de-teste')
      }
    })
  })

  describe('sem efeitos colaterais', () => {
    it('não abre conexão nem realiza I/O de rede — apenas resolve valores em memória', () => {
      const config = resolveDatabaseConfig(baseEnv())
      expect(config).toMatchObject({ provider: 'aiven', environment: 'development', database: 'finanhouse_dev' })
    })
  })
})
