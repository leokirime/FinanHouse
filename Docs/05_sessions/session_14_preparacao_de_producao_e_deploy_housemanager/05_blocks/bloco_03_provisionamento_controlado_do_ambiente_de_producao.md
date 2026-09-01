# Bloco 03 — Provisionamento controlado do ambiente de produção

> Sessão: 14 (preparacao_de_producao_e_deploy_housemanager) · Projeto: HouseManager-Rename · Atualizado em: 2026-08-29

## 1. Objetivo

Provisionar o ambiente de produção real (Aiven, Render, Vercel) em fases controladas e reversíveis, sem aplicar migrations nem fazer deploy, começando exclusivamente pelo banco de dados (FASE A — Aiven).

## 2. Contexto

Bloco 01 (arquitetura HTTP) e Bloco 02 (infraestrutura documentada para Render/Vercel/Aiven, correção do `loadLocalEnv` e `.node-version`) já classificaram a API como `RENDER_READY_FOR_CONFIGURATION`, `AIVEN_READY_FOR_PRODUCTION_DATABASE` e `VERCEL_READY_FOR_CONFIGURATION`. O usuário decidiu deliberadamente não provisionar Aiven + Render + Vercel de uma vez: primeiro confirmar/criar `finanhouse_prod`, depois configurar o Render, só depois aplicar migrations e conectar o Vercel. Este bloco documenta essa sequência faseada; esta rodada cobre apenas a FASE A.

## 3. Problema que Este Bloco Resolve

A API está pronta para produção em código, mas não existe ainda um banco de dados de produção real (`finanhouse_prod`) no serviço Aiven existente, nem confirmação de que a credencial atual tem permissão para criá-lo — sem isso, nenhuma fase seguinte (Render, migrations, Vercel) pode avançar com segurança.

## 4. Escopo

- FASE A (esta rodada): confirmar, de forma segura e não invasiva, se a credencial Aiven atual tem privilégio `CREATE DATABASE`; confirmar se `finanhouse_prod` já existe; se não existir e a permissão for confirmada, criar exclusivamente `finanhouse_prod` (vazio, sem migrations); reconfirmar que `finanhouse_dev` permanece intacto; reconfirmar que `DATABASE_ENV=production` aceita `finanhouse_prod` e continua rejeitando `finanhouse_dev`; documentar status de backup/retenção/migrations sem executar nada real.
- FASE B (rodada futura, fora desta): configuração real do Render Web Service.
- FASE C (rodada futura, fora desta): aplicação de migrations, obtenção da URL real do Render, conexão do Vercel, deploy real.

## 5. Fora de Escopo

- Render: criação de Web Service, conexão GitHub↔Render, configuração de variáveis de ambiente reais — tratado em uma rodada futura deste mesmo bloco (FASE B).
- Vercel: criação de projeto, conexão GitHub↔Vercel, `vercel.json` com URL real — tratado em rodada futura (FASE C).
- ~~Aplicação de migrations em `finanhouse_prod` — originalmente previsto para FASE C~~. **Atualização (FASE B):** o usuário autorizou explicitamente antecipar a aplicação das migrations para esta rodada, por não depender do Render estar no ar (apenas de conectividade com o Aiven, já validada na FASE A). Ver seção 19.
- Bootstrap de household/senhas reais em produção — continua fora de escopo, tratado em FASE C (depende de confirmação manual de backup no painel Aiven).
- Qualquer alteração em `finanhouse_dev` (leitura de metadados apenas, nunca escrita).
- Feedback final do Bloco 03 (`08_feedbacks/`) — reservado para depois de FASE B e FASE C também estarem concluídas.

## 6. Arquivos e Pastas Envolvidos

- Nenhum arquivo de código-fonte foi criado ou alterado nesta rodada (FASE A é puramente operacional sobre a infraestrutura Aiven).
- Scripts diagnósticos temporários (`apps/api/src/__aiven_*.mts`) foram criados, executados e removidos integralmente antes do fim da rodada — nunca versionados.
- Este documento (`05_blocks/bloco_03_...md`) e o prompt correspondente (`06_prompts/prompt_bloco_03_...md`), atualizados com a evidência da FASE A.

## 7. Dependências

- Bloco 01 e Bloco 02 da Sessão 14 (já integrados a `main`).
- Serviço Aiven MySQL já existente (reaproveitado — nenhum serviço novo foi criado).
- Arquivo `apps/api/.env.local` acessível localmente (única fonte de credenciais reais disponível nesta máquina, localizado em `C:\Users\leoki\FinanHouse\apps\api\.env.local` — nunca copiado, alterado ou impresso).

## 8. Plano de Implementação

1. Checkpoint de git (`origin/main`), criação de worktree isolado a partir de `origin/main`, preservação do scaffold do Bloco 03 com verificação de hash.
2. Localizar a única fonte local de credenciais Aiven acessível (`.env.local` do diretório de trabalho original) — nenhuma outra cópia existe nos worktrees isolados, por serem arquivos `git worktree add` novos (`.env.local` é ignorado pelo Git).
3. `npm ci` na raiz do worktree isolado (dependências nunca são copiadas automaticamente por `git worktree add`).
4. Inspeção somente-leitura via script temporário reaproveitando `resolveDatabaseConfig`/`createDatabasePool` reais do próprio projeto: `SHOW DATABASES` (existência de `finanhouse_prod`/`finanhouse_dev`) e `SHOW GRANTS FOR CURRENT_USER()` (privilégio `CREATE`) — nunca uma tentativa cega de `CREATE DATABASE`.
5. Como o privilégio `CREATE ON *.*` foi confirmado com segurança e `finanhouse_prod` não existia, execução de `CREATE DATABASE finanhouse_prod` com o mesmo charset/collation de `finanhouse_dev` (`utf8mb4`/`utf8mb4_0900_ai_ci`), seguida de verificação de que o banco está vazio (0 tabelas).
6. Verificação end-to-end de que `DATABASE_ENV=production` + `DATABASE_NAME=finanhouse_prod` é aceito por `resolveDatabaseConfig` e conecta via TLS (`verify_identity`), e que `DATABASE_ENV=production` + `DATABASE_NAME=finanhouse_dev` continua sendo rejeitado.
7. Verificação somente-leitura de que `finanhouse_dev` permanece com sua contagem de tabelas original (10) — nenhuma alteração.
8. Remoção de todos os scripts diagnósticos temporários antes de qualquer outra ação.
9. Execução da suíte completa de validação local.
10. Atualização deste documento com a evidência da FASE A — sem versionar nada.

