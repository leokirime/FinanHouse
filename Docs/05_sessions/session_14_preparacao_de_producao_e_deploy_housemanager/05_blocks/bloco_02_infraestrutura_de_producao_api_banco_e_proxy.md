# Bloco 02 — Infraestrutura de produção: API, banco e proxy

> Sessão: 14 (preparacao_de_producao_e_deploy_housemanager) · Projeto: FinanHouse · Atualizado em: 2026-08-28

## 1. Objetivo

Validar e preparar tecnicamente o HouseManager para a arquitetura de custo zero decidida pelo usuário (Vercel Free + Render Free Web Service + Aiven já existente), sem provisionar nenhuma infraestrutura real nesta rodada.

## 2. Contexto

O Bloco 01 desta sessão deixou a API classificada como `API_READY_FOR_PERSISTENT_NODE_HOST` (portão de produção fail-closed, bind/CORS configuráveis, `vercel.json` com fallback de SPA). O usuário decidiu a arquitetura definitiva de custo zero: frontend na Vercel Free, API num Render Free Web Service (Node persistente, nunca serverless), banco reaproveitando o serviço Aiven já existente (`finanhouse_dev` para dev, `finanhouse_prod` a criar como banco lógico separado, nunca um serviço novo).

## 3. Problema que Este Bloco Resolve

Antes deste bloco, ninguém havia validado se a API, tal como corrigida no Bloco 01, realmente funciona quando as variáveis de ambiente vêm de uma plataforma real (Render) em vez de um arquivo `.env.local` local, nem havia uma declaração explícita de versão do Node para a plataforma escolher. Sem essa validação, o primeiro deploy real correria o risco de falhar por um motivo novo e não identificado.

## 4. Escopo

- Validar a estrutura real da API para rodar como Render Free Web Service (root directory, build/start command, health check, versão do Node).
- Confirmar que a correção do Bloco 01 (bind/CORS/produção) funciona com env vars injetadas diretamente pela plataforma (sem `.env.local`).
- Corrigir, test-first, qualquer lacuna real encontrada nessa validação (não uma feature nova — uma correção de infraestrutura, no mesmo espírito do Bloco 01).
- Documentar exatamente a configuração esperada de Render/Vercel/GitHub, sem inventar URLs reais.
- Documentar a estratégia de banco (mesmo serviço Aiven, bancos lógicos separados), backup, migrations, bootstrap — sem executar nada.
- Produzir a ordem operacional exata do deploy real (próxima rodada).

## 5. Fora de Escopo

- Criar/provisionar qualquer recurso externo real (Render, Vercel, Aiven `finanhouse_prod`).
- Conectar GitHub a Render ou Vercel.
- Aplicar qualquer migration.
- Executar bootstrap ou criar dado real.
- Qualquer funcionalidade de produto (parcelamentos, Dashboard, Agenda, etc.).
- Configurar o rewrite real de `/api/*` (depende da URL do Render, que só existe após o provisionamento).

## 6. Arquivos e Pastas Envolvidos

- `apps/api/src/http/server.ts` — `loadLocalEnv` corrigido para não ser fatal em produção quando `.env.local` não existe.
- `apps/api/src/http/server.test.ts` — testes novos provando o comportamento antes/depois.
- `.node-version` (novo, raiz do repositório).
- `apps/api/src/node-version.test.ts` (novo).
- Documentação DDAE do próprio bloco/prompt/feedback.

## 7. Dependências

- Bloco 01 integrado na `main` (`9d8909ede8f6c8df201c2a85398a7a77bc42b4c0`), classificação `API_READY_FOR_PERSISTENT_NODE_HOST`.

## 8. Plano de Implementação

