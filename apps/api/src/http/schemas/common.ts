/** Prefixo comum de todas as rotas financeiras — sempre escopadas por household. */
export const HOUSEHOLD_BASE_PATH = '/api/v1/households/:householdId'

/**
 * Fragmentos de JSON Schema reutilizados por várias rotas — validados pelo
 * AJV embutido do Fastify antes de qualquer handler rodar. Mantidos aqui
 * para nunca duplicar um padrão de validação entre rotas diferentes.
 */

/** Parâmetro de rota `:householdId`/`:entryId` — string de dígitos, sem zero à esquerda, sem sinal. */
export const idParamPattern = '^[1-9][0-9]{0,14}$'

/** `YYYY-MM-DD` — mesmo formato exigido por `assertValidDate` no domínio. */
export const datePattern = '^\\d{4}-\\d{2}-\\d{2}$'

/** `YYYY-MM-01` — mesmo formato exigido por `assertValidReferenceMonth` no domínio. */
export const referenceMonthPattern = '^\\d{4}-\\d{2}-01$'

/**
 * Dinheiro como string decimal com exatamente duas casas — mesmo formato
 * exigido por `parseMoney` (`@finanhouse/domain`). Nunca aceitar `type:
 * 'number'` aqui: um valor JSON numérico é rejeitado pelo próprio schema,
 * antes de chegar ao handler.
 */
export const moneyStringPattern = '^\\d+\\.\\d{2}$'

export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER

/** `type: 'integer'` positivo, limitado a `Number.MAX_SAFE_INTEGER` — para IDs recebidos no corpo (não na URL). */
export const positiveIdBodySchema = {
  type: 'integer',
  minimum: 1,
  maximum: MAX_SAFE_INTEGER,
} as const

export const householdIdParamSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['householdId'],
  properties: {
    householdId: { type: 'string', pattern: idParamPattern },
  },
} as const

export const householdAndEntryIdParamSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['householdId', 'entryId'],
  properties: {
    householdId: { type: 'string', pattern: idParamPattern },
    entryId: { type: 'string', pattern: idParamPattern },
  },
} as const

export const householdAndReferenceMonthParamSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['householdId', 'referenceMonth'],
  properties: {
    householdId: { type: 'string', pattern: idParamPattern },
    referenceMonth: { type: 'string', pattern: referenceMonthPattern },
  },
} as const

export const householdReferenceMonthAndCategoryIdParamSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['householdId', 'referenceMonth', 'categoryId'],
  properties: {
    householdId: { type: 'string', pattern: idParamPattern },
    referenceMonth: { type: 'string', pattern: referenceMonthPattern },
    categoryId: { type: 'string', pattern: idParamPattern },
  },
} as const

/**
 * Converte um parâmetro de rota já validado pelo pattern `idParamPattern`
 * para `number`, com uma checagem defensiva adicional de
 * `Number.isSafeInteger` (o pattern já impede zero/negativo/decimal/texto,
 * mas nunca confiar em uma única camada de validação).
 */
export function parseIdParam(value: string): number {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new RangeError(`Identificador inválido: "${value}".`)
  }
  return parsed
}
