export class ApiConfigError extends Error {}

export interface ApiConfig {
  baseUrl: string
  householdId: number
}

/** Só a base URL da API — resolvida uma única vez, antes de existir qualquer sessão. */
export interface ApiBaseConfig {
  baseUrl: string
}

function assertHttpUrl(name: string, value: string): void {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new ApiConfigError(`${name} precisa ser uma URL válida (ex.: http://127.0.0.1:3000).`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ApiConfigError(`${name} precisa usar http: ou https:.`)
  }
}

/**
 * Resolve e valida a base da API — usada antes de qualquer chamada,
 * inclusive login (`Docs/03_contracts/contrato_api_http.md`). Desde o
 * Bloco 19 (DT-14), `householdId` nunca vem daqui: é resolvido pela sessão
 * autenticada (`GET /api/v1/auth/session`), nunca de uma variável de
 * ambiente ou hardcoded no bundle.
 *
 * `VITE_API_BASE_URL` precisa existir (mesmo padrão de configuração
 * explícita do projeto — nunca um fallback implícito), mas seu valor pode
 * ser explicitamente vazio: significa "mesma origem do frontend", usado com
 * o proxy `/api` do Vite (`vite.config.ts`) para o cookie de sessão nunca
 * cruzar hosts diferentes (`localhost` vs `127.0.0.1`) — o que o navegador
 * trata como cross-site e bloqueia um cookie `SameSite=Lax` em `fetch`.
 */
export function resolveApiBaseConfig(env: ImportMetaEnv = import.meta.env): ApiBaseConfig {
  if (env.VITE_API_BASE_URL === undefined) {
    throw new ApiConfigError('VITE_API_BASE_URL não configurada (variável de ambiente local do workspace web).')
  }

  const baseUrl = env.VITE_API_BASE_URL.trim()
  if (baseUrl === '') {
    return { baseUrl: '' }
  }

  assertHttpUrl('VITE_API_BASE_URL', baseUrl)
  return { baseUrl: baseUrl.replace(/\/+$/, '') }
}

/**
 * Combina a base da API já resolvida com o `householdId` da sessão
 * autenticada — nunca lido de env/hardcoded (DT-14). `householdId` é
 * validado defensivamente mesmo vindo do próprio backend, mesma postura de
 * "nunca confiar em uma única camada de validação" já usada no resto do
 * cliente HTTP.
 */
export function resolveApiConfig(householdId: number, env: ImportMetaEnv = import.meta.env): ApiConfig {
  const { baseUrl } = resolveApiBaseConfig(env)
  if (!Number.isSafeInteger(householdId) || householdId <= 0) {
    throw new ApiConfigError('householdId inválido — a sessão autenticada não retornou um household válido.')
  }
  return { baseUrl, householdId }
}
