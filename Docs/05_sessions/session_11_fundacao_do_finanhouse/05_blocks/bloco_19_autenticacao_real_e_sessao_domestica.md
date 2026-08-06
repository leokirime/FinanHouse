# Bloco 19 — Autenticação real e sessão doméstica

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-08-06

## 1. Objetivo

Implementar autenticação real (login por e-mail/senha, sessão por cookie `HttpOnly`, logout) para os dois usuários já existentes no household, protegendo todas as rotas financeiras — sem cadastro público.

## 2. Contexto

DT-11/DT-12 documentaram explicitamente que a ausência de autenticação era a razão de `createHttpApp` recusar `runtimeMode: 'production'` e de `createdByUserId` vir do corpo da requisição (qualquer cliente podia se passar por qualquer usuário). O household estrutural (Bloco 17) já tem exatamente dois usuários reais — não há cadastro a construir, só login para quem já existe.

## 3. Problema que Este Bloco Resolve

Qualquer cliente da API podia indicar `createdByUserId`/`closedByUserId` livremente no corpo da requisição, sem nenhuma verificação de identidade; o frontend resolvia `householdId` de uma variável de ambiente local, não de uma sessão autenticada. Não havia como saber quem de fato realizou uma ação.

## 4. Escopo

- Colunas `users.password_hash`/`password_configured_at` + tabela `auth_sessions` (migration `0003_auth_sessions.sql`, gerada via `drizzle-kit generate`, revisada, **aplicada uma única vez** a `finanhouse_dev` com autorização explícita).
- Hash de senha (Argon2id, `@node-rs/argon2`) e token/hash de sessão (SHA-256) — `apps/api/src/security/`.
- Porta `AuthSessionRepository` com `create()`/`update()` separados (nunca um `save()` ambíguo) + `DrizzleAuthSessionRepository` (`id` gerado pelo `AUTO_INCREMENT` nativo do MySQL via `insertId`, nunca calculado em código — ver DT-15) + `InMemoryAuthSessionRepository`; porta `UserRepository` mínima (somente leitura); extensão de `HouseholdMemberRepository` (`findByUserId`).
- Serviços de aplicação (`LoginService`, `ValidateSessionService`, `LogoutService`) — mensagem sempre genérica para qualquer falha de autenticação.
- Endpoints `POST .../auth/login`, `GET .../auth/session`, `POST .../auth/logout`; `preHandler` global exigindo sessão válida em toda rota `/api/v1/households/:householdId/...` (401 sem sessão, 404 se o household divergir); rate limit no login (`@fastify/rate-limit`).
- `createdByUserId`/`closedByUserId` removidos dos schemas de corpo (`entries`/`periods`) — derivados de `request.authSession.userId`.
- Script de configuração de senhas iniciais (`db-configure-initial-passwords.ts`) — permanente, nunca cria usuário, autorização separada da migration.
- Script de auditoria dedicado (`db-audit-auth-sessions.ts`) — banco não-vazio, mesmo padrão do Bloco 18.
- Frontend: `AuthProvider`/`useAuth`/`useAuthenticated`, `LoginPage`, `AppRoot.tsx` (gate de autenticação separado do gate de carga financeira), `DashboardHeader` com nome do usuário + logout, `resolveApiConfig` sem `VITE_FINANHOUSE_HOUSEHOLD_ID` (household vem da sessão), `credentials: 'include'` no cliente HTTP.
- Documentação: DT-14, `contrato_autenticacao.md` (preenchido pela primeira vez), `contrato_api_http.md`, `contrato_frontend_backend.md`, `contrato_banco_dados.md`, RF-09, READMEs.

## 5. Fora de Escopo

- Cadastro público, recuperação de senha, MFA, OAuth/SSO — deliberadamente fora de escopo (sistema doméstico, não SaaS).
- Permissões granulares por papel (`owner`/`member`) além do vínculo com o household.
- Limpeza periódica de sessões expiradas (`auth_sessions` nunca é purgada automaticamente).
- Correção do mesmo padrão de geração de `id` (`information_schema.TABLES.AUTO_INCREMENT`) nos outros três repositórios Drizzle que o compartilham (`category_budgets`, `financial_entries`, `monthly_periods`) — registrado como dívida técnica P2 (DT-15), não corrigido neste bloco.
- Qualquer alteração em regras de domínio financeiro (`financial_entries`, `category_budgets`, etc.).

## 6. Arquivos e Pastas Envolvidos