## 9. Critérios de Aceite

- [x] Privilégio `CREATE DATABASE` confirmado de forma somente-leitura (`SHOW GRANTS`), nunca por tentativa cega.
- [x] `finanhouse_prod` criado (não existia antes) — exclusivamente esse nome, nenhum outro.
- [x] `finanhouse_prod` confirmado vazio (0 tabelas) após criação.
- [x] `finanhouse_dev` confirmado intacto (10 tabelas, inalterado) antes e depois da operação.
- [x] `DATABASE_ENV=production` aceita `finanhouse_prod` e continua rejeitando `finanhouse_dev` — guarda de `database-config.ts` não foi alterada nem enfraquecida.
- [x] Nenhuma migration aplicada em `finanhouse_prod`.
- [x] Nenhuma credencial, senha, host completo, string de conexão ou certificado CA impresso em qualquer momento (terminal, documentação, relatório).
- [x] `apps/api/.env.local` não foi alterado — continua apontando para `finanhouse_dev`.
- [x] Nenhum código-fonte do projeto foi criado/alterado/commitado nesta rodada.
- [x] Nenhuma ação real em Render ou Vercel.
- [x] Nenhum `git add`/`commit`/`push`/`merge` executado nesta rodada.

## 10. Validações Obrigatórias

- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test` (API 704, Web 467, Domain 214 — total 1385, idêntico à baseline do Bloco 02; nenhum teste novo, pois nenhum código foi alterado)
- [x] `npx drizzle-kit check` (em `apps/api`)
- [x] `npx ddae-engine validate`
- [x] `npx ddae-engine audit`

## 11. Segurança

Credenciais Aiven nunca impressas, versionadas ou documentadas em texto claro — apenas nomes de variáveis e resultados booleanos derivados (`existe`/`não existe`, `tem privilégio`/`não tem`). Verificação de privilégio feita por inspeção somente-leitura (`SHOW GRANTS FOR CURRENT_USER()`), nunca por tentativa cega de `CREATE DATABASE`, conforme instrução explícita do usuário. `apps/api/.env.local` lido apenas em memória, via `process.loadEnvFile` em processo efêmero, nunca copiado para o worktree nem alterado. TLS `verify_identity` confirmado ativo na conexão real usada para criar e verificar `finanhouse_prod` — nenhum modo de SSL mais fraco foi usado.

## 12. Performance

Não aplicável — nenhuma alteração de código ou de carga em produção nesta rodada.

## 13. Design System / UX

Não aplicável — nenhuma alteração de frontend nesta rodada.

## 14. Riscos

- Risco de criar um banco com nome incorreto — mitigado por checagem exata de string (`finanhouse_prod`) antes de qualquer `CREATE DATABASE`.
- Risco de alterar `finanhouse_dev` acidentalmente — mitigado por usar apenas comandos somente-leitura (`SHOW DATABASES`, `SHOW GRANTS`, `information_schema`) contra esse banco.
- Risco de expor credenciais em log/terminal — mitigado por nunca imprimir variáveis sensíveis nos scripts diagnósticos, apenas booleanos/nomes derivados.
- Backup/retenção de `finanhouse_prod` não está documentado localmente — não bloqueia a criação de um banco vazio, mas bloqueia qualquer bootstrap de dados reais até confirmação manual no painel Aiven.

## 15. Pendências Esperadas

- **P3** — Confirmar manualmente no painel Aiven a política de backup/retenção/restore para `finanhouse_prod` antes de qualquer bootstrap de dados reais. Registrado como `BACKUP_MANUAL_CONFIRMATION_REQUIRED`.
- **P3** — FASE B (Render) e FASE C (migrations reais + Vercel + deploy) permanecem pendentes como rodadas futuras deste mesmo bloco.
- _Nenhuma outra pendência P1/P2 identificada nesta rodada._

## 16. Feedback Obrigatório

Feedback **não** gerado nesta rodada, por decisão explícita do usuário: o Bloco 03 como um todo cobre também FASE B (Render) e FASE C (migrations reais + Vercel), ainda pendentes. O feedback será gerado apenas quando todas as fases estiverem concluídas.

## 17. Commit Semântico Sugerido

Não aplicável nesta rodada — nenhum arquivo de código foi criado/alterado, e o usuário determinou explicitamente que nenhum `git add`/`commit`/`push`/`merge` deveria ser executado nesta rodada (revisão humana da FASE A antes de avançar para Render).

## 18. Executado — Evidência (FASE A — Aiven)

**Status da FASE A: AIVEN PHASE COMPLETE.**

Origem local das credenciais: única cópia de `.env.local` acessível localmente estava em `C:\Users\leoki\FinanHouse\apps\api\.env.local` (os worktrees isolados criados via `git worktree add` nunca recebem esse arquivo automaticamente, por ser ignorado pelo Git). Lido apenas em memória por processo efêmero (`process.loadEnvFile`), nunca copiado, alterado ou impresso.

Verificação de privilégio (somente-leitura, via `SHOW GRANTS FOR CURRENT_USER()`, antes de qualquer tentativa de escrita): privilégio `CREATE` confirmado em escopo `*.*`. Nenhuma tentativa cega de `CREATE DATABASE` foi feita antes dessa confirmação.

Estado antes da operação: `finanhouse_prod` não existia; `finanhouse_dev` existia com 10 tabelas.

Operação executada: `CREATE DATABASE \`finanhouse_prod\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci` (mesmo charset/collation de `finanhouse_dev`, confirmado por `information_schema.SCHEMATA` antes da criação).

