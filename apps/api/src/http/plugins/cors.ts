import type { FastifyInstance } from 'fastify'

/**
 * CORS mínimo, sem dependência externa: permite apenas as duas origens locais
 * do frontend demonstrativo, nunca wildcard (`*`), nunca credenciais/cookies.
 * A API ainda não tem autenticação (ver Bloco 16) — restringir origem é a
 * única barreira de navegador disponível até então.
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
    }

    if (request.method === 'OPTIONS') {
      reply.status(204).send()
      return
    }

    done()
  })
}
