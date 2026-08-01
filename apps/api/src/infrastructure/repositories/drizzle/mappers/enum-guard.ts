import { UnexpectedPersistedValueError } from '../persistence-errors.js'

/**
 * Valida que um valor de coluna pertence às constantes de enum conhecidas do
 * domínio antes de tratá-lo como tal — nunca um `as` irrestrito. Falha de
 * maneira controlada (`UnexpectedPersistedValueError`) se o banco contiver um
 * valor fora do esperado, em vez de propagar um valor inválido para o
 * domínio silenciosamente.
 */
export function assertKnownValue<T extends string>(value: string, allowed: readonly T[], fieldName: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new UnexpectedPersistedValueError(`${fieldName} contém valor inesperado no banco: "${value}".`)
  }
  return value as T
}