Estado após a operação: `finanhouse_prod` existe, 0 tabelas (vazio, nenhuma migration aplicada). `finanhouse_dev` reconfirmado com 10 tabelas (inalterado).

Verificação end-to-end via `resolveDatabaseConfig`/`createDatabasePool` reais (sem nenhuma alteração de código, apenas variáveis de ambiente sobrepostas em memória por um script diagnóstico temporário):
- `DATABASE_ENV=production` + `DATABASE_NAME=finanhouse_dev` → rejeitado por `DatabaseConfigError` (guarda de `database-config.ts` intacta).
- `DATABASE_ENV=production` + `DATABASE_NAME=finanhouse_prod` → aceito, conexão TLS `verify_identity` bem-sucedida (`SELECT 1` OK), `SHOW TABLES` retornou vazio.

Todos os scripts diagnósticos temporários (`apps/api/src/__aiven_inspect.mts`, `__aiven_create_prod.mts`, `__aiven_verify_prod.mts`, `__aiven_dev_check.mts`) foram removidos do worktree antes do fim da rodada — `git status` confirmou nenhum resquício.

Suíte de validação local: build, `verify:runtime`, lint, typecheck, `typecheck:api-scripts`, testes (API 704 / Web 467 / Domain 214 — total 1385, idêntico à baseline do Bloco 02, sem regressão nem redução), `drizzle-kit check` ("Everything's fine"), `ddae-engine validate` (OK, 0 erros), `ddae-engine audit` (OK, 0 P1/P2, `session_14` com "3 bloco(s), 1 sem feedback" — exatamente o esperado).

**Classificações finais desta rodada:**
- `AIVEN_PROD_DATABASE_CREATED` (banco não existia; criado nesta rodada, exclusivamente `finanhouse_prod`).
- `BACKUP_MANUAL_CONFIRMATION_REQUIRED` (política de backup/retenção/restore não documentada localmente — não bloqueia banco vazio, bloqueia bootstrap de dados reais).
- `MIGRATIONS_READY_FOR_PRODUCTION` (sequência de 5 migrations reconfirmada coerente via `drizzle-kit check`; nenhuma aplicada nesta rodada, por decisão explícita).

**Próximo passo explícito: FASE B — Render Free Web Service** (criação real do serviço, conexão GitHub↔Render, configuração de variáveis de ambiente reais incluindo `DATABASE_ENV=production`/`DATABASE_NAME=finanhouse_prod`/CA em base64) — não iniciado nesta rodada, aguardando aprovação do usuário para prosseguir.

## 19. Executado — Evidência (FASE B — Render)

**Status da FASE B: `RENDER_MANUAL_ACTION_REQUIRED`.**

**Motivo estrutural:** o ambiente de execução deste agente não tem CLI do Render instalado, nenhuma `RENDER_API_KEY`/token configurado e nenhum acesso de navegador autenticado — confirmado por inspeção (`render` não encontrado no PATH, nenhuma variável `*RENDER*` no ambiente ou em `.env.local`). Criar um Web Service, conectar o GitHub via OAuth e preencher variáveis de ambiente no painel do Render são ações que só podem ser feitas pelo usuário, autenticado, na interface web do Render. Nenhuma tentativa de simular ou fingir essa criação foi feita.

### O que FOI possível fazer nesta rodada sem depender do painel do Render

A aplicação de migrations **não depende do Render estar no ar** — depende apenas de conectividade com o Aiven, já validada na FASE A. Por isso, com autorização explícita do usuário para esta rodada, as migrations foram aplicadas diretamente:

- **PRE-MIGRATION CHECK:** `finanhouse_prod` confirmado como alvo (não `finanhouse_dev`); banco vazio (0 tabelas, confirmado na FASE A); journal com exatamente 5 entradas, idêntico aos 5 arquivos `.sql` versionados em `database/migrations/`; `drizzle-kit check` → "Everything's fine"; nenhuma migration nova encontrada.
- **MIGRATION GATE (log, sem segredos):**
  ```
  TARGET_DATABASE=finanhouse_prod
  DATABASE_ENV=production
  MIGRATION_COUNT=5
  ```
- **Mecanismo usado:** exclusivamente o script oficial já existente `apps/api/scripts/db-migrate.ts` (via `npm run db:migrate`, com `CONFIRM_DATABASE_MIGRATION=true`) — nunca `drizzle-kit push`, nenhuma migration editada ou criada. O script exige `apps/api/.env.local` (por design, é uma ferramenta manual de operador, não o runtime da API) — executado a partir do diretório de trabalho original (`C:\Users\leoki\FinanHouse\apps\api`), o único local com esse arquivo presente. Antes de executar, foi confirmado por `diff` que `db-migrate.ts`, `database-config.ts` e os 5 arquivos de migration são **byte-idênticos** entre esse diretório e o worktree do Bloco 03 — ou seja, o mesmo código versionado em `main`, não uma versão desatualizada.
  - Redirecionamento seguro do alvo: `DATABASE_ENV=production DATABASE_NAME=finanhouse_prod` foram definidos como variáveis de ambiente do processo **antes** da invocação — confirmado experimentalmente que `process.loadEnvFile()` nunca sobrescreve uma variável já definida em `process.env`, portanto essas duas variáveis prevaleceram sobre o conteúdo de `.env.local` (que aponta para `finanhouse_dev`/development), enquanto host/usuário/senha/CA continuaram vindo exclusivamente do arquivo — nunca alterado em disco.
  - Saída real do comando: `Aplicando migrations versionadas em: aiven/production/finanhouse_prod` → `Migrations aplicadas com sucesso.`
