import type { FastifyInstance } from 'fastify'
import { getHealthStatus } from '../../health.js'

/** Confirma apenas que o processo HTTP está ativo — nunca consulta o banco. */
export function registerHealthRoute(fastify: FastifyInstance): void {
  fastify.get('/health', async (_request, reply) => {
    reply.status(200).send(getHealthStatus())
  })
}
