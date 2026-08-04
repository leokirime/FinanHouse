import { moneyStringPattern } from './common.js'

export const putCategoryBudgetBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['limitAmount'],
  properties: {
    limitAmount: { type: 'string', pattern: moneyStringPattern },
  },
} as const