- `apps/api/src/db/schema/users.ts`, `auth-sessions.ts`, `schema/index.ts`, `db/types.ts` (novo/alterado)
- `database/migrations/0003_auth_sessions.sql`, `meta/_journal.json`, `meta/0003_snapshot.json` (novo)
- `apps/api/src/security/password-hashing.ts`, `session-token.ts` (+ testes) (novo)
- `apps/api/src/application/auth-errors.ts`, `application/ports/auth-session-repository.ts`, `user-repository.ts`, `ports/index.ts` (novo/alterado)
- `apps/api/src/application/services/auth-services.ts` (+ teste) (novo)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-auth-session-repository.ts`, `drizzle-user-repository.ts`, `mappers/auth-session-mapper.ts`, `create-drizzle-repositories.ts`, `index.ts` (novo/alterado)
- `apps/api/src/infrastructure/repositories/memory/in-memory-auth-session-repository.ts`, `in-memory-user-repository.ts`, `in-memory-household-member-repository.ts`, `index.ts` (novo/alterado)
- `apps/api/src/http/plugins/auth.ts`, `routes/auth.ts`, `schemas/auth-schemas.ts`, `app.ts`, `errors/error-handler.ts`, `plugins/cors.ts`, `test-support/build-test-app.ts` (novo/alterado)
- `apps/api/src/http/routes/entries.ts`, `periods.ts`, `schemas/entry-schemas.ts`, `schemas/period-schemas.ts` (alterado — `createdByUserId`/`closedByUserId` da sessão)
- `apps/api/src/db/initial-passwords-guard.ts`, `initial-passwords-input.ts`, `auth-sessions-audit.ts` (+ testes), `apps/api/scripts/db-configure-initial-passwords.ts`, `db-audit-auth-sessions.ts`, `apps/api/package.json`, `package.json` (raiz), `scripts/connection-safety.test.ts` (novo/alterado)
- `apps/web/src/api/auth-api.ts` (+ teste), `api-config.ts`, `api-client.ts`, `api-errors.ts`, `financial-api.ts`, `financial-api.types.ts` (novo/alterado)
- `apps/web/src/state/AuthProvider.tsx` (+ teste), `auth-context.ts`, `auth-types.ts`, `FinanceProvider.tsx`, `test-support/AuthTestProvider.tsx` (novo/alterado)
- `apps/web/src/hooks/use-auth.ts`, `use-period-budgets.ts` (novo/alterado)
- `apps/web/src/pages/LoginPage.tsx` (+ CSS + teste) (novo)
- `apps/web/src/AppRoot.tsx` (+ teste), `App.tsx`, `main.tsx`, `test-utils.tsx` (novo/alterado)
- `apps/web/src/components/layout/DashboardHeader.tsx` (+ CSS + teste), `FinanceStatusScreen.tsx` (alterado)
- Testes existentes ajustados para a nova exigência de sessão (`categories.test.ts`, `members.test.ts`, `periods.test.ts`, `entries.test.ts`, `category-budgets.test.ts`, `create-drizzle-repositories.test.ts` no backend; `FinanceProvider.test.tsx`, `use-period-budgets.test.tsx`, `PlanningPage.test.tsx` no frontend)
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-14), `Docs/03_contracts/contrato_autenticacao.md`, `contrato_api_http.md`, `contrato_frontend_backend.md`, `contrato_banco_dados.md`, `Docs/01_product/requisitos_funcionais.md` (RF-05, RF-09)
- `README.md`, `apps/web/README.md`, `apps/api/README.md`, README/bloco/prompt/feedback da sessão

## 7. Dependências

DT-12 (Bloco 17) — frontend já integrado à API real. Bootstrap estrutural do Bloco 17 — os dois usuários que serão autenticados já existem.

## 8. Plano de Implementação

1. Confirmar estado inicial (git, branch `feat/session-11-bloco-19-auth-session-real`, bloco/prompt DDAE).
2. Inspecionar schema/bootstrap/serviços/rotas/frontend existentes.
3. Registrar DT-14.
4. Modelar `users.password_hash`/`password_configured_at` + `auth_sessions`; gerar migration `0003` (sem aplicar).
5. Implementar hashing de senha (Argon2id) e token/hash de sessão (SHA-256), com testes.
6. Implementar porta/repositório de `AuthSession`, `UserRepository` mínimo, extensão de `HouseholdMemberRepository`.
7. Implementar serviços de autenticação (login/validação/logout).
8. Implementar rotas HTTP de auth + guard de proteção + CORS com credenciais + testes HTTP dedicados.
9. Derivar `createdByUserId`/`closedByUserId` da sessão nas rotas financeiras existentes; ajustar todos os testes HTTP pré-existentes para autenticar (auto-auth do harness de teste).
10. Criar script de configuração de senhas iniciais (protegido) e script de auditoria dedicado, com testes.
11. Implementar `AuthProvider`/`LoginPage`/`AppRoot` no frontend; remover `VITE_FINANHOUSE_HOUSEHOLD_ID`; `FinanceProvider`/`usePeriodBudgets` passam a usar o household da sessão.
12. Escrever testes de frontend (cliente de auth, `AuthProvider`, `LoginPage`, integração `AppRoot`, StrictMode).
13. Rodar validação completa sem aplicar a migration (build, lint, typecheck, testes, `drizzle-kit check`, `ddae-engine validate`/`audit`, `npm audit`, `db:check`/`db:audit:auth-sessions -- --phase=before` somente leitura).
14. Atualizar documentação (DT-14, `contrato_autenticacao.md`, contratos HTTP/frontend-backend/banco, RF-09, READMEs).
15. Preencher o conteúdo real deste bloco e do prompt correspondente.
16. Apresentar checkpoint e aguardar a frase de autorização exata para aplicar a migration; depois, aguardar uma segunda frase de autorização separada para configurar as senhas iniciais.

## 9. Critérios de Aceite

- [x] `users.password_hash`/`password_configured_at` + `auth_sessions` modelados; migration `0003_auth_sessions.sql` gerada, revisada (`drizzle-kit check`) e **aplicada uma única vez** em `finanhouse_dev` (autorização `AUTORIZO MIGRATION AUTH_SESSIONS FINANHOUSE_DEV`).
- [x] Senha nunca em texto plano — hash Argon2id; token de sessão opaco (256 bits), banco só guarda o hash SHA-256, nunca o token bruto.
- [x] Cookie de sessão `HttpOnly`/`SameSite=Lax`/`Secure` (fora de development) — nunca `localStorage`/`sessionStorage`.
- [x] Toda rota financeira exige sessão válida (401 sem sessão) e household correspondente (404 se divergir, nunca distinguível de inexistente).
- [x] `createdByUserId`/`closedByUserId` vêm exclusivamente da sessão — corpo da requisição não pode forjar outro usuário (testado explicitamente).
- [x] Frontend nunca monta `FinanceProvider`/`usePeriodBudgets` antes de `AuthProvider` confirmar sessão autenticada; `householdId` nunca mais vem de variável de ambiente.
- [x] Senhas iniciais dos dois usuários existentes configuradas via `db-configure-initial-passwords.ts` (autorização separada `AUTORIZO CONFIGURAR ACESSOS INICIAIS FINANHOUSE_DEV`), sem criar usuário novo.
- [x] Cookie de sessão first-party: frontend e API compartilham a mesma origem lógica via proxy do Vite (`server.proxy`, `vite.config.ts`) — corrige um bug real encontrado no teste manual em que `localhost`/`127.0.0.1` como origens diferentes bloqueavam o reenvio do cookie `SameSite=Lax` (ver DT-14, seção de correção pós-checkpoint).
- [x] Geração do `id` de `auth_sessions` delegada ao `AUTO_INCREMENT` nativo do MySQL (`ResultSetHeader.insertId`), nunca calculado em código — corrige uma condição de corrida real encontrada e corrigida em duas etapas após a validação funcional inicial (DT-15).
- [x] `LoginPage` redesenhada (layout de duas colunas em desktop, identidade visual roxo/preto, mostrar/ocultar senha, mensagens de erro do produto — nunca texto técnico do backend).
- [x] Suíte de testes ampliada sem reduzir a base anterior (**1047 testes**: 550 API + 344 web + 153 domínio, contra 834 no fim do Bloco 18).
- [x] Documentação (contratos, READMEs, RF-09, DT-14/DT-15) atualizada refletindo o estado final real, incluindo os dois bugs encontrados e corrigidos após o checkpoint inicial.

## 10. Validações Obrigatórias

- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint` (oxlint, todos os workspaces — 0 warnings)
- [x] `npm run typecheck` / `npm run typecheck:api-scripts`
- [x] `npm run test` (monorepo completo) — **1047 testes**: 550 `apps/api`, 344 `apps/web`, 153 `packages/domain`
- [x] `npx drizzle-kit check` (`apps/api`) — "Everything's fine"
- [x] `npx ddae-engine validate` — OK, 0 erros
- [x] `npx ddae-engine audit` — OK, 0 erros, 0 P1/P2 não registrados (warnings esperados: quality gates pendentes, bloco sem feedback ainda)
- [x] `npm audit --omit=dev` (0 vulnerabilidades) / `npm audit` (4 moderadas, pré-existentes, dev-only em `drizzle-kit`/`esbuild`, inalteradas)
- [x] `npm run db:check` — confirma Aiven/development/`finanhouse_dev`/TLS ativo
- [x] `CONFIRM_AUTH_SMOKE_TEST=true npm run db:smoke:auth-sessions` — transação real revertida, incluindo duas sessões simultâneas do mesmo usuário, logout seletivo e rollback restaurando todas as contagens
- [x] Validação funcional manual completa: login real → Dashboard → Movimentações/Comparativo/Planejamento/Histórico → logout → reload após logout, com duas sessões simultâneas independentes (dois `BrowserContext` do Playwright, mesma conta)

