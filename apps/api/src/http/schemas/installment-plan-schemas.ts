import { moneyStringPattern, positiveIdBodySchema, referenceMonthPattern } from './common.js'

const MAX_DESCRIPTION_LENGTH = 255
const MIN_INSTALLMENT_COUNT = 2
const MIN_DUE_DAY = 1
const MAX_DUE_DAY = 31

/**
 * `createdByUserId` não faz parte do corpo — vem da sessão autenticada,
 * mesmo padrão de `createFinancialEntryBodySchema` (Bloco 19, DT-14). Sem
 * `id`: o plano é sempre novo (não existe PUT/PATCH estrutural — imutável,
 * Sessão 12, Bloco 01).
 */
export const createInstallmentPurchaseBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['description', 'categoryId', 'totalAmount', 'installmentCount', 'firstReferenceMonth', 'dueDay'],
  properties: {
    description: { type: 'string', minLength: 1, maxLength: MAX_DESCRIPTION_LENGTH },
    categoryId: positiveIdBodySchema,
    totalAmount: { type: 'string', pattern: moneyStringPattern },
    installmentCount: { type: 'integer', minimum: MIN_INSTALLMENT_COUNT },
    firstReferenceMonth: { type: 'string', pattern: referenceMonthPattern },
    dueDay: { type: 'integer', minimum: MIN_DUE_DAY, maximum: MAX_DUE_DAY },
  },
} as const
