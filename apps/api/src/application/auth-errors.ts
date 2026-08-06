/**
 * Mensagem sempre genérica — nunca revela se o e-mail existe, se a senha
 * está errada, ou se a conta está inativa (DT-14).
 */
export class InvalidCredentialsError extends Error {}

/** Cobre token ausente, inexistente, expirado ou revogado — sempre 401, nunca detalha qual caso. */
export class SessionNotFoundError extends Error {}
