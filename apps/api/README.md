# apps/api

API do Finanhouse: Node.js + TypeScript.

## Executar localmente

```bash
npm install   # na raiz do monorepo
npm run dev --workspace=api
```

Servidor sobe em `http://localhost:3001` (porta configurável via `PORT`).

## Endpoints

- `GET /health` → `{ "status": "ok", "service": "finanhouse-api" }`

## Scripts

- `npm run dev` — servidor de desenvolvimento (`tsx watch`)
- `npm run build` — compila TypeScript para `dist/`
- `npm start` — executa o build compilado
- `npm run lint` — lint (oxlint)
- `npm run typecheck` — checagem de tipos sem emitir arquivos (`src/`)
- `npm run typecheck:scripts` — checagem de tipos incluindo `scripts/` (`src/` + `scripts/`)
- `npm test` — testes (vitest)
- `npm run db:check` — abre uma única conexão de teste com o Aiven e reporta status não sensível (provider, ambiente, banco, versão do MySQL, TLS ativo). Não executado automaticamente.
- `npm run db:migrate` — aplica as migrations versionadas em `database/migrations/`. Exige `CONFIRM_DATABASE_MIGRATION=true` explícito; não executado automaticamente.
- `npm run db:seed:dev` — popula `finanhouse_dev` com dados sintéticos mínimos; bloqueado fora de `DATABASE_ENV=development`/`DATABASE_NAME=finanhouse_dev`. Não executado automaticamente.

## Banco de dados (Aiven for MySQL)

Drizzle ORM + `mysql2` sobre Aiven for MySQL — ver `Docs/02_architecture/decisoes_tecnicas.md` (DT-07) e `Docs/03_contracts/contrato_banco_dados.md`. Toda configuração de conexão é resolvida e validada de forma centralizada e pura por `resolveDatabaseConfig` (`src/config/database-config.ts`), reaproveitada pela aplicação, pela factory de pool (`src/db/pool.ts`) e pelos três scripts acima — nenhuma validação duplicada. TLS é obrigatório e estrito (`rejectUnauthorized: true`, `minVersion: 'TLSv1.2'`, sem override de `checkServerIdentity`), com certificado CA resolvido a partir de `DATABASE_CA_PATH` **ou** `DATABASE_CA_CERT_BASE64` (nunca as duas, nunca versionado). Variáveis reais só existem em `apps/api/.env.local` (nunca versionado) — ver `.env.example` na raiz e `Docs/03_contracts/contrato_variaveis_ambiente.md`.

Status: configuração, TLS/CA, factory de pool e scripts preparados (Bloco `bloco_11_migracao_da_infraestrutura_mysql_para_aiven`). Nenhuma conexão real foi estabelecida, nenhuma migration foi aplicada, nenhum seed foi executado ainda — a validação real de TLS (`npm run db:check` com `apps/api/.env.local` preenchido) é o próximo passo pendente. Nenhuma autenticação de usuário final implementada.