## 11. Segurança

Ponto central deste bloco. Hash Argon2id (biblioteca de terceiros, nunca implementação própria de criptografia); token de sessão via CSPRNG (`crypto.randomBytes`), nunca `Math.random()`; mensagens de erro sempre genéricas para nunca revelar existência de e-mail/motivo da falha; rate limit no login; cookie `HttpOnly` (nunca acessível a JavaScript) com `Secure` fora de development; CORS com `Access-Control-Allow-Credentials: true` mantendo a mesma lista fechada de origens (nunca wildcard); `householdId` da URL sempre validado contra o da sessão (404 se divergir, nunca vazamento via 401/403 diferenciado); scripts de banco (senha, auditoria) nunca imprimem e-mail/senha/hash. API continua sem HTTPS/produção — `createHttpApp` continua recusando `runtimeMode: 'production'`.

## 12. Performance

Não aplicável — uso doméstico local. Argon2id tem custo de CPU deliberado (só no login, não a cada requisição); validação de sessão usa SHA-256 (rápido) a cada requisição autenticada, sem impacto perceptível.

## 13. Design System / UX

Nova `LoginPage` reaproveita tokens existentes (`fh-card`, cores/espaçamentos do tema roxo/preto); `DashboardHeader` ganha um botão "Sair" com o mesmo padrão visual de botões secundários já usados no projeto. Nenhum componente novo de design system introduzido além da própria tela de login.