- **POST-MIGRATION (somente-leitura, sem dados pessoais/financeiros):** `finanhouse_prod` agora tem 10 tabelas (`__drizzle_migrations`, `auth_sessions`, `categories`, `category_budgets`, `financial_entries`, `household_members`, `households`, `installment_plans`, `monthly_periods`, `users`) — exatamente o mesmo conjunto e a mesma contagem de `finanhouse_dev`. Tabela de controle `__drizzle_migrations` confirma exatamente 5 entradas aplicadas (nenhuma pendente). `finanhouse_dev` reconfirmado com as mesmas 10 tabelas e 5 entradas de migration de antes — inalterado.

### O que NÃO foi possível fazer nesta rodada (ação manual necessária)

Criação do Web Service, conexão GitHub↔Render e definição das variáveis de ambiente reais só podem ser feitas pelo usuário no painel do Render. Instruções exatas (campo → valor/conceito, nenhum segredo):

| Campo (painel Render) | Valor/conceito exato |
|---|---|
| Tipo de serviço | Web Service |
| Plano | **Free** (não aceitar upgrade/plano pago/cartão obrigatório — se o Render exigir isso nas condições atuais, parar e reportar `RENDER_FREE_UNAVAILABLE`) |
| Runtime | Node |
| Repositório GitHub | o repositório técnico `FinanHouse` (nome não deve ser alterado) |
| Branch | `main` |
| Root Directory | `.` (raiz do monorepo — nunca `apps/api`, pois `npm ci` na raiz é o que cria o symlink de workspace para `@finanhouse/domain`) |
| Build Command | `npm ci && npm run build:domain && npm run build --workspace=api` |
| Start Command | `node apps/api/dist/index.js` |
| Health Check Path | `/health` |
| Node version | já declarada em `.node-version` (raiz do repo) na `main` — o Render deve detectá-la automaticamente; não sobrescrever manualmente sem um bloqueador comprovado |

Variáveis de ambiente a configurar no Render (nomes reais usados pelo backend — nenhum valor deve ser compartilhado comigo em texto):

| Variável | O que colocar |
|---|---|
| `NODE_ENV` | `production` |
| `HTTP_HOST` | `0.0.0.0` |
| `PORT` | **não definir manualmente** — o Render injeta a própria porta automaticamente e o código já lê `process.env.PORT` |
| `DATABASE_PROVIDER` | `aiven` |
| `DATABASE_ENV` | `production` |
| `DATABASE_NAME` | `finanhouse_prod` |
| `DATABASE_SSL_MODE` | `verify_identity` |
| `DATABASE_HOST` | copiar do seu `apps/api/.env.local` local (nunca compartilhar comigo) |
| `DATABASE_PORT` | idem |
| `DATABASE_USER` | idem |
| `DATABASE_PASSWORD` | idem |
| `DATABASE_CA_CERT_BASE64` | **não reutilizar `DATABASE_CA_PATH`** (aponta para um arquivo local que não existe no Render). Gerar o base64 do certificado localmente e colar apenas no painel do Render — nunca me envie o resultado. No PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("<caminho do seu DATABASE_CA_PATH local>"))`. No Git Bash: `base64 -w0 "<caminho>"`. |
| `CORS_ALLOWED_ORIGINS` | ver estratégia abaixo — **não preencher com `*`, localhost ou um domínio inventado** |

**Estratégia para `CORS_ALLOWED_ORIGINS` (ponto de atenção levantado pelo usuário):** o código de produção (`resolveCorsAllowedOrigins`, Bloco 01) é fail-closed — a API recusa iniciar em produção sem essa variável, e rejeita explicitamente qualquer origem `localhost`/`127.0.0.1`. Como a URL da Vercel ainda não existe, a origem real e controlada disponível no momento da criação do serviço é a própria URL pública que o Render atribui ao serviço (formato `https://<nome-do-serviço>.onrender.com`) — o Render mostra essa URL durante a própria criação do serviço, antes de qualquer deploy ser concluído. Ela é uma origem HTTPS real, não localhost, não curinga — satisfaz o gate sem enfraquecê-lo. Ela não é o valor definitivo (o navegador real sempre chamará a API através do domínio da Vercel via proxy same-origin, não diretamente pelo Render), mas permite que o serviço suba e `/health`/`/ready` sejam testados nesta fase. Quando a URL real da Vercel existir (FASE C), `CORS_ALLOWED_ORIGINS` deve ser **atualizada para incluir** a origem da Vercel (lista separada por vírgula, nunca substituindo por um domínio inventado antes de existir).

Se, ao configurar isso no painel, qualquer valor divergir do documentado aqui (ex.: Render exigir uma variável adicional não prevista, ou não aceitar o plano Free nas condições atuais), a orientação é parar antes de improvisar e reportar o que foi encontrado.

### Itens que dependem do usuário concluir a ação manual acima

Depois de criar o serviço e configurar as variáveis, seria necessário (rodada futura, não realizado agora): confirmar o SHA publicado, testar `GET /health` e `GET /ready` na URL pública real do Render, observar/registrar cold start do plano gratuito (aceito pelo usuário, sem cron/keep-alive artificial), revisar logs de inicialização de forma sanitizada, e só então reportar a URL real (`RENDER_API_URL`) para uso na FASE C (Vercel).

**Classificações no momento em que esta seção foi originalmente escrita:**
- `RENDER_MANUAL_ACTION_REQUIRED` (criação do serviço/variáveis exigia o painel do Render, sem CLI/API/token disponível neste ambiente).
- `MIGRATIONS_APPLIED_TO_PROD` (as 5 migrations foram aplicadas com sucesso a `finanhouse_prod` nesta rodada, de forma independente do Render).
- `HEALTH_FAILED/NOT_TESTED` e `READY_FAILED/NOT_TESTED` (serviço ainda não existia).
- `BACKUP_MANUAL_CONFIRMATION_REQUIRED` (mantido — não bloqueou a criação do banco nem as migrations estruturais, mas continua bloqueando qualquer bootstrap de dados reais).

