export class CorsConfigError extends Error {}

export interface CorsConfigEnv {
  CORS_ALLOWED_ORIGINS?: string
}

export type CorsRuntimeMode = 'development' | 'test' | 'production'

/** Origens do servidor de desenvolvimento do Vite (`vite.config.ts`) — nunca usadas como fallback em produção. */
export const DEVELOPMENT_DEFAULT_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173']

function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
}

function parseOriginList(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

function assertValidOrigin(origin: string): void {
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    throw new CorsConfigError(`CORS_ALLOWED_ORIGINS contém uma origem inválida: "${origin}" (precisa ser uma URL, ex.: https://app.exemplo.com).`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new CorsConfigError(`CORS_ALLOWED_ORIGINS: a origem "${origin}" precisa usar http: ou https:.`)
  }
  if (`${url.protocol}//${url.host}` !== origin) {
    throw new CorsConfigError(`CORS_ALLOWED_ORIGINS: a origem "${origin}" deve conter só protocolo e host, sem path/query/hash.`)
  }
}

/**
 * Gate de defesa em profundidade — chamado por `createHttpApp` sempre que
 * `runtimeMode === 'production'`, independente de como as origens chegaram
 * até ali. Garante que mesmo uma chamada direta (ex.: um teste ou um script)
 * nunca construa a aplicação em modo produção com CORS aberto/local
 * (Sessão 14, Bloco 01 — remediação do NO-GO de deploy pós-Sessão 12).
 */
export function assertOriginsSafeForProduction(origins: readonly string[]): void {
  if (origins.length === 0) {
    throw new CorsConfigError('Nenhuma origem CORS configurada — obrigatório em produção (defina CORS_ALLOWED_ORIGINS).')
  }
  for (const origin of origins) {
    assertValidOrigin(origin)
    if (isLocalOrigin(origin)) {
      throw new CorsConfigError(`Origem CORS "${origin}" aponta para localhost/127.0.0.1 — não permitido em produção.`)
    }
  }
}

/**
 * Resolve as origens permitidas de CORS a partir do ambiente. Fora de
 * produção, cai para as origens locais do Vite quando `CORS_ALLOWED_ORIGINS`
 * não está definida — preserva o comportamento de desenvolvimento existente
 * (`vite.config.ts`, proxy same-origin). Em produção, a variável é
 * obrigatória e nunca aceita origem localhost/127.0.0.1 (fail closed: nunca
 * "se não tiver config, usa localhost").
 */
export function resolveCorsAllowedOrigins(env: CorsConfigEnv, runtimeMode: CorsRuntimeMode): string[] {
  const raw = env.CORS_ALLOWED_ORIGINS?.trim()

  if (runtimeMode !== 'production') {
    if (!raw) return DEVELOPMENT_DEFAULT_ORIGINS
    const origins = parseOriginList(raw)
    for (const origin of origins) assertValidOrigin(origin)
    return origins
  }

  if (!raw) {
    throw new CorsConfigError('CORS_ALLOWED_ORIGINS é obrigatório em produção — configure a(s) origem(ns) pública(s) do frontend.')
  }
  const origins = parseOriginList(raw)
  assertOriginsSafeForProduction(origins)
  return origins
}
