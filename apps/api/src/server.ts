import { createServer as createHttpServer, type Server } from 'node:http'
import { getHealthStatus } from './health.js'

export function createServer(): Server {
  return createHttpServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(getHealthStatus()))
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'not_found' }))
  })
}