## 14. Riscos

- **Materializado e corrigido:** cookie de sessão não reenviado quando frontend e API estavam em origens diferentes (`localhost` vs `127.0.0.1`) — corrigido com proxy same-origin do Vite (`server.proxy`).
- **Materializado e corrigido:** condição de corrida na geração do `id` de `auth_sessions` (`information_schema.TABLES.AUTO_INCREMENT`, depois `MAX(id) + 1`) podia colidir sob login concorrente do mesmo usuário ou de usuários diferentes — corrigido delegando o `id` ao `AUTO_INCREMENT` nativo do MySQL (DT-15).
- `auth_sessions` cresce indefinidamente (sem limpeza automática) — dívida técnica aceita, registrada como pendência P3.
- Sem MFA/recuperação de senha — aceitável para um sistema doméstico de dois usuários, registrado como decisão explícita (DT-14).
- **Incidente operacional (sanitizado):** durante a validação manual com credenciais reais, uma captura de tela automatizada registrou momentaneamente o formulário de login com o e-mail do proprietário ainda visível no campo (a página não tinha avançado no instante da captura). O arquivo foi apagado imediatamente ao ser percebido, o valor nunca foi reproduzido em nenhum relatório ou commit, e as validações seguintes passaram a usar exclusivamente checagens programáticas (booleans/seletores), nunca screenshots enquanto campos pudessem conter dado real.

## 15. Pendências Esperadas

- P2 — `drizzle-category-budget-repository.ts`, `drizzle-financial-entry-repository.ts` e `drizzle-monthly-period-repository.ts` usam o mesmo padrão vulnerável de geração de `id` corrigido em `auth_sessions` (DT-15) — `nextId()` via `information_schema.TABLES.AUTO_INCREMENT` + `save()` único insere-ou-atualiza. Risco menor que o de sessões (ações deliberadas do usuário, não uma consequência de todo carregamento de página — exceto `ensurePeriod`, que roda a cada carga do Dashboard), mas não nulo. Correção exigiria repetir o mesmo padrão de refatoração (porta, implementação Drizzle, repositório em memória, serviços, testes) nos três — escopo comparável a um bloco novo, não uma correção pontual. Sugestão: bloco futuro dedicado.
- P3 — Limpeza periódica de sessões expiradas não implementada.
- P3 — Recuperação de senha, MFA, permissões granulares por papel: próximos passos naturais do roadmap, não pendências deste bloco.
- P4 — Deploy seguro/produção: fora de escopo, API continua estritamente local.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_19_autenticacao_real_e_sessao_domestica --session session_11_fundacao_do_finanhouse` — ver `08_feedbacks/feedback_bloco_19_autenticacao_real_e_sessao_domestica.md`.

## 17. Commit Semântico Sugerido

```
feat(auth): implementar autenticação e sessão doméstica
```
