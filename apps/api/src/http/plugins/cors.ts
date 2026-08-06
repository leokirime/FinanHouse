import type { FastifyInstance } from 'fastify'

/**
 * CORS mínimo, sem dependência externa: permite apenas as duas origens locais
 * do frontend, nunca wildcard (`*`). Desde o Bloco 19 (DT-14), o cookie de
 * sessão `HttpOnly` exige `Access-Control-Allow-Credentials: true` — só é
 * seguro porque a lista de origens permitidas continua fechada (nunca
 * wildcard combinado com credenciais, o que o próprio navegador já recusa).
 */
const ALLOWED_ORIGINS = new Set(['http://127.0.0.1:5173', 'http://localhost:5173'])

export function registerCorsPlugin(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', (request, reply, done) => {
    const origin = request.headers.origin
    if (origin && ALLOWED_ORIGINS.has(origin)) {
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
