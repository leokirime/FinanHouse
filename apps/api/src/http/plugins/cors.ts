import type { FastifyInstance } from 'fastify'

/**
 * CORS mínimo, sem dependência externa: permite apenas as origens
 * explicitamente configuradas (`allowedOrigins`, resolvidas por
 * `config/cors-config.ts` — origens locais em desenvolvimento, obrigatórias e
 * nunca localhost em produção), nunca wildcard (`*`). Desde o Bloco 19
 * (DT-14), o cookie de sessão `HttpOnly` exige
 * `Access-Control-Allow-Credentials: true` — só é seguro porque a lista de
 * origens permitidas continua fechada (nunca wildcard combinado com
 * credenciais, o que o próprio navegador já recusa).
 */
export function registerCorsPlugin(fastify: FastifyInstance, allowedOrigins: readonly string[]): void {
  const allowed = new Set(allowedOrigins)

  fastify.addHook('onRequest', (request, reply, done) => {
    const origin = request.headers.origin
    if (origin && allowed.has(origin)) {
      reply.header('Access-Control-Allow-Origin', origin)
      reply.header('Vary', 'Origin')
      reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
      reply.header('Access-Control-Allow-Headers', 'Content-Type')
      reply.header('Access-Control-Allow-Credentials', 'true')
    }

    if (request.method === 'OPTIONS') {
      reply.status(204).send()
      return
    }

    done()
  })
}
