const MAX_EMAIL_LENGTH = 255
const MAX_PASSWORD_LENGTH = 255

export const loginBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', minLength: 1, maxLength: MAX_EMAIL_LENGTH },
    password: { type: 'string', minLength: 1, maxLength: MAX_PASSWORD_LENGTH },
  },
} as const
