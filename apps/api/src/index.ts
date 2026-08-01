import { startHttpServer } from './http/server.js'

startHttpServer().catch((error) => {
  console.error('Falha ao iniciar o servidor HTTP.', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
