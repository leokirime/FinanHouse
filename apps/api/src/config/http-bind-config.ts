export class HttpBindConfigError extends Error {}

export interface HttpBindConfigEnv {
  HTTP_HOST?: string
}

export type HttpBindRuntimeMode = 'development' | 'test' | 'production'

const DEVELOPMENT_DEFAULT_HOST = '127.0.0.1'
const LOCAL_HOST_VALUES = new Set(['127.0.0.1', 'localhost'])

/**
 * Resolve o host de bind HTTP a partir do ambiente. Fora de produção, cai
 * para `127.0.0.1` quando `HTTP_HOST` não está definido — preserva o
 * comportamento local existente (`vite.config.ts` só fala com a API em
 * `127.0.0.1`). Em produção, a variável é obrigatória e nunca aceita
 * `127.0.0.1`/`localhost` (fail closed: um host de loopback ficaria
 * inacessível para qualquer tráfego externo, contradizendo o propósito de
 * publicar a API — Sessão 14, Bloco 01).
 */
export function resolveBindHost(runtimeMode: HttpBindRuntimeMode, env: HttpBindConfigEnv): string {
  const configured = env.HTTP_HOST?.trim()

  if (runtimeMode !== 'production') {
    return configured || DEVELOPMENT_DEFAULT_HOST
  }

  if (!configured) {
    throw new HttpBindConfigError('HTTP_HOST é obrigatório em produção — configure o host de bind fornecido pela plataforma (ex.: "0.0.0.0").')
  }
  if (LOCAL_HOST_VALUES.has(configured.toLowerCase())) {
    throw new HttpBindConfigError(`HTTP_HOST="${configured}" não é permitido em produção — a API ficaria inacessível fora da própria máquina.`)
  }
  return configured
}
