import { datePattern, positiveIdBodySchema } from './common.js'

/** `PUT .../periods/:referenceMonth` não aceita corpo — a identidade da competência vem inteira da URL. */
export const putMonthlyPeriodBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {},
} as const

export const closeMonthlyPeriodBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['closedByUserId', 'closedAt'],
  properties: {
    closedByUserId: positiveIdBodySchema,
    closedAt: { type: 'string', pattern: datePattern },
  },
} as const