### Atualização — FASE B concluída pelo usuário

O usuário criou o Web Service manualmente no painel do Render (repositório `FinanHouse`, branch `main`, plano Free) seguindo a tabela acima, configurou as variáveis de ambiente reais (nomes já documentados nesta seção) e reportou a URL pública real: `RENDER_API_URL=https://finanhouse.onrender.com`.

Verificação independente feita por este agente diretamente contra a URL pública (chamada HTTP simples, sem credenciais):

```
GET https://finanhouse.onrender.com/health → HTTP 200
{"status":"ok","service":"finanhouse-api"}

GET https://finanhouse.onrender.com/ready → HTTP 200
{"data":{"ready":true,"checks":{"configResolved":true,"poolAvailable":true,"connectionOk":true,"tlsActive":true}}}
```

`/ready` confirma, através do próprio código de produção (`createReadinessCheck` em `server.ts`), que a API no Render está de fato conectada ao Aiven `finanhouse_prod` com TLS ativo (`tlsActive: true`) — não apenas que o processo HTTP está de pé.

**Status final da FASE B: CONCLUÍDA.**

**Classificações finais da FASE B:**
- `RENDER_PHASE_COMPLETE`
- `MIGRATIONS_APPLIED_TO_PROD`
- `HEALTH_OK`
- `READY_OK`
- `BACKUP_MANUAL_CONFIRMATION_REQUIRED` (mantido — continua bloqueando qualquer bootstrap de dados reais, não bloqueia o que foi feito até aqui).

**Próximo passo executado a seguir: FASE C — proxy same-origin Vercel → Render** (ver seção 20).

## 20. Executado — Evidência (FASE C — Proxy Vercel → Render)

**Status da FASE C: `VERCEL_PROXY_CONFIGURED` (configuração no código; deploy/redeploy real depende do merge para `main` ser aprovado pelo usuário).**

**Contexto real confirmado antes de editar:** `VERCEL_FRONTEND_URL=https://finan-house-web.vercel.app` já existia (projeto Vercel criado manualmente pelo usuário fora deste agente, assim como o Render) e `RENDER_API_URL=https://finanhouse.onrender.com` confirmado `LIVE` na FASE B (seção 19).

**Arquivo alterado:** `apps/web/vercel.json`. Regra `/api/:path*` → `https://finanhouse.onrender.com/api/:path*` adicionada como **primeira** entrada de `rewrites`, preservando o fallback SPA (`/((?!api/).*)`  → `/index.html`) logo em seguida — Vercel casa regras em ordem, então `/api/*` nunca alcança o fallback. Nenhuma URL inventada: `https://finanhouse.onrender.com` é a URL real confirmada `LIVE` na FASE B.

**Teste (test-first) em `apps/web/vercel.config.test.ts`** — 3 casos novos, 4 preexistentes preservados (total 7, todos passando):
- confirma a regra `/api/:path*` aponta exatamente para `https://finanhouse.onrender.com/api/:path*`, com protocolo HTTPS;
- confirma que a regra de `/api/*` está posicionada **antes** do fallback de SPA no array `rewrites` (a ordem é o que garante que `/api/*` nunca caia em `index.html`);
- confirma que o destino é uma URL absoluta e resolvível (validada com `new URL()`, substituindo o parâmetro `:path*` do Vercel por um segmento de exemplo antes da validação, já que `:path*` não é regex) e nunca aponta para `localhost`/`127.0.0.1`.
- Os 4 testes preexistentes (JSON válido, fallback existe, fallback nunca captura `/api/*`, nenhum rewrite aponta para localhost) permanecem intactos e continuam passando sem alteração de asserção.

**Same-origin preservado:** nenhuma alteração em `apps/web/src/api/api-config.ts` — `VITE_API_BASE_URL` continua com contrato "vazio = mesma origem", nunca setado para `https://finanhouse.onrender.com` (isso re-introduziria uma chamada cross-origin direta do navegador ao Render, quebrando o cookie `SameSite=Lax`). Nenhuma alteração em cookie/CORS/`server.ts`/`app.ts` — a API no Render permanece com a configuração já validada na FASE B.

**Suíte de validação local:** build, `verify:runtime`, lint, typecheck, `typecheck:api-scripts` — todos OK. Testes: API 704 (inalterado) / Web **470** (467 + 3 novos) / Domain 214 (inalterado) — **total 1388**, sem nenhuma redução em relação à baseline de 1385. `drizzle-kit check` → "Everything's fine". `ddae-engine validate`/`audit` → OK, 0 P1/P2.

**Classificações finais da FASE C (configuração):**
- `VERCEL_PROXY_CONFIGURED` (rewrite real adicionado ao código, testado, validado).
- `VERCEL_DEPLOY_NOT_YET_TRIGGERED` (no momento em que esta seção foi escrita — commit/push/merge ainda não tinham sido autorizados).

Nenhuma alteração em Render, Aiven, cookie, ou variáveis de ambiente do backend nesta rodada. Nenhum bootstrap, nenhum dado real inserido.

**Atualização:** usuário autorizou explicitamente commit/push/merge nesta mesma rodada (ver commit `6f3a0e6` e merge `732a065`, já publicados em `origin/main`). Redeploy da Vercel confirmado automaticamente pelo push — verificado por este agente com chamadas HTTP reais: `GET https://finan-house-web.vercel.app/api/v1/auth/session` → `401` `{"error":{"code":"UNAUTHENTICATED","message":"Sessão ausente."}}` (JSON real da API via proxy, não fallback SPA) e `GET https://finan-house-web.vercel.app/movimentacoes` → `200 text/html` (fallback intacto). **FASE C efetivamente `VERCEL_PROXY_LIVE`.**

## 21. Executado — Evidência (FASE D — Bootstrap Controlado de Produção)

