import { datePattern } from './common.js'

/** `PUT .../periods/:referenceMonth` não aceita corpo — a identidade da competência vem inteira da URL. */
export const putMonthlyPeriodBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {},
} as const

/**
 * `closedByUserId` não faz parte do corpo desde o Bloco 19 (DT-14) — vem da
 * sessão autenticada (`request.authSession.userId`), nunca do cliente
 * (impede forjar outro usuário como responsável pelo fechamento).
 */
export const closeMonthlyPeriodBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['closedAt'],
  properties: {
    closedAt: { type: 'string', pattern: datePattern },
  },
} as const
