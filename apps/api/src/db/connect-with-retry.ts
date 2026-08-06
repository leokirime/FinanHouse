import { classifyDatabaseConnectionError, type ConnectionErrorClassification } from './connection-error-classifier.js'

export interface ConnectWithRetryOptions {
  maxAttempts?: number
  delaysMs?: number[]
  /** Injetável — nos testes, nunca deve esperar um timer real. */
  delay?: (ms: number) => Promise<void>
}

export type ConnectWithRetryResult =
  | { ok: true; attempts: number }
  | { ok: false; attempts: number; classification: ConnectionErrorClassification; lastError: unknown }

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_DELAYS_MS = [500, 1000, 2000]

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Executa `attempt()` até `maxAttempts` vezes (3 por padrão), com atraso
 * progressivo entre tentativas — só quando o erro é classificado como
 * transitório. Erros não transitórios (credencial, certificado, banco
 * inexistente, SQL estrutural) encerram na primeira tentativa, sem retry,
 * para nunca mascarar uma falha real de configuração como indisponibilidade
 * momentânea.
 */
export async function connectWithRetry(
  attempt: () => Promise<void>,
  options: ConnectWithRetryOptions = {},
): Promise<ConnectWithRetryResult> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const delaysMs = options.delaysMs ?? DEFAULT_DELAYS_MS
  const delay = options.delay ?? defaultDelay

  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber++) {
    try {
      await attempt()
      return { ok: true, attempts: attemptNumber }
    } catch (error) {
      const classification = classifyDatabaseConnectionError(error)
      const isLastAttempt = attemptNumber === maxAttempts

      if (!classification.transient || isLastAttempt) {
        return { ok: false, attempts: attemptNumber, classification, lastError: error }
      }

      await delay(delaysMs[attemptNumber - 1] ?? delaysMs.at(-1) ?? 0)
    }
  }

  /* c8 ignore next -- inalcançável: o loop sempre retorna dentro de si mesmo. */
  throw new Error('connectWithRetry: estado inalcançável.')
}
