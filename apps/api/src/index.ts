import { createServer } from './server.js'

const port = process.env.PORT ? Number(process.env.PORT) : 3001

createServer().listen(port, () => {
  console.log(`finanhouse-api listening on port ${port}`)
})
