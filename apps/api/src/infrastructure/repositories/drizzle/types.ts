import type { MySqlDatabase } from 'drizzle-orm/mysql-core'
import type { MySql2PreparedQueryHKT, MySql2QueryResultHKT } from 'drizzle-orm/mysql2'

/**
 * Tipo aceito pelo construtor de cada repositório Drizzle real: tanto a
 * instância `MySql2Database` obtida de `drizzle(pool)` quanto o `tx` recebido
 * dentro de `db.transaction(async (tx) => ...)` satisfazem este tipo — ambos
 * estendem `MySqlDatabase` com os mesmos parâmetros de tipo (`MySqlTransaction
 * extends MySqlDatabase`). Isso permite compor os mesmos repositórios dentro
 * ou fora de uma transação, sem duplicar implementação nem acoplar a uma
 * conexão específica (ver `apps/api/src/db/pool.ts`).
 */
export type DrizzleDb = MySqlDatabase<MySql2QueryResultHKT, MySql2PreparedQueryHKT, Record<string, never>>