**Status da FASE D: `PROD_BOOTSTRAP_BLOCKED`.**

### Backup — gate confirmado pelo usuário

O usuário verificou manualmente o painel Aiven em 2026-09-01 e reportou evidência visual: backups ativos; último backup ≈ 6 horas atrás; cópia mais antiga atualmente exibida ≈ 2 dias atrás; backups completos visíveis em 30/08, 31/08 e 01/09/2026; ≈ 830 MB armazenados; painel indica que logs de transação são armazenados junto aos backups e que há suporte a restauração em ponto no tempo. Registrado apenas o que foi efetivamente observado — **nenhuma política de retenção contratual foi inferida ou inventada** além da janela atualmente exibida (2 dias).

**Classificação: `BACKUP_CONFIRMED`.**

### Verificação de compatibilidade do mecanismo oficial (antes de qualquer escrita)

Por exigência explícita do usuário, antes de usar qualquer script do diretório `C:\Users\leoki\FinanHouse` (checkout em branch histórica) para produção, os seguintes arquivos foram comparados byte a byte com a versão atual em `origin/main`/worktree do Bloco 03 — **todos idênticos**:
`apps/api/scripts/db-bootstrap-household.ts`, `apps/api/scripts/db-configure-initial-passwords.ts`, `apps/api/src/db/household-bootstrap-guard.ts`, `apps/api/src/db/household-bootstrap-input.ts`, `apps/api/src/db/initial-passwords-input.ts`, `apps/api/src/config/database-config.ts`, `package-lock.json`, `database/migrations/` (diretório inteiro).

Não havia, portanto, nenhum problema de "código desatualizado" — o bloqueio encontrado é estrutural e existe igualmente em `origin/main`.

### Bloqueio real encontrado (lido no código, depois confirmado empiricamente)

`apps/api/src/db/household-bootstrap-guard.ts` (`assertBootstrapEnvironmentAllowed`) e `apps/api/src/db/initial-passwords-guard.ts` (`assertInitialPasswordsEnvironmentAllowed`) **exigem literalmente `DATABASE_ENV === 'development'` e `DATABASE_NAME === 'finanhouse_dev'`** — qualquer outro valor lança `BootstrapGuardError`/`InitialPasswordsGuardError` antes de qualquer tentativa de conexão. Adicionalmente, `assertBootstrapMigrationsExact` exige **exatamente 2** migrations aplicadas (`0000`/`0001`) — `finanhouse_prod` tem 5 aplicadas (confirmado na FASE B), o que reprovaria o guard mesmo se o primeiro bloqueio não existisse. Essas são guardas deliberadas, escritas na época (Bloco 17/19) em que o projeto só conhecia `finanhouse_dev` — nunca atualizadas para reconhecer um ambiente de produção.

**Confirmação empírica (segura — o guard roda antes de `mysql.createConnection`, portanto nenhuma tentativa de rede/conexão ocorreu):**
```
$ DATABASE_ENV=production DATABASE_NAME=finanhouse_prod CONFIRM_HOUSEHOLD_BOOTSTRAP=true npm run db:bootstrap:household
db:bootstrap:household só pode ser executado com DATABASE_ENV=development.

$ DATABASE_ENV=production DATABASE_NAME=finanhouse_prod CONFIRM_INITIAL_PASSWORDS=true npm run db:configure:initial-passwords
db:configure:initial-passwords só pode ser executado com DATABASE_ENV=development.
```

**Por que este agente não contornou o guard:** editar/enfraquecer `household-bootstrap-guard.ts`/`initial-passwords-guard.ts` para aceitar produção seria uma alteração de código de segurança em produção, decidida e testada de improviso durante uma rodada operacional — exatamente o tipo de ação que as regras deste bloco (e desta sessão inteira) proíbem ("não improvisar", "usar somente o mecanismo oficial"). Trata-se de uma decisão de produto/arquitetura (estender os guards para reconhecer `production`/`finanhouse_prod`, e tornar a contagem de migrations dinâmica em vez de fixa em 2) que precisa ser explicitamente autorizada e implementada test-first, como qualquer outra mudança de código deste projeto — não deve ser tratada como parte do bootstrap operacional em si.

### O que foi confirmado com segurança, sem bloqueio (somente leitura)

- Todas as 7 variáveis de bootstrap/senha (`FINANHOUSE_BOOTSTRAP_HOUSEHOLD_NAME`, `_OWNER_NAME`, `_OWNER_EMAIL`, `_PARTNER_NAME`, `_PARTNER_EMAIL`, `FINANHOUSE_INITIAL_PASSWORD_OWNER`, `_PARTNER`) estão **CONFIGURADAS** localmente em `apps/api/.env.local` (nomes verificados, nenhum valor lido/impresso) — quando o bloqueio acima for resolvido, a execução real não teria pendência de variável faltante.
- Pré-condição de `finanhouse_prod` (somente contagens, sem dado pessoal): `households=0`, `users=0`, `household_members=0`, `categories=0`, `financial_entries=0`, `monthly_periods=0`, `category_budgets=0`, `installment_plans=0`, `auth_sessions=0`, `migrations_applied=5` — banco permanece limpo, pronto para bootstrap assim que o mecanismo oficial for capaz de apontar para produção.
- `finanhouse_dev` reconfirmado intacto: 10 tabelas, 5 migrations aplicadas — nenhuma escrita realizada nele nesta rodada.
- Reconfirmado nesta rodada, sem nenhuma alteração: `GET https://finanhouse.onrender.com/health` → 200; `GET https://finanhouse.onrender.com/ready` → 200, `ready:true`, `tlsActive:true`; `GET https://finan-house-web.vercel.app/api/v1/auth/session` (sem sessão) → 401 JSON real via proxy.

### O que NÃO foi feito por causa do bloqueio

