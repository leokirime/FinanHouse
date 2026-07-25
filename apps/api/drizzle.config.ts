import { defineConfig } from 'drizzle-kit'

/**
 * Configuração do drizzle-kit — usada apenas para `generate` (e `check`) nesta fase.
 * Nunca contém credenciais e nunca conecta ao banco: `generate` é puramente estático,
 * a partir do schema TypeScript em `src/db/schema/`.
 *
 * Proibido: `drizzle-kit push` (sincronização automática) em qualquer ambiente.
 * `drizzle-kit migrate` só é executado mediante autorização explícita do proprietário
 * (ver Docs/02_architecture/adr_001_persistencia_drizzle_mysql2.md).
 */
export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema/index.ts',
  out: '../../database/migrations',
})
