import type { FastifyInstance } from 'fastify'

export interface ReadinessChecks {
  configResolved: boolean
  poolAvailable: boolean
  connectionOk: boolean
  tlsActive: boolean
}

export interface ReadinessResult {
  ready: boolean
  checks: ReadinessChecks
}

/**
 * Verificação de disponibilidade real (config resolvida, pool disponível,
 * conexão funcional, TLS ativo) — implementada fora desta rota e injetada,
 * para que testes unitários possam usar uma dependência falsa sem abrir
 * conexão real. Nunca deve lançar; qualquer falha interna deve ser
 * convertida em `{ ready: false, checks: {...} }` por quem implementa.
 */
export type ReadinessCheck = () => Promise<ReadinessResult>

const UNAVAILABLE_CHECKS: ReadinessChecks = {
  configResolved: false,
  poolAvailable: false,
  connectionOk: false,
  tlsActive: false,
}

export function registerReadyRoute(fastify: FastifyInstance, readinessCheck: ReadinessCheck): void {
  fastify.get('/ready', async (_request, reply) => {
    try {
      const result = await readinessCheck()
      reply.status(result.ready ? 200 : 503).send({ data: result })
    } catch {
      // Nunca propaga a mensagem/erro bruto da verificação — só o estado sanitizado "indisponível".
      reply.status(503).send({ data: { ready: false, checks: UNAVAILABLE_CHECKS } })
    }
  })
}
