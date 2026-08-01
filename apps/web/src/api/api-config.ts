export class ApiConfigError extends Error {}

export interface ApiConfig {
  baseUrl: string
  householdId: number
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
 * Resolve e valida a configuração da API antes da primeira chamada. Nunca
 * assume que o primeiro household é `1` — a única fonte é
 * `VITE_FINANHOUSE_HOUSEHOLD_ID`, preenchida localmente após o bootstrap
 * estrutural (`apps/api/scripts/db-bootstrap-household.ts`).
 */
export function resolveApiConfig(env: ImportMetaEnv = import.meta.env): ApiConfig {
  const baseUrl = env.VITE_API_BASE_URL?.trim()
  if (!baseUrl) {
    throw new ApiConfigError('VITE_API_BASE_URL não configurada (variável de ambiente local do workspace web).')
  }
  assertHttpUrl('VITE_API_BASE_URL', baseUrl)

  const householdIdRaw = env.VITE_FINANHOUSE_HOUSEHOLD_ID?.trim()
  if (!householdIdRaw) {
    throw new ApiConfigError('VITE_FINANHOUSE_HOUSEHOLD_ID não configurada (variável de ambiente local do workspace web).')
  }
  const householdId = Number(householdIdRaw)
  if (!Number.isSafeInteger(householdId) || householdId <= 0) {
    throw new ApiConfigError('VITE_FINANHOUSE_HOUSEHOLD_ID precisa ser um inteiro positivo.')
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ''), householdId }
}
