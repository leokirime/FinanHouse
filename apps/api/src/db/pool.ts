import mysql from 'mysql2/promise'
import type { DatabaseConfig } from '../config/database-config.js'

export interface DatabasePool {
  pool: mysql.Pool
  close: () => Promise<void>
}

/**
 * Cria um pool de conexões mysql2 a partir de uma configuração já validada
 * (`resolveDatabaseConfig`). A criação do pool não abre conexão — o mysql2
 * só conecta de fato na primeira consulta. Nunca chamar esta função durante
 * a importação de um módulo; deve ser criada sob demanda, uma única vez, e
 * reaproveitada — nunca um pool novo por requisição.
 */
export function createDatabasePool(config: DatabaseConfig): DatabasePool {
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: {
      ca: config.ssl.ca,
      rejectUnauthorized: config.ssl.rejectUnauthorized,
      minVersion: config.ssl.minVersion,
    },
    connectionLimit: 5,
  })

  return {
    pool,
    close: () => pool.end(),
  }
}
