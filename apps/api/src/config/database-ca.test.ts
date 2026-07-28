import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseCaResolutionError, resolveCaCertificate } from './database-ca.js'

const VALID_PEM = '-----BEGIN CERTIFICATE-----\nMIIB0zCCAXygAwIBAgIUfake==\n-----END CERTIFICATE-----\n'

describe('resolveCaCertificate', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'finanhouse-ca-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('rejeita quando nenhuma origem de CA está configurada', () => {
    expect(() => resolveCaCertificate({})).toThrow(DatabaseCaResolutionError)
  })

  it('rejeita quando as duas origens de CA estão configuradas simultaneamente', () => {
    const caPath = path.join(tempDir, 'ca.pem')
    writeFileSync(caPath, VALID_PEM, 'utf-8')

    expect(() =>
      resolveCaCertificate({
        DATABASE_CA_PATH: caPath,
        DATABASE_CA_CERT_BASE64: Buffer.from(VALID_PEM, 'utf-8').toString('base64'),
      }),
    ).toThrow(/exatamente uma origem/)
  })

  it('aceita certificado por caminho de arquivo (DATABASE_CA_PATH)', () => {
    const caPath = path.join(tempDir, 'ca.pem')
    writeFileSync(caPath, VALID_PEM, 'utf-8')

    const ca = resolveCaCertificate({ DATABASE_CA_PATH: caPath })
    expect(ca).toBe(VALID_PEM)
  })

  it('aceita certificado por conteúdo em Base64 (DATABASE_CA_CERT_BASE64)', () => {
    const base64Value = Buffer.from(VALID_PEM, 'utf-8').toString('base64')
    const ca = resolveCaCertificate({ DATABASE_CA_CERT_BASE64: base64Value })
    expect(ca).toBe(VALID_PEM)
  })

  it('rejeita quando o arquivo indicado em DATABASE_CA_PATH não existe', () => {
    const caPath = path.join(tempDir, 'nao-existe.pem')
    expect(() => resolveCaCertificate({ DATABASE_CA_PATH: caPath })).toThrow(DatabaseCaResolutionError)
  })

  it('rejeita quando DATABASE_CA_PATH aponta para um diretório em vez de um arquivo', () => {
    expect(() => resolveCaCertificate({ DATABASE_CA_PATH: tempDir })).toThrow(/arquivo regular/)
  })

  it('rejeita quando o arquivo de certificado está vazio', () => {
    const caPath = path.join(tempDir, 'vazio.pem')
    writeFileSync(caPath, '', 'utf-8')
    expect(() => resolveCaCertificate({ DATABASE_CA_PATH: caPath })).toThrow(/vazio/)
  })

  it('rejeita quando DATABASE_CA_CERT_BASE64 está vazio', () => {
    expect(() => resolveCaCertificate({ DATABASE_CA_CERT_BASE64: '' })).toThrow(DatabaseCaResolutionError)
  })

  it('rejeita conteúdo que não está no formato PEM esperado (arquivo)', () => {
    const caPath = path.join(tempDir, 'invalido.pem')
    writeFileSync(caPath, 'isto nao e um certificado', 'utf-8')
    expect(() => resolveCaCertificate({ DATABASE_CA_PATH: caPath })).toThrow(/PEM/)
  })

  it('rejeita conteúdo que não está no formato PEM esperado (Base64)', () => {
    const base64Value = Buffer.from('isto nao e um certificado', 'utf-8').toString('base64')
    expect(() => resolveCaCertificate({ DATABASE_CA_CERT_BASE64: base64Value })).toThrow(/PEM/)
  })

  it('a mensagem de erro de arquivo ausente não ecoa o caminho configurado', () => {
    const caPath = path.join(tempDir, 'segredo-nao-deve-aparecer.pem')
    try {
      resolveCaCertificate({ DATABASE_CA_PATH: caPath })
      throw new Error('deveria ter lançado DatabaseCaResolutionError')
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseCaResolutionError)
      expect((error as Error).message).not.toContain(caPath)
    }
  })

  it('nunca inclui o valor Base64 original na mensagem de erro', () => {
    const base64Value = Buffer.from('conteudo-invalido-mas-secreto', 'utf-8').toString('base64')
    try {
      resolveCaCertificate({ DATABASE_CA_CERT_BASE64: base64Value })
      throw new Error('deveria ter lançado DatabaseCaResolutionError')
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseCaResolutionError)
      expect((error as Error).message).not.toContain(base64Value)
    }
  })
})