1. Checkpoint de git; worktree isolado a partir de `origin/main`; preservar o scaffold do Bloco 02 já criado (cópia com hash).
2. Inspecionar a estrutura real da API (`package.json`, `tsconfig.json`, `server.ts`) para determinar a configuração exata do Render.
3. Escrever teste (test-first) provando que `.env.local` ausente em produção não deveria ser fatal — confirmar que falha contra o código atual.
4. Corrigir `loadLocalEnv` para depender do `runtimeMode`.
5. Escrever teste (test-first) provando a ausência de `.node-version` — confirmar falha.
6. Criar `.node-version` na raiz.
7. Inspecionar migrations, scripts de bootstrap, `resolveDatabaseConfig`/`assertDatabaseNameAllowed`, `database-ca.ts` — documentar sem executar.
8. Rodar toda a suíte e validações obrigatórias.
9. Documentar evidência, criar feedback.

## 9. Critérios de Aceite

- [x] Estrutura real da API mapeada para Render (root directory, build, start, health check, Node version).
- [x] `.env.local` ausente em produção não é mais fatal — testado.
- [x] `.node-version` declarado e testado.
- [x] `DATABASE_ENV=production` continua exigindo `finanhouse_prod` — confirmado, sem alteração.
- [x] Estratégia de CORS/cookie/proxy same-origin documentada sem hardcode de URL fictícia.
- [x] Ordem operacional do deploy real documentada.
- [x] Nenhuma infraestrutura real provisionada; nenhum Aiven acessado.

## 10. Validações Obrigatórias

- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test` (todos os workspaces)
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine validate`
- [x] `npx ddae-engine audit`

## 11. Segurança

Nenhuma credencial real tocada. `DATABASE_CA_CERT_BASE64` (já existente) é o mecanismo recomendado para Render — evita gerenciar um arquivo de certificado no sistema de arquivos efêmero da plataforma. Nenhum segredo em `.node-version`/`vercel.json`/`.env.example`.

## 12. Performance

Não aplicável — validação de configuração, sem consulta nova.

## 13. Design System / UX

Não aplicável.

## 14. Riscos

- Cold start do Render Free: aceito conscientemente pelo usuário — não é bloqueador, documentado como característica conhecida do plano gratuito.
- Mesmo serviço Aiven para dev/prod: aceito conscientemente — mitigado por `assertDatabaseNameAllowed` (já existente, testado desde a Sessão 12) e por nunca reutilizar fixtures/dados de teste destrutivos contra `finanhouse_prod`.

## 15. Pendências Esperadas

- P4 (ação manual, próxima rodada): criar `finanhouse_prod` no Aiven, criar o Render Web Service, aplicar migrations em produção, obter a URL real do Render, configurar o rewrite `/api/*` da Vercel, conectar GitHub a ambas as plataformas, bootstrap controlado, smoke real.

## 16. Feedback Obrigatório

Feedback gerado via `ddae-engine feedback create --block bloco_02_infraestrutura_de_producao_api_banco_e_proxy --session session_14_preparacao_de_producao_e_deploy_housemanager` após todas as validações.

## 17. Commit Semântico Sugerido

```
fix(http): tolerar ausencia de .env.local em producao e declarar versao do node
```

---

## 18. Executado — Validação do Render Free (Web Service Node persistente)

Inspeção da estrutura real (não presumida) determinou a configuração exata:

- **Root Directory:** raiz do repositório (`.`) — **nunca `apps/api`**. `apps/api` depende de `@finanhouse/domain` via npm workspaces; o link simbólico só é criado por um `npm install`/`npm ci` executado a partir da raiz. Apontar o Root Directory do Render para `apps/api` quebraria essa resolução.
- **Build Command:** `npm ci && npm run build:domain && npm run build --workspace=api` — usa exatamente os scripts já existentes (`package.json` raiz), sem inventar comando novo. `npm run build --workspace=api` roda `tsc -p tsconfig.json`, gerando `apps/api/dist/`.
- **Start Command:** `node apps/api/dist/index.js` — confirmado por `tsconfig.json` da API (`outDir: "dist"`, `rootDir: "src"`) e por `apps/api/package.json` (`"start": "node dist/index.js"`, relativo a `apps/api/`; a partir da raiz do repo, o caminho completo é `apps/api/dist/index.js`).
- **Health Check Path:** `/health` — confirma só que o processo Fastify está vivo, nunca consulta o banco (`registerHealthRoute`, `getHealthStatus()`). Correto para o healthcheck do Render, que precisa de uma resposta rápida e independente de dependências externas.
- **`/ready` preservado** para smoke de disponibilidade completa (config + pool + conexão + TLS) — não é o healthcheck do Render, é uma rota adicional para verificação manual/smoke pós-deploy.
- **Node version:** `.node-version` criado com `24` (raiz do repositório) — nenhuma declaração existia antes; Render (e a maioria das plataformas) usa esse arquivo para escolher a versão do runtime. Sem ele, o comportamento dependeria de um default da plataforma potencialmente incompatível com `NodeNext`/ES2023 (`tsconfig.json` da API) ou com a versão usada em desenvolvimento (`@types/node@^24`). Testado (`node-version.test.ts`, 3 testes): arquivo existe, é um número de major válido, é coerente com `@types/node`.

