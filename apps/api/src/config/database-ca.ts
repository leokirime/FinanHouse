import { readFileSync, statSync } from 'node:fs'

export class DatabaseCaResolutionError extends Error {}

export interface DatabaseCaEnv {
  DATABASE_CA_PATH?: string
  DATABASE_CA_CERT_BASE64?: string
}

const PEM_MARKER = '-----BEGIN CERTIFICATE-----'

function assertPemContent(content: string, sourceLabel: string): void {
  if (content.trim().length === 0) {
    throw new DatabaseCaResolutionError(`Certificado CA (${sourceLabel}) está vazio.`)
  }
  if (!content.includes(PEM_MARKER)) {
    throw new DatabaseCaResolutionError(`Certificado CA (${sourceLabel}) não contém um certificado no formato PEM esperado.`)
  }
}

function resolveFromPath(caPath: string): string {
  let stats
  try {
    stats = statSync(caPath)
  } catch {
    throw new DatabaseCaResolutionError('O arquivo indicado em DATABASE_CA_PATH não foi encontrado.')
  }

  if (!stats.isFile()) {
    throw new DatabaseCaResolutionError('DATABASE_CA_PATH não aponta para um arquivo regular.')
  }

  const content = readFileSync(caPath, 'utf-8')
  assertPemContent(content, 'DATABASE_CA_PATH')
  return content
}

function resolveFromBase64(base64Value: string): string {
  const content = Buffer.from(base64Value, 'base64').toString('utf-8')
  assertPemContent(content, 'DATABASE_CA_CERT_BASE64')
  return content
}

/**
 * Resolve o certificado CA a partir de exatamente uma origem (caminho de
 * arquivo XOR conteúdo em Base64). Nunca lê nem loga o valor de
 * DATABASE_CA_PATH ou o certificado em si nas mensagens de erro — apenas o
 * nome da variável envolvida.
 */
export function resolveCaCertificate(env: DatabaseCaEnv): string {
  const pathValue = env.DATABASE_CA_PATH?.trim()
  const base64Value = env.DATABASE_CA_CERT_BASE64?.trim()

  const hasPath = Boolean(pathValue)
  const hasBase64 = Boolean(base64Value)

  if (hasPath && hasBase64) {
    throw new DatabaseCaResolutionError(
      'Configure exatamente uma origem de certificado CA: DATABASE_CA_PATH ou DATABASE_CA_CERT_BASE64, nunca as duas ao mesmo tempo.',
    )
  }

  if (!hasPath && !hasBase64) {
    throw new DatabaseCaResolutionError(
      'Nenhuma origem de certificado CA configurada. Defina DATABASE_CA_PATH ou DATABASE_CA_CERT_BASE64.',
    )
  }

  return hasPath ? resolveFromPath(pathValue!) : resolveFromBase64(base64Value!)
}
