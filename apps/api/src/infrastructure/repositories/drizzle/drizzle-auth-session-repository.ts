import { eq } from 'drizzle-orm'
import type { ResultSetHeader } from 'mysql2/promise'
import type { AuthSession, AuthSessionRepository, NewAuthSession } from '../../../application/ports/auth-session-repository.js'
import { authSessions } from '../../../db/schema/index.js'
import { toDomainAuthSession } from './mappers/auth-session-mapper.js'
import { HouseholdScopeViolationError, translatePersistenceError } from './persistence-errors.js'
import type { DrizzleDb } from './types.js'

/**
 * Adaptador Drizzle real da porta `AuthSessionRepository`.
 *
 * HISTÓRICO (Bloco 19, DT-14): a versão original usava `nextId()` (lendo
 * `information_schema.TABLES.AUTO_INCREMENT`) + um único `save()` que
 * fazia `INSERT` ou `UPDATE` dependendo da existência prévia do `id`. Duas
 * falhas foram encontradas em produção, nesta ordem:
 *
 *   1. `information_schema.TABLES.AUTO_INCREMENT` é metadata do InnoDB que
 *      não avança de forma confiável quando o `id` é sempre atribuído
 *      explicitamente (nunca deixado para o auto-increment real) — na
 *      prática, `nextId()` passou a devolver sempre o mesmo valor já usado
 *      pela primeira sessão criada, fazendo todo login seguinte colidir
 *      nesse `id` e entrar no ramo de `UPDATE`, que não regravava
 *      `token_hash` — a sessão no banco nunca voltava a corresponder ao
 *      cookie emitido, e a validação de sessão seguinte sempre falhava
 *      (401), mesmo com login bem-sucedido.
 *   2. A correção seguinte (ler `MAX(id) + 1` da própria tabela em vez de
 *      `information_schema`, e regravar `token_hash` também no `UPDATE`)
 *      resolveu o sintoma observado, mas manteve uma condição de corrida
 *      real: dois logins simultâneos ainda podiam calcular o mesmo próximo
 *      `id` antes de qualquer `INSERT` acontecer — para o mesmo usuário,
 *      um login sobrescreveria silenciosamente o `token_hash` do outro
 *      (invalidando a sessão mais antiga sem aviso); para usuários
 *      diferentes, o segundo `INSERT` falharia por `ER_DUP_ENTRY`.
 *
 * CORREÇÃO DEFINITIVA: o `id` nunca é calculado em código. `create()` faz
 * um `INSERT` sem `id`, deixando o `AUTO_INCREMENT` nativo do MySQL gerá-lo
 * — o valor real vem de `ResultSetHeader.insertId`, devolvido pelo próprio
 * banco de forma atômica por conexão/transação, sem qualquer leitura
 * prévia sujeita a colisão. `create()` e `update()` são métodos separados
 * (nunca um `save()` ambíguo): `create()` sempre insere uma sessão nova;
 * `update()` só existe para tocar uma sessão já existente (revogação,
 * `lastUsedAt`) e nunca altera `token_hash` — o hash pertence
 * exclusivamente ao momento da criação.
 */
export class DrizzleAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    try {
      const rows = await this.db.select().from(authSessions).where(eq(authSessions.tokenHash, tokenHash)).limit(1)
      return rows[0] ? toDomainAuthSession(rows[0]) : null
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  async create(session: NewAuthSession): Promise<AuthSession> {
    try {
      const [result] = (await this.db.insert(authSessions).values({
        userId: session.userId,
        householdId: session.householdId,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
        revokedAt: null,
        createdAt: session.createdAt,
        lastUsedAt: null,
      })) as unknown as [ResultSetHeader, unknown]

      return {
        id: result.insertId,
        userId: session.userId,
        householdId: session.householdId,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
        revokedAt: null,
        createdAt: session.createdAt,
        lastUsedAt: null,
      }
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }

  /** Nunca cria: só atualiza `expiresAt`/`revokedAt`/`lastUsedAt` de uma sessão já existente do mesmo usuário — `token_hash` nunca é regravado aqui. */
  async update(session: AuthSession): Promise<AuthSession> {
    try {
      const existing = await this.db
        .select({ userId: authSessions.userId })
        .from(authSessions)
        .where(eq(authSessions.id, session.id))
        .limit(1)

      if (existing.length === 0 || existing[0]?.userId !== session.userId) {
        throw new HouseholdScopeViolationError(`Sessão ${session.id} não encontrada ou pertence a outro usuário — atualização bloqueada.`)
      }

      await this.db
        .update(authSessions)
        .set({ expiresAt: session.expiresAt, revokedAt: session.revokedAt, lastUsedAt: session.lastUsedAt })
        .where(eq(authSessions.id, session.id))

      return session
    } catch (error) {
      throw translatePersistenceError(error)
    }
  }
}