Bootstrap estrutural não executado. Configuração de senhas não executada (depende do bootstrap ter criado os 2 usuários primeiro). Smoke HTTP autenticado (login/session/household/logout) não executado — não há usuário nem `householdId` real ainda. `VITE_FINANHOUSE_HOUSEHOLD_ID` não determinado — não há `householdId` para reportar.

**Classificações finais da FASE D:**
- `BACKUP_CONFIRMED`
- `PROD_BOOTSTRAP_BLOCKED`
- `INITIAL_PASSWORDS_BLOCKED`
- `PROD_HTTP_SMOKE_NOT_RUN`
- `VERCEL_HOUSEHOLD_ID_MANUAL_ACTION_REQUIRED` (não aplicável ainda — não existe `householdId` para configurar)
- `BLOCO_03_NOT_READY`

**Próximo passo explícito:** decisão do usuário sobre como estender os guards oficiais (`household-bootstrap-guard.ts`/`initial-passwords-guard.ts`/`assertBootstrapMigrationsExact`) para reconhecerem `production`/`finanhouse_prod` de forma segura e testada — só depois disso o bootstrap real pode ser executado pelo mecanismo oficial. Nenhum código de guard foi alterado nesta rodada.

Nenhum código-fonte alterado nesta rodada (fora dos scripts diagnósticos temporários, removidos), nenhum commit/push/merge realizado nesta rodada, nenhuma escrita em `finanhouse_prod` ou `finanhouse_dev`, nenhum bootstrap, nenhuma senha configurada, nenhum dado real inserido.

## 22. Executado — Evidência (FASE D.1 — Compatibilização Segura dos Guards com Produção)

**Status: `PRODUCTION_BOOTSTRAP_GUARDS_READY`.** Bootstrap real **não executado** nesta rodada — rodada exclusivamente de correção de código, test-first, sem nenhuma conexão real ao Aiven.

### Causa original (recapitulada da FASE D)

`assertBootstrapEnvironmentAllowed`/`assertInitialPasswordsEnvironmentAllowed` exigiam, hardcoded, `DATABASE_ENV === 'development'` e `DATABASE_NAME === 'finanhouse_dev'` — qualquer outro par era recusado antes de qualquer conexão. `assertBootstrapMigrationsExact` exigia um número fixo de 2 migrations, obsoleto desde que o projeto passou a ter 5.

### Política nova

Ambas as guardas passaram a reconhecer exatamente dois pares autorizados, via mapa fechado (`BOOTSTRAP_ALLOWED_TARGETS`/`INITIAL_PASSWORDS_ALLOWED_TARGETS`) — nunca uma lógica permissiva do tipo "se produção, aceita qualquer banco":
- `development` → exige `finanhouse_dev`
- `production` → exige `finanhouse_prod`

Qualquer ambiente fora do mapa (`staging`, desconhecido, etc.), qualquer par cruzado (`production`+`finanhouse_dev`, `development`+`finanhouse_prod`) e qualquer `defaultdb` continuam sendo recusados — o comportamento fail-closed foi preservado e testado explicitamente, nunca apenas assumido. `resolveDatabaseConfig`/`database-config.ts` **não foi tocado** — continua sendo a primeira linha de defesa (já rejeitava esses pares antes mesmo de chegar ao guard); os guards de bootstrap agora reafirmam a mesma fronteira de forma independente, como defesa em profundidade coerente, não redundante-frágil.

**Migrations:** o número fixo `2` foi removido. `assertBootstrapMigrationsExact({ migrationsRows })` virou `assertBootstrapMigrationsMatchJournal({ appliedCount, expectedCount })` — uma comparação pura entre a contagem aplicada no banco alvo e a contagem real lida de `database/migrations/meta/_journal.json` no momento da execução (`readExpectedMigrationCount()` em `db-bootstrap-household.ts`). Hoje o journal tem 5 entradas, então a checagem exige 5 — mas o código não sabe nem precisa saber esse número: se uma migration `0005` for adicionada amanhã, a checagem passa a exigir 6 automaticamente, sem tocar em nenhum guard. Menos que o esperado (schema desatualizado) e mais que o esperado (estado inconsistente) continuam sendo rejeitados simetricamente.

### Test-first

`apps/api/src/db/household-bootstrap-guard.test.ts` e `apps/api/src/db/initial-passwords-guard.test.ts` foram reescritos ANTES da implementação — rodados contra o código antigo, 6 dos novos casos falharam exatamente como esperado (aprovação de `production`/`finanhouse_prod`, que o código antigo rejeitava; e chamada de `assertBootstrapMigrationsMatchJournal`, que ainda nem existia) — confirmando que os testes realmente exercitavam o gap antes de qualquer implementação. Depois da implementação, os 30 testes dos dois arquivos passam (14 + 16). Casos cobertos, para cada guard: `development`+`finanhouse_dev` aprovado; `production`+`finanhouse_prod` aprovado; `production`+`finanhouse_dev` recusado; `development`+`finanhouse_prod` recusado; `defaultdb` recusado em qualquer ambiente; ambiente desconhecido recusado; provider≠aiven recusado; confirmação ausente recusada. Para migrations: igual aprova (testado com 5 e também com 6, para provar que não é um valor fixo disfarçado); menor recusa; maior recusa. `assertUsersFoundExactly`/`assertNoUnauthorizedOverwrite`/`CONFIRM_PASSWORD_OVERWRITE` **não foram tocados** — testes preexistentes continuam intactos e passando, overwrite continua exigindo autorização separada. Nenhum teste novo conecta ao Aiven — todos os guards continuam puros (sem I/O).

### Scripts oficiais

`apps/api/scripts/db-bootstrap-household.ts`: docstring atualizada para descrever os dois pares válidos; import trocado para `assertBootstrapMigrationsMatchJournal`; nova função local `readExpectedMigrationCount()` lê `database/migrations/meta/_journal.json` (mesmo arquivo que `db-migrate.ts` já usa como pasta de migrations) e passa `expectedCount` real para o guard. Nenhuma mensagem de log nova imprime host/usuário/senha/CA — apenas contagens, como antes.

