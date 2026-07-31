/**
 * Reduz um erro de driver (mysql2/Drizzle) a uma categoria genérica, sem
 * nunca ecoar a mensagem original — que pode conter host, usuário ou
 * fragmentos de configuração de conexão.
 */
export function categorizeConnectionError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('access denied')) return 'autenticação recusada pelo servidor'
  if (lower.includes('unknown database')) return 'banco de dados inexistente'
  if (lower.includes('econnrefused') || lower.includes('enotfound') || lower.includes('ehostunreach')) {
    return 'host inacessível'
  }
  if (lower.includes('etimedout') || lower.includes('timeout')) return 'tempo de conexão esgotado'
  if (lower.includes('ssl') || lower.includes('tls') || lower.includes('certificate') || lower.includes('handshake')) {
    return 'incompatibilidade de TLS/SSL'
  }

  return 'erro de banco de dados não classificado'
}
