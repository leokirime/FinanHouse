import { FINANCIAL_ENTRY_TYPES } from '@finanhouse/domain'
import { datePattern, moneyStringPattern, positiveIdBodySchema } from './common.js'

const MAX_DESCRIPTION_LENGTH = 255
const MAX_NOTES_LENGTH = 500

/**
 * `createdByUserId` não faz parte do corpo desde o Bloco 19 (DT-14) — vem da
 * sessão autenticada (`request.authSession.userId`), nunca do cliente
 * (impede forjar outro usuário como autor da movimentação).
 */
export const createFinancialEntryBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['periodId', 'categoryId', 'entryType', 'description', 'expectedAmount'],
  properties: {
    periodId: positiveIdBodySchema,
    categoryId: positiveIdBodySchema,
    responsibleMemberId: { anyOf: [positiveIdBodySchema, { type: 'null' }] },
    entryType: { type: 'string', enum: [...FINANCIAL_ENTRY_TYPES] },
    description: { type: 'string', minLength: 1, maxLength: MAX_DESCRIPTION_LENGTH },
    expectedAmount: { type: 'string', pattern: moneyStringPattern },
    dueDate: { anyOf: [{ type: 'string', pattern: datePattern }, { type: 'null' }] },
    notes: { anyOf: [{ type: 'string', maxLength: MAX_NOTES_LENGTH }, { type: 'null' }] },
  },
} as const

export const updateFinancialEntryBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    categoryId: positiveIdBodySchema,
    responsibleMemberId: { anyOf: [positiveIdBodySchema, { type: 'null' }] },
    description: { type: 'string', minLength: 1, maxLength: MAX_DESCRIPTION_LENGTH },
    expectedAmount: { type: 'string', pattern: moneyStringPattern },
    dueDate: { anyOf: [{ type: 'string', pattern: datePattern }, { type: 'null' }] },
    notes: { anyOf: [{ type: 'string', maxLength: MAX_NOTES_LENGTH }, { type: 'null' }] },
  },
} as const

export const realizeFinancialEntryBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['actualAmount', 'realizationDate'],
  properties: {
    actualAmount: { type: 'string', pattern: moneyStringPattern },
    realizationDate: { type: 'string', pattern: datePattern },
  },
} as const

export const listEntriesQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    periodId: { type: 'string', pattern: '^[1-9][0-9]{0,14}$' },
  },
} as const
