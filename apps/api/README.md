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

Status: configuração, TLS/CA, factory de pool e scripts preparados (Bloco `bloco_11_migracao_da_infraestrutura_mysql_para_aiven`). Em 2026-07-30 o proprietário executou manualmente `npm run db:check` e confirmou conectividade real com TLS ativo (MySQL `8.4.8`, banco `finanhouse_dev`, usuário `finanhouse_dev_app`) — a pendência de validação de TLS está encerrada. **Nenhuma migration foi aplicada e nenhum seed foi executado ainda** — esse é o próximo passo pendente, sujeito a autorização e execução separadas. Nenhuma autenticação de usuário final implementada.

### Notas operacionais

- O serviço Aiven precisa estar **Powered on / Running** no painel antes de qualquer execução de `db:check`/`db:migrate`/`db:seed:dev` — caso contrário a conexão falha por indisponibilidade, não por erro de configuração.
- O Finanhouse usa a conexão MySQL tradicional via `mysql2` + Drizzle. **Não usar** as informações/porta de MySQLx (protocolo X do MySQL) — não é o que este projeto usa.
- Nunca usar `defaultdb` como banco da aplicação, nem `avnadmin` como usuário definitivo da aplicação — ambos são reservados/administrativos do provedor. O usuário de aplicação de desenvolvimento é `finanhouse_dev_app`, sobre o banco `finanhouse_dev`.
- Nunca usar `DATABASE_SSL=false` nem `rejectUnauthorized: false` — nenhuma das duas é uma configuração válida deste projeto, em nenhum ambiente.
- Se `apps/api/.env.local` for atualizado mas o processo do terminal continuar usando credenciais antigas, variáveis de ambiente já definidas naquele processo (`$env:DATABASE_USER`, `$env:DATABASE_PASSWORD`, `$env:DATABASE_NAME`, etc.) podem prevalecer sobre os valores carregados depois do arquivo local — `process.loadEnvFile` não sobrescreve uma variável já presente no ambiente do processo. Em PowerShell, limpe as variáveis persistidas antes de tentar novamente:

  ```powershell
  Remove-Item Env:DATABASE_USER -ErrorAction SilentlyContinue
  Remove-Item Env:DATABASE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:DATABASE_NAME -ErrorAction SilentlyContinue
  ```

  Depois execute novamente `npm run db:check`.
