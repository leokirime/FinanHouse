import type { ApiConfig } from './api-config.ts'
import { ApiError, apiErrorFromServerCode } from './api-errors.ts'

const REQUEST_TIMEOUT_MS = 10_000

export interface ApiRequestInit {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  /** Query string já pronta (ex.: `?periodId=1`), sem o `?` — opcional. */
  query?: Record<string, string | number | undefined>
  /** Sinal externo (ex.: cancelamento por unmount ou nova requisição) — nunca usado para logs. */
  signal?: AbortSignal
}

function buildQueryString(query: ApiRequestInit['query']): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

async function parseErrorBody(response: Response): Promise<ApiError> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return new ApiError('unexpected_response', 'A API respondeu com um erro em formato inesperado.', { httpStatus: response.status })
  }
  const errorShape = payload as { error?: { code?: string; message?: string } }
  if (errorShape?.error?.code && errorShape.error.message) {
    return apiErrorFromServerCode(errorShape.error.code, errorShape.error.message, response.status)
  }
  return new ApiError('unexpected_response', 'A API respondeu com um erro em formato inesperado.', { httpStatus: response.status })
}

/**
 * Cliente HTTP de baixo nível: `fetch` com timeout objetivo, cancelamento
 * externo (`AbortController`) e interpretação do contrato `{ data }` /
 * `{ error: { code, message } }` (`Docs/03_contracts/contrato_api_http.md`).
 * Nunca registra corpo de requisição/resposta em log — apenas método e rota.
 */
export async function apiRequest<T>(config: ApiConfig, path: string, init: ApiRequestInit = {}): Promise<T> {
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS)
  const onExternalAbort = () => timeoutController.abort()
  init.signal?.addEventListener('abort', onExternalAbort)

  const url = `${config.baseUrl}${path}${buildQueryString(init.query)}`

  try {
    const response = await fetch(url, {
      method: init.method ?? 'GET',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: timeoutController.signal,
    })

    if (response.status === 204) {
      return undefined as T
    }

    if (!response.ok) {
      throw await parseErrorBody(response)
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new ApiError('unexpected_response', 'A API respondeu com sucesso, mas em formato inesperado.', { httpStatus: response.status })
    }
    const successShape = payload as { data?: T }
    if (successShape && 'data' in successShape) {
      return successShape.data as T
    }
    throw new ApiError('unexpected_response', 'A API respondeu com sucesso, mas sem o campo "data" esperado.', { httpStatus: response.status })
  } catch (error) {
    if (error instanceof ApiError) throw error

    if (error instanceof DOMException && error.name === 'AbortError') {
      if (init.signal?.aborted) {
        throw new ApiError('cancelled', 'Requisição cancelada.')
      }
      throw new ApiError('timeout', 'A API não respondeu a tempo. Tente novamente.')
    }

    throw new ApiError('network', 'Não foi possível conectar à API. Verifique se ela está em execução.')
  } finally {
    clearTimeout(timeoutId)
    init.signal?.removeEventListener('abort', onExternalAbort)
  }
}
