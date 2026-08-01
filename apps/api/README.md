# apps/api

API do Finanhouse: Node.js + TypeScript.

## Executar localmente

```bash
npm install   # na raiz do monorepo
npm run dev --workspace=api
```

Servidor sobe em `http://127.0.0.1:3000` (porta configurável via `PORT`; host **não** é configurável — sempre `127.0.0.1`, nunca `0.0.0.0`, ver seção "API HTTP" abaixo).

## Endpoints

Contrato completo em `Docs/03_contracts/contrato_api_http.md`. Resumo:

- `GET /health` → `{ "status": "ok", "service": "finanhouse-api" }` (não consulta o banco)
- `GET /ready` → `{ "data": { "ready": boolean, "checks": {...} } }` (config/pool/conexão/TLS)
- `GET|POST|PUT /api/v1/households/:householdId/{categories,members,periods,entries}` e ações de transição (`.../periods/:referenceMonth/{start-review,reopen-from-review,close,reopen}`, `.../entries/:entryId/{mark-pending,realize,cancel,revert-realization,correct-to-planned,reopen}`) — ver o contrato para o detalhamento de cada rota.

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
- `npm run db:audit:responsible-member -- --phase=before|after` — auditoria somente leitura específica da integridade do membro responsável (coluna auxiliar, FK composta, `DELETE_RULE`, `CHECK`); usada antes/depois de aplicar a migration `0001`. Nunca executa DDL/DML.
- `npm run db:smoke:repositories` — smoke-test transacional dos repositórios Drizzle reais contra `finanhouse_dev`: cria dados sintéticos dentro de uma única transação, exercita os repositórios, e sempre executa `ROLLBACK` (nunca `COMMIT`). Exige `CONFIRM_REPOSITORY_SMOKE=true` explícito; não executado automaticamente.
- `npm run db:smoke:http` — smoke-test transacional da API HTTP contra `finanhouse_dev`: mesma transação real do smoke acima, mas exercitada via `app.inject()` (sem socket de rede) contra as rotas HTTP. Exige `CONFIRM_HTTP_SMOKE=true` explícito; não executado automaticamente.

## API HTTP (Bloco 16, DT-11)

Fastify 5.11.0 sobre os repositórios Drizzle reais (`src/http/`) — contrato completo em `Docs/03_contracts/contrato_api_http.md`. Pontos de segurança obrigatórios:

- **Sem autenticação real** — `createHttpApp` recusa `runtimeMode: 'production'` explicitamente; a API não deve ser apresentada como pronta para exposição pública em nenhum ambiente até que a autenticação exista.
- **Bind estritamente local** — `http/server.ts` sempre escuta em `127.0.0.1`, nunca `0.0.0.0`, nunca configurável via variável de ambiente.
- **CORS restrito** — apenas `http://127.0.0.1:5173`/`http://localhost:5173` (o frontend demonstrativo); nunca wildcard (`*`).
- **Validação estrita de corpo** — `ajv.customOptions.removeAdditional: false` (o padrão do Fastify removeria campos desconhecidos silenciosamente em vez de rejeitá-los — corrigido explicitamente).
- **Dinheiro** sempre como string decimal (nunca `number` JSON); **coluna auxiliar** `responsible_member_household_id` (DT-09) nunca aparece em nenhum DTO de resposta.

## Banco de dados (Aiven for MySQL)

Drizzle ORM + `mysql2` sobre Aiven for MySQL — ver `Docs/02_architecture/decisoes_tecnicas.md` (DT-07, DT-08, DT-09, DT-10, DT-11) e `Docs/03_contracts/contrato_banco_dados.md`. Toda configuração de conexão é resolvida e validada de forma centralizada e pura por `resolveDatabaseConfig` (`src/config/database-config.ts`), reaproveitada pela aplicação, pela factory de pool (`src/db/pool.ts`) e pelos scripts acima — nenhuma validação duplicada. TLS é obrigatório e estrito (`rejectUnauthorized: true`, `minVersion: 'TLSv1.2'`, sem override de `checkServerIdentity`), com certificado CA resolvido a partir de `DATABASE_CA_PATH` **ou** `DATABASE_CA_CERT_BASE64` (nunca as duas, nunca versionado). Variáveis reais só existem em `apps/api/.env.local` (nunca versionado) — ver `.env.example` na raiz e `Docs/03_contracts/contrato_variaveis_ambiente.md`. Os scripts de banco (`db-check.ts`, `db-migrate.ts`, `db-seed-dev.ts`, `db-audit-*.ts`, `db-smoke-repositories.ts`, `db-smoke-http.ts`) sempre estabelecem a conexão dentro do `try`, nunca antes — uma falha de conexão é sempre sanitizada via `categorizeConnectionError` (`src/db/sanitize-error.ts`), nunca propagada como exceção bruta (que poderia expor o host real no terminal).

Status: TLS validado com conexão real em 2026-07-30 (Bloco 11). Em 2026-07-31 (Bloco 12, DT-08), com autorização explícita do proprietário, a migration inicial foi **aplicada** a `finanhouse_dev`: seis tabelas criadas (`users`, `households`, `household_members`, `categories`, `monthly_periods`, `financial_entries`). Ainda em 2026-07-31 (Bloco 13, DT-09), uma migration incremental corrigiu a integridade referencial do membro responsável (`financial_entries.responsible_member_id`): coluna auxiliar `responsible_member_household_id`, FK composta com `ON DELETE RESTRICT` + `CHECK` de consistência. Journal do Drizzle (`__drizzle_migrations`) com **duas** migrations registradas; todas as tabelas auditadas com **zero registros** — nenhum seed executado, nenhum dado real inserido. Ainda em 2026-07-31 (Bloco 14, DT-10), os repositórios Drizzle reais (`src/infrastructure/repositories/drizzle/`) foram implementados para as portas já existentes (`FinancialEntryRepository`, `MonthlyPeriodRepository`, `CategoryRepository`, `HouseholdMemberRepository`) e validados por smoke-test transacional (`db:smoke:repositories`) com rollback intencional e zero dado residual. Ainda em 2026-07-31 (Bloco 16, DT-11), a **API HTTP financeira v1** (`src/http/`) foi implementada sobre esses repositórios e validada por smoke-test transacional (`db:smoke:http`) com rollback intencional e zero dado residual. `finanhouse_prod` continua inexistente. **Persistência real ainda não está completa**: integração do frontend com a API e autenticação real continuam pendentes. Nenhuma autenticação de usuário final implementada.

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