`apps/api/scripts/db-configure-initial-passwords.ts`: apenas docstring atualizada (os dois pares válidos, exemplo de uso contra produção) — nenhuma mudança de lógica, pois este script nunca teve checagem de migrations e já delegava toda a decisão de ambiente ao guard.

`apps/api/src/config/database-config.ts`: **não alterado.**

### Nenhuma conexão real nesta rodada

Nenhum `mysql.createConnection`/pool foi aberto contra Aiven (dev ou prod) nesta rodada — a correção é inteiramente coberta por testes unitários puros. `CONFIRM_HOUSEHOLD_BOOTSTRAP=true`/`CONFIRM_INITIAL_PASSWORDS=true` **não foram executados** contra nenhum banco real nesta rodada.

### Validação

Build, `verify:runtime`, lint, typecheck, `typecheck:api-scripts` — todos OK. Testes: API **711** (704 + 7 novos: +4 no bootstrap-guard, +3 no initial-passwords-guard) / Web 470 (inalterado) / Domain 214 (inalterado) — **total 1395**, aumento explicado inteiramente por testes novos, nenhuma redução. `drizzle-kit check` → "Everything's fine". `ddae-engine validate`/`audit` → OK, 0 P1/P2.

### Segurança do diff

`git diff --check` sem erros de whitespace. Diff revisado manualmente por padrões de segredo (`DATABASE_PASSWORD`, e-mail real, `BEGIN CERTIFICATE`, `mysql://`, `Bearer`, senha literal) — nenhum encontrado; apenas nomes de variáveis/funções, mensagens de erro genéricas e texto de documentação.

**Classificações finais da FASE D.1:**
- `PRODUCTION_BOOTSTRAP_GUARDS_READY`
- `BOOTSTRAP_NOT_EXECUTED`
- `INITIAL_PASSWORDS_NOT_EXECUTED`
- `NO_PROD_DATA_WRITTEN`
- `NO_DEV_DATA_WRITTEN`

**Próximo passo explícito:** revisão humana desta correção; após aprovação, commit/push/merge para `main` (ainda não realizados nesta rodada); só então, em uma rodada separada, executar o bootstrap real contra `finanhouse_prod` usando o mecanismo oficial já compatibilizado.

### Gate adicional — prova da resolução real do journal (antes do versionamento)

O usuário apontou uma lacuna correta: o relatório da FASE D.1 provava a função pura (`appliedCount` vs `expectedCount`), mas não provava que `readExpectedMigrationCount()` de fato localiza e lê `database/migrations/meta/_journal.json` no contexto real em que `db-bootstrap-household.ts` roda.

**Extração mínima:** `readExpectedMigrationCount()` foi extraída do script para um módulo novo e testável, `apps/api/src/db/migrations-journal.ts` (exporta `MigrationsJournalError` e `readExpectedMigrationCount(journalPath: string): number`) — nenhum refactor amplo, só o suficiente para tornar a função importável por um teste sem executar o script (importar o próprio script rodaria `main()` e abriria conexão real). O script agora importa essa função e resolve o caminho do journal ANTES de abrir qualquer conexão (`readExpectedMigrationCount(MIGRATIONS_JOURNAL_PATH)` movido para antes de `mysql.createConnection`, ao lado das outras validações de configuração que já falhavam cedo).

**Teste novo:** `apps/api/src/db/migrations-journal.test.ts` (6 casos):
1. Calcula o diretório do script (`apps/api/scripts`) por aritmética de caminho a partir do próprio teste, aplica a MESMA expressão relativa que o script usa (`../../../database/migrations/meta/_journal.json`) e confirma que o resultado é **byte-idêntico** a uma segunda rota, totalmente independente, até o mesmo arquivo — prova que a resolução de caminho usada pelo script real aponta exatamente para o journal real do repositório, não para uma cópia ou coincidência de nome.
2. Confirma que `readExpectedMigrationCount()` no caminho real retorna `journal.entries.length` — comparado dinamicamente contra uma leitura independente do mesmo arquivo (nunca contra o literal `5` sozinho; o `5` só aparece como uma asserção adicional que documenta o valor atual, não como fonte da lógica).
3–5. Arquivo ausente, JSON inválido e `entries` malformado — todos com arquivos temporários locais (`mkdtempSync`/`os.tmpdir()`), nunca o journal real — todos falham fechado com `MigrationsJournalError`.
6. Confirma que a mensagem de erro nunca contém o caminho completo do arquivo temporário (sanitização).

Nenhum teste conecta ao Aiven, nenhum usa `.env.local`, nenhum executa bootstrap, nenhum escreve em banco.

**Revalidação completa dos guards:** os 30 testes de `household-bootstrap-guard.test.ts`/`initial-passwords-guard.test.ts` (FASE D.1) + os 6 novos de `migrations-journal.test.ts` — 36 no total — rodados juntos, todos passando, cobrindo exatamente a lista de casos pedida (pares válidos, pares cruzados, `defaultdb`, provider inválido, ambiente desconhecido, confirmações, overwrite, migrations iguais/menor/maior).

**Validação:** build, `verify:runtime`, lint, typecheck, `typecheck:api-scripts` — OK. Testes: API 711→**717** (+6, só o novo arquivo de teste do journal) / Web 470 / Domain 214 — **total 1401**, aumento inteiramente por testes novos. `drizzle-kit check` OK. `ddae validate`/`audit` OK, 0 P1/P2. Diff (10 arquivos: 6 modificados na FASE D.1 + 2 novos do journal + 2 docs) revisado — nenhum segredo.

**Nenhuma conexão real ao Aiven nesta rodada** (nem para o gate do journal, nem para nada mais) — tudo coberto por testes locais/puros.

**Status: gate aprovado. Pronto para commit/push/merge.**
