# apps/api

API do HouseManager: Node.js + TypeScript.

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
- `npm run db:audit:category-budgets -- --phase=before|after` — auditoria somente leitura específica da migration `0002_category_budgets.sql` (Bloco 18, DT-13): diferente das anteriores, o banco já tem dados reais do bootstrap (Bloco 17), então "before" grava uma contagem de linhas das 6 tabelas estruturais em arquivo temporário e "after" confirma que essas contagens não mudaram, que `category_budgets` existe e está vazia, e que há exatamente 3 migrations registradas. Nunca executa DDL/DML.
- `npm run db:smoke:repositories` — smoke-test transacional dos repositórios Drizzle reais contra `finanhouse_dev`: cria dados sintéticos dentro de uma única transação, exercita os repositórios, e sempre executa `ROLLBACK` (nunca `COMMIT`). Exige `CONFIRM_REPOSITORY_SMOKE=true` explícito; não executado automaticamente.
- `npm run db:smoke:http` — smoke-test transacional da API HTTP contra `finanhouse_dev`: mesma transação real do smoke acima, mas exercitada via `app.inject()` (sem socket de rede) contra as rotas HTTP. Exige `CONFIRM_HTTP_SMOKE=true` explícito; não executado automaticamente.
- `npm run db:smoke:category-budgets` — smoke-test transacional específico de `category_budgets` (Bloco 18, DT-13) contra `finanhouse_dev`: diferente dos dois acima, não exige as seis tabelas estruturais vazias (o bootstrap do Bloco 17 já as populou) — só confirma que as contagens de todas as tabelas, incluindo `category_budgets`, voltam idênticas após o `ROLLBACK`. Cria um household sintético isolado, exercita o repositório real (criação, leitura, atualização "nunca upsert", rejeição de household divergente) e as rotas HTTP de budgets via `app.inject()`. Exige `CONFIRM_CATEGORY_BUDGETS_SMOKE=true` explícito; não executado automaticamente.
- `npm run db:configure:initial-passwords` — configuração PERMANENTE das senhas iniciais dos dois usuários já existentes (Bloco 19, DT-14): localiza os usuários pelos e-mails já configurados localmente (`FINANHOUSE_BOOTSTRAP_OWNER_EMAIL`/`_PARTNER_EMAIL`), grava só o hash Argon2id (`FINANHOUSE_INITIAL_PASSWORD_OWNER`/`_PARTNER`, mínimo 8 caracteres) — nunca cria usuário, nunca imprime e-mail/senha/hash. Sobrescrever uma senha já configurada exige `CONFIRM_PASSWORD_OVERWRITE=true` além de `CONFIRM_INITIAL_PASSWORDS=true` — autorizações estritamente separadas. Não executado automaticamente.
- `npm run db:audit:auth-sessions -- --phase=before|after` — auditoria somente leitura específica da migration `0003_auth_sessions.sql` (Bloco 19, DT-14): mesmo padrão de `db-audit-category-budgets.ts` (banco não-vazio pós-bootstrap) — confirma que as sete tabelas estruturais preservam suas contagens, que `auth_sessions` passa a existir vazia, e que nenhum usuário ganhou senha só pela migration. Nunca executa DDL/DML.

## API HTTP (Bloco 16, DT-11; limites por categoria no Bloco 18, DT-13; autenticação real no Bloco 19, DT-14)

Fastify 5.11.0 sobre os repositórios Drizzle reais (`src/http/`) — contrato completo em `Docs/03_contracts/contrato_api_http.md` e `Docs/03_contracts/contrato_autenticacao.md`. Desde o Bloco 18, inclui `.../periods/:referenceMonth/budgets` (GET/PUT/DELETE) para limites mensais por categoria. Desde o Bloco 19, toda rota financeira exige sessão real (`.../auth/login`, `.../auth/session`, `.../auth/logout`) — migration `0003_auth_sessions.sql` aplicada a `finanhouse_dev` e senhas iniciais dos dois usuários existentes configuradas (ver seção "Banco de dados" abaixo). Pontos de segurança obrigatórios:

- **Sessão real desde o Bloco 19** — hash Argon2id (`@node-rs/argon2`), token opaco de 256 bits, cookie `HttpOnly`/`SameSite=Lax`/`Secure` (fora de development); mesmo assim, `createHttpApp` continua recusando `runtimeMode: 'production'` (bind/CORS/HTTPS ainda não estão prontos para exposição pública).
- **Bind estritamente local** — `http/server.ts` sempre escuta em `127.0.0.1`, nunca `0.0.0.0`, nunca configurável via variável de ambiente.
- **CORS restrito** — apenas `http://127.0.0.1:5173`/`http://localhost:5173`; nunca wildcard (`*`), mesmo com `Access-Control-Allow-Credentials: true` (necessário para o cookie de sessão).
- **Validação estrita de corpo** — `ajv.customOptions.removeAdditional: false` (o padrão do Fastify removeria campos desconhecidos silenciosamente em vez de rejeitá-los — corrigido explicitamente).
- **Dinheiro** sempre como string decimal (nunca `number` JSON); **coluna auxiliar** `responsible_member_household_id` (DT-09) nunca aparece em nenhum DTO de resposta.