## 19. Executado — Achado Real: `.env.local` Ausente em Produção

Durante a inspeção de `http/server.ts`, foi confirmado que `loadLocalEnv()` **sempre** tentava ler `apps/api/.env.local` e chamava `process.exit(1)` incondicionalmente se o arquivo não existisse — **em qualquer `runtimeMode`, inclusive produção**. Num deploy real no Render, esse arquivo nunca existe: a plataforma injeta as variáveis de ambiente diretamente em `process.env`. Sem esta correção, a API teria travado no primeiro segundo de execução no Render, mesmo com `HTTP_HOST`/`CORS_ALLOWED_ORIGINS`/credenciais de banco todas corretamente configuradas no painel do Render — um bloqueador real, não hipotético, mais grave que os já corrigidos no Bloco 01 porque nem chegaria a validar bind/CORS/banco.

**Correção (test-first, confirmada falhando antes da correção):** `loadLocalEnv(runtimeMode)` agora recebe o modo de execução; se o arquivo não existir e `runtimeMode === 'production'`, apenas retorna (a validação de que as variáveis necessárias realmente existem continua sendo responsabilidade de `resolveDatabaseConfig`/`resolveBindHost`/`resolveCorsAllowedOrigins`, chamadas logo em seguida, cada uma com mensagem de erro específica). Fora de produção, o comportamento anterior (fatal, com mensagem clara) foi **preservado integralmente** — nenhum teste de desenvolvimento local foi enfraquecido. `resolveRuntimeMode()` foi movido para antes de `loadLocalEnv()` (nunca dependeu do arquivo — lê `NODE_ENV` diretamente de `process.env`, evitando um ciclo onde seria preciso o arquivo para saber se o arquivo é opcional).

## 20. Executado — Banco: Mesmo Serviço Aiven, Bancos Lógicos Separados

Confirmado por leitura de código (`apps/api/src/config/database-config.ts`, `assertDatabaseNameAllowed`, já existente e testado desde a Sessão 12, **nenhuma alteração nesta rodada**):

- `DATABASE_ENV=production` **exige** `DATABASE_NAME=finanhouse_prod` — qualquer outro valor lança `DatabaseConfigError`, antes de qualquer tentativa de conexão.
- `DATABASE_ENV=development` exige `finanhouse_dev` pela mesma função.
- `defaultdb` é explicitamente proibido como nome de banco em qualquer ambiente.

**Vantagem da decisão (mesmo serviço Aiven, dois bancos lógicos):** custo zero — nenhum serviço novo a provisionar/pagar.
**Limitação:** não há isolamento físico entre DEV e PROD (mesmo host/credenciais de serviço, apenas nomes de banco diferentes). Mitigado por: nome de banco obrigatoriamente diferente (já imposto pelo código), nunca reutilizar fixtures/smoke destrutivos contra `finanhouse_prod`, e por ser um projeto de uso doméstico pessoal, não uma aplicação multiusuário com requisito formal de isolamento de compliance — o risco é proporcional ao contexto real de uso.
**`DATABASE_CA_CERT_BASE64`** (já existente, `database-ca.ts`) é o mecanismo recomendado para o Render — evita depender de um arquivo de certificado no sistema de arquivos da plataforma.

