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
- `npm run db:audit:schema -- --phase=before|after` — auditoria somente leitura do schema remoto (tabelas presentes, journal de migration, contagem de registros); usada antes/depois de aplicar uma migration. Nunca executa DDL/DML.

## Banco de dados (Aiven for MySQL)

Drizzle ORM + `mysql2` sobre Aiven for MySQL — ver `Docs/02_architecture/decisoes_tecnicas.md` (DT-07, DT-08) e `Docs/03_contracts/contrato_banco_dados.md`. Toda configuração de conexão é resolvida e validada de forma centralizada e pura por `resolveDatabaseConfig` (`src/config/database-config.ts`), reaproveitada pela aplicação, pela factory de pool (`src/db/pool.ts`) e pelos scripts acima — nenhuma validação duplicada. TLS é obrigatório e estrito (`rejectUnauthorized: true`, `minVersion: 'TLSv1.2'`, sem override de `checkServerIdentity`), com certificado CA resolvido a partir de `DATABASE_CA_PATH` **ou** `DATABASE_CA_CERT_BASE64` (nunca as duas, nunca versionado). Variáveis reais só existem em `apps/api/.env.local` (nunca versionado) — ver `.env.example` na raiz e `Docs/03_contracts/contrato_variaveis_ambiente.md`.

Status: TLS validado com conexão real em 2026-07-30 (Bloco 11). Em 2026-07-31 (Bloco 12, DT-08), com autorização explícita do proprietário, a migration inicial foi **aplicada** a `finanhouse_dev`: seis tabelas criadas (`users`, `households`, `household_members`, `categories`, `monthly_periods`, `financial_entries`), journal do Drizzle (`__drizzle_migrations`) com uma migration registrada, todas as tabelas auditadas com **zero registros** — nenhum seed executado, nenhum dado real inserido. `finanhouse_prod` continua inexistente. **Persistência real ainda não está completa**: repositórios Drizzle reais, endpoints de API e integração do frontend continuam pendentes. Nenhuma autenticação de usuário final implementada.

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