## Banco de dados (Aiven for MySQL)

Drizzle ORM + `mysql2` sobre Aiven for MySQL — ver `Docs/02_architecture/decisoes_tecnicas.md` (DT-07, DT-08, DT-09, DT-10, DT-11) e `Docs/03_contracts/contrato_banco_dados.md`. Toda configuração de conexão é resolvida e validada de forma centralizada e pura por `resolveDatabaseConfig` (`src/config/database-config.ts`), reaproveitada pela aplicação, pela factory de pool (`src/db/pool.ts`) e pelos scripts acima — nenhuma validação duplicada. TLS é obrigatório e estrito (`rejectUnauthorized: true`, `minVersion: 'TLSv1.2'`, sem override de `checkServerIdentity`), com certificado CA resolvido a partir de `DATABASE_CA_PATH` **ou** `DATABASE_CA_CERT_BASE64` (nunca as duas, nunca versionado). Variáveis reais só existem em `apps/api/.env.local` (nunca versionado) — ver `.env.example` na raiz e `Docs/03_contracts/contrato_variaveis_ambiente.md`. Os scripts de banco (`db-check.ts`, `db-migrate.ts`, `db-seed-dev.ts`, `db-audit-*.ts`, `db-smoke-repositories.ts`, `db-smoke-http.ts`, `db-bootstrap-household.ts`) sempre estabelecem a conexão dentro do `try`, nunca antes — uma falha de conexão é sempre sanitizada via `categorizeConnectionError` (`src/db/sanitize-error.ts`), nunca propagada como exceção bruta (que poderia expor o host real no terminal).

Status: TLS validado com conexão real em 2026-07-30 (Bloco 11). Em 2026-07-31 (Bloco 12, DT-08), com autorização explícita do proprietário, a migration inicial foi **aplicada** a `finanhouse_dev`: seis tabelas criadas (`users`, `households`, `household_members`, `categories`, `monthly_periods`, `financial_entries`). Ainda em 2026-07-31 (Bloco 13, DT-09), uma migration incremental corrigiu a integridade referencial do membro responsável (`financial_entries.responsible_member_id`): coluna auxiliar `responsible_member_household_id`, FK composta com `ON DELETE RESTRICT` + `CHECK` de consistência. Journal do Drizzle (`__drizzle_migrations`) com **duas** migrations registradas; todas as tabelas auditadas com **zero registros** — nenhum seed executado, nenhum dado real inserido. Ainda em 2026-07-31 (Bloco 14, DT-10), os repositórios Drizzle reais (`src/infrastructure/repositories/drizzle/`) foram implementados para as portas já existentes (`FinancialEntryRepository`, `MonthlyPeriodRepository`, `CategoryRepository`, `HouseholdMemberRepository`) e validados por smoke-test transacional (`db:smoke:repositories`) com rollback intencional e zero dado residual. Em 2026-08-01 (Bloco 16, DT-11), a **API HTTP financeira v1** (`src/http/`) foi implementada sobre esses repositórios e validada por smoke-test transacional (`db:smoke:http`) com rollback intencional e zero dado residual. Em 2026-08-01 (Bloco 17, DT-12), o **frontend foi integrado diretamente à API real** — nenhum fallback demonstrativo em runtime. Com autorização explícita do proprietário (`CONFIRM_HOUSEHOLD_BOOTSTRAP=true`), o script de bootstrap estrutural permanente (`db:bootstrap:household`) criou o household/usuário proprietário/parceiro/membros/sete categorias iniciais em `finanhouse_dev`. `finanhouse_prod` continua inexistente. Em 2026-08-04 (Bloco 18, DT-13), com autorização explícita do proprietário, a migration `0002_category_budgets.sql` (tabela `category_budgets`) foi **aplicada** a `finanhouse_dev` — journal do Drizzle com **três** migrations registradas, sétima tabela criada com zero registros, contagens das seis tabelas anteriores preservadas (auditoria `db-audit-category-budgets.ts`), validada por smoke-test transacional (`db:smoke:category-budgets`) com rollback intencional e zero dado residual. Em 2026-08-06 (Bloco 19, DT-14/DT-15), com duas autorizações explícitas e separadas do proprietário, a migration `0003_auth_sessions.sql` (`users.password_hash`/`password_configured_at` + tabela `auth_sessions`) foi **aplicada** a `finanhouse_dev` — journal do Drizzle com **quatro** migrations registradas, oitava tabela criada com zero registros, contagens das sete tabelas anteriores preservadas — e as senhas iniciais dos dois usuários existentes foram configuradas via `db-configure-initial-passwords.ts`, validado por smoke-test transacional (`db:smoke:auth-sessions`, cobrindo duas sessões simultâneas do mesmo usuário e logout seletivo) com rollback intencional e zero dado residual. Durante a validação funcional manual, dois bugs reais foram encontrados e corrigidos no mesmo dia: o cookie de sessão não era reenviado quando frontend e API estavam em origens diferentes (corrigido com proxy same-origin do Vite) e a geração do `id` de `auth_sessions` tinha uma condição de corrida real sob login concorrente (corrigido delegando o `id` ao `AUTO_INCREMENT` nativo do MySQL — ver DT-15).

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