**Backup:** não documentado no repositório — **AÇÃO MANUAL** antes de inserir qualquer dado real: confirmar no painel do Aiven se o plano atual oferece backup automático, retenção e procedimento de restauração. Não presumido, não acessado nesta rodada.

## 21. Executado — Migrations e Bootstrap (inspecionados, não executados)

**Migrations** (`database/migrations/`, 5 arquivos, `0000`–`0004`, jornal Drizzle consistente, `drizzle-kit check` limpo): processo seguro para um banco `finanhouse_prod` vazio, na ordem: (1) confirmar `DATABASE_ENV=production`/`DATABASE_NAME=finanhouse_prod` resolvidos sem erro; (2) aplicar as 5 migrations em sequência via `npm run db:migrate` (nunca `drizzle-kit push`, que não versiona histórico); (3) `db:audit:schema` como pós-checagem; (4) `/ready` confirmando pool/TLS ativos.

**Bootstrap** (`apps/api/scripts/db-bootstrap-household.ts`, `db-configure-initial-passwords.ts` — inspecionados, nenhum executado): o primeiro cria, numa única transação permanente, 1 household, os 2 membros (owner/partner) e as categorias estruturais; imprime o `householdId` a ser configurado depois em `VITE_FINANHOUSE_HOUSEHOLD_ID` do frontend. O segundo, executado separadamente, grava apenas o hash Argon2id das senhas iniciais dos 2 usuários já criados pelo primeiro — exige simultaneamente 7 pré-condições (`.env.local`/env vars de banco corretas, migration de auth já aplicada, e-mails/senhas/confirmação explícita via `CONFIRM_INITIAL_PASSWORDS=true`), nenhuma delas satisfeita ou executada nesta rodada.

## 22. Executado — Vercel/GitHub (documentado, não conectado)

**Vercel (frontend):** Root Directory `apps/web`; Install Command padrão (`npm install`, mas precisa rodar a partir da raiz do monorepo por causa do workspace — Vercel resolve isso automaticamente quando o Root Directory é um subdiretório de um monorepo detectado); Build Command `npm run build --workspace=web` (ou o comando que a própria Vercel infere para um monorepo Vite); Output Directory `apps/web/dist`; env: `VITE_API_BASE_URL=` (vazio — same-origin, já suportado desde antes do Bloco 01) e `VITE_FINANHOUSE_HOUSEHOLD_ID` (após o bootstrap real). `vercel.json` (Bloco 01) já cobre o fallback de SPA sem capturar `/api/*`.

**Render (API):** Root Directory `.` (raiz), conforme seção 18. Env vars necessárias: `NODE_ENV=production`, `HTTP_HOST=0.0.0.0`, `PORT` (o Render já injeta automaticamente — não precisa ser definida manualmente), `CORS_ALLOWED_ORIGINS` (a origem pública real da Vercel, só conhecida após o primeiro deploy do frontend — ex.: `https://housemanager.vercel.app`, formato exato dependente do domínio real atribuído), `DATABASE_PROVIDER=aiven`, `DATABASE_ENV=production`, `DATABASE_NAME=finanhouse_prod`, `DATABASE_HOST`/`DATABASE_PORT`/`DATABASE_USER`/`DATABASE_PASSWORD` (credenciais reais do Aiven), `DATABASE_SSL_MODE=verify_identity`, `DATABASE_CA_CERT_BASE64`.

**Proxy `/api/*` na Vercel:** a URL real do Render só existe após o Web Service ser criado — **não inventada nesta rodada** (nenhuma URL fictícia tipo `housemanager-api.onrender.com` foi escrita em nenhum arquivo versionado). Quando `RENDER_API_URL_REAL` for conhecida, adicionar como **primeira entrada** do array `rewrites` de `apps/web/vercel.json` (antes do fallback de SPA já existente, já que o Vercel avalia rewrites em ordem):

```json
{ "source": "/api/:path*", "destination": "https://RENDER_API_URL_REAL/api/:path*" }
```

Até lá, uma chamada a `/api/*` no deploy da Vercel resulta em 404 visível (comportamento seguro do fallback já criado no Bloco 01 — nunca um 200 de HTML mascarando a ausência do proxy).

## 23. Executado — Cookie/CORS/Same-Origin (revalidado, sem alteração)

A premissa "browser vê tudo como same-origin" **se mantém intacta** com Vercel+Render+proxy: o navegador sempre fala com o domínio público da Vercel; o rewrite da seção 22 é resolvido no lado do servidor (Vercel Edge), nunca exposto como um redirect visível ao navegador — exatamente o mesmo mecanismo já usado em desenvolvimento (proxy do Vite). Nenhum detalhe técnico encontrado que quebre essa premissa. `sessionCookieOptions()` permanece sem alteração (`HttpOnly`, `Secure` em produção, `SameSite=Lax`, sem `Domain`). `CORS_ALLOWED_ORIGINS` na API deve conter a origem pública da Vercel mesmo com o proxy — o `Origin` do preflight que a API vê é o do rewrite (a origem pública, não `localhost`), então a validação de CORS continua sendo exercida de verdade, não incidental.

## 24. Executado — Ordem Operacional do Deploy Real (próxima rodada)

1. Criar `finanhouse_prod` no serviço Aiven já existente.
2. Confirmar manualmente backup/retenção no painel do Aiven.
3. Criar o Render Web Service (Root Directory `.`, Build/Start Command da seção 18).
4. Configurar as env vars do backend (seção 22) no painel do Render.
5. Aplicar as 5 migrations em `finanhouse_prod` (`npm run db:migrate`, com `CONFIRM_DATABASE_MIGRATION=true`).
6. Validar `GET /health` do Render.
7. Validar `GET /ready` do Render (confirma banco/TLS).
8. Obter a URL pública real do Render.
9. Adicionar o rewrite `/api/*` real em `apps/web/vercel.json` (seção 22).
10. Configurar `VITE_API_BASE_URL=` (vazio) e demais envs do frontend na Vercel.
11. Conectar GitHub → Vercel (branch `main`, Root Directory `apps/web`).
12. Deploy do frontend.
13. Testar `/api/*` através do domínio da Vercel (confirma o proxy).
14. Executar o bootstrap controlado (`db:bootstrap:household` + `db:configure:initial-passwords`).
15. Login real.
16. Smoke funcional manual.
17. Liberar para uso.

## 25. Executado — Resultado da Suíte e Classificação Final

Baseline no início deste bloco (herdado de `origin/main` pós-Bloco 01): API 699, Web 467, Domain 214, Total 1380.

- API: 699 → **704** (+5: 2 testes de `.env.local`/produção, 3 testes de `.node-version`).
- Web: 467 → 467 (inalterado).
- Domain: 214 → 214 (inalterado).
- Total: 1380 → **1385**.

Todas as validações obrigatórias (seção 10) passaram limpas. `ddae-engine audit`: 0 erros, 0 P1/P2, 9 warnings nesta execução (8 estruturais já conhecidos + "Bloco 02 sem feedback", que desaparece assim que o feedback for criado).

**Classificações finais:**
- **`RENDER_READY_FOR_CONFIGURATION`** — root directory, build/start command, health check e versão do Node determinados; o bloqueador real de `.env.local` foi corrigido e testado.
- **`AIVEN_READY_FOR_PRODUCTION_DATABASE`** — proteção de nome de banco já existente e testada; estratégia de mesmo serviço/bancos separados documentada com riscos e mitigação explícitos; nenhum acesso realizado.
- **`VERCEL_READY_FOR_CONFIGURATION`** — root directory, build, output, fallback de SPA (Bloco 01) e estratégia de proxy same-origin determinados; só falta a URL real do Render (dependência externa, não um bloqueador de código).

**Nenhum commit, push ou merge foi realizado.** Aguardando aprovação humana explícita antes de versionar este bloco.
