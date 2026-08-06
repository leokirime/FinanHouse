# Feedback — Bloco 19: Autenticação real e sessão doméstica

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-08-06

## 1. Resumo Executivo

Implementada autenticação real por e-mail/senha para os dois usuários já existentes no household (bootstrap do Bloco 17) — login, sessão por cookie `HttpOnly`, logout — protegendo todas as rotas financeiras, sem cadastro público, sem OAuth, sem MFA. Migration `0003_auth_sessions.sql` (`users.password_hash`/`password_configured_at` + tabela `auth_sessions`) gerada, revisada e **aplicada uma única vez** a `finanhouse_dev`, com autorização explícita do proprietário; as senhas iniciais dos dois usuários foram configuradas via script dedicado, com uma segunda autorização separada. `createdByUserId`/`closedByUserId` passaram a vir exclusivamente da sessão autenticada, nunca do corpo da requisição — encerrando a lacuna documentada desde DT-11/DT-12.

Durante a validação funcional manual com credenciais reais, dois bugs reais foram encontrados e corrigidos no mesmo dia, ambos antes de qualquer commit: (1) o cookie de sessão não era reenviado pelo navegador porque frontend (`localhost:5173`) e API (`127.0.0.1:3000`) estavam em origens diferentes — um cookie `SameSite=Lax` nunca é enviado em `fetch` cross-site — corrigido com um proxy same-origin no Vite (`server.proxy`, `vite.config.ts`); (2) a geração do `id` de `auth_sessions` (`nextId()` via `information_schema.TABLES.AUTO_INCREMENT`, depois via `MAX(id) + 1`) tinha uma condição de corrida real sob login concorrente do mesmo usuário — corrigido de forma definitiva delegando a geração do `id` ao `AUTO_INCREMENT` nativo do MySQL (`ResultSetHeader.insertId`), com a porta `AuthSessionRepository` dividida em `create()`/`update()` (DT-15). A tela de login também foi redesenhada (layout de duas colunas, identidade visual roxo/preto, mostrar/ocultar senha) depois de reprovada visualmente no primeiro teste manual.

Suíte final com **1047 testes** (era 971 no checkpoint inicial, 834 no fim do Bloco 18), incluindo testes de concorrência para a geração do `id` de sessão, smoke-test transacional real estendido para duas sessões simultâneas com logout seletivo, e validação funcional completa no navegador (login real, Dashboard, Movimentações, Comparativo, Planejamento, Histórico, logout, reload, duas sessões independentes em dois `BrowserContext`). Uma dívida técnica formal P2 foi registrada: os outros três repositórios Drizzle que compartilham o mesmo padrão de geração de `id` (`category_budgets`, `financial_entries`, `monthly_periods`) não foram corrigidos neste bloco — escopo comparável a um bloco novo.

## 2. Objetivo do Bloco

Implementar autenticação real (login por e-mail/senha, sessão por cookie `HttpOnly`, logout) para os dois usuários já existentes no household, protegendo todas as rotas financeiras — sem cadastro público.

## 3. Escopo Implementado

Igual ao planejado em `05_blocks/bloco_19_autenticacao_real_e_sessao_domestica.md`, seção 4, com dois itens adicionais não previstos no escopo original, ambos originados da validação funcional manual:

- **Correção de origem do cookie de sessão** (proxy same-origin do Vite) — sem isso, o login nunca avançava ao Dashboard em uso real via navegador.
- **Correção definitiva da geração do `id` de `auth_sessions`** (`AUTO_INCREMENT` nativo em vez de qualquer cálculo em código) — sem isso, o segundo login de um mesmo usuário podia invalidar silenciosamente o primeiro, ou colidir entre usuários diferentes.
- **Redesenho da `LoginPage`** — a versão inicial foi reprovada visualmente no teste manual (card pequeno, deslocado, botão cinza genérico, linguagem técnica).

## 4. Arquivos Criados

- `apps/api/src/db/schema/auth-sessions.ts`, `database/migrations/0003_auth_sessions.sql` (+ `meta/0003_snapshot.json`)
- `apps/api/src/security/password-hashing.ts`, `session-token.ts` (+ `.test.ts` de ambos)
- `apps/api/src/application/auth-errors.ts`, `application/ports/auth-session-repository.ts`, `user-repository.ts`, `application/services/auth-services.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-auth-session-repository.ts` (+ `.test.ts`), `drizzle-user-repository.ts` (+ `.test.ts`), `mappers/auth-session-mapper.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/memory/in-memory-auth-session-repository.ts`, `in-memory-user-repository.ts`
- `apps/api/src/http/plugins/auth.ts`, `routes/auth.ts` (+ `.test.ts`), `schemas/auth-schemas.ts`
- `apps/api/src/db/initial-passwords-guard.ts` (+ `.test.ts`), `initial-passwords-input.ts` (+ `.test.ts`), `auth-sessions-audit.ts` (+ `.test.ts`), `auth-smoke-guard.ts` (+ `.test.ts`), `auth-smoke-fixture.ts` (+ `.test.ts`)
- `apps/api/scripts/db-configure-initial-passwords.ts`, `db-audit-auth-sessions.ts`, `db-smoke-auth-sessions.ts`
- `apps/api/src/db/connection-error-classifier.ts` (+ `.test.ts`), `connect-with-retry.ts` (+ `.test.ts`), `apps/api/src/http/listen-error-classifier.ts` (+ `.test.ts`), `startup-diagnostics.ts` (+ `.test.ts`) — diagnóstico de inicialização, encontrados investigando um falso positivo de "erro de banco" que era na verdade `EADDRINUSE`
- `apps/web/src/api/auth-api.ts` (+ `.test.ts`)
- `apps/web/src/state/auth-context.ts`, `auth-types.ts`, `AuthProvider.tsx` (+ `.test.tsx`), `test-support/AuthTestProvider.tsx`
- `apps/web/src/hooks/use-auth.ts`, `apps/web/src/pages/LoginPage.tsx` (+ `.css`, `.test.tsx`), `apps/web/src/AppRoot.tsx` (+ `.test.tsx`)
- `apps/web/.env.example`
- `Docs/05_sessions/.../05_blocks/bloco_19_...md`, `06_prompts/prompt_bloco_19_...md`, este feedback

## 5. Arquivos Alterados

- `apps/api/src/db/schema/{users,index}.ts`, `db/types.ts`, `application/ports/{household-member-repository,index}.ts`, `application/services/index.ts`
- `apps/api/src/infrastructure/repositories/drizzle/{create-drizzle-repositories,index,drizzle-household-member-repository}.ts` (+ `.test.ts`), `mappers/auth-session-mapper.ts` (removida `toPersistenceAuthSession`, sem uso após a correção de DT-15)
- `apps/api/src/infrastructure/repositories/memory/{in-memory-household-member-repository,index}.ts`
- `apps/api/src/http/{app,errors/error-handler,plugins/cors,test-support/build-test-app,routes/entries,routes/periods}.ts`, `schemas/{entry-schemas,period-schemas}.ts`, `server.ts` (retry/diagnóstico de inicialização)
- `apps/api/src/http/routes/{categories,category-budgets,entries,periods}.test.ts`
- `apps/api/package.json`, `package.json` (raiz) — scripts `db:configure:initial-passwords`, `db:audit:auth-sessions`, `db:smoke:auth-sessions`
- `apps/api/scripts/connection-safety.test.ts`
- `database/migrations/meta/_journal.json`
- `apps/web/src/{App,main}.tsx`, `apps/web/src/App.tsx` (revertido ao estado pré-Bloco-19 depois de um erro de design corrigido no meio do bloco)
- `apps/web/src/api/{api-client,api-config,api-errors,financial-api,financial-api.types}.ts` (+ `.test.ts`)
- `apps/web/src/state/FinanceProvider.tsx` (+ `.test.tsx`), `hooks/use-period-budgets.ts` (+ `.test.tsx`)
- `apps/web/src/components/layout/{DashboardHeader,FinanceStatusScreen}.tsx` (+ `.css`/`.test.tsx`)
- `apps/web/src/test-utils.tsx`, `pages/PlanningPage.test.tsx`
- `apps/web/vite.config.ts` — proxy same-origin + `server.host` fixo em `127.0.0.1`
- `apps/web/.env.local` (local, nunca versionado) — `VITE_API_BASE_URL` vazio
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-14, DT-15), `Docs/03_contracts/{contrato_autenticacao,contrato_api_http,contrato_frontend_backend,contrato_banco_dados}.md`, `Docs/01_product/requisitos_funcionais.md` (RF-09)
- `README.md`, `apps/api/README.md`, `apps/web/README.md`

## 6. Arquivos Removidos

_Nenhum arquivo removido neste bloco (além da função `toPersistenceAuthSession`, já listada em "Arquivos Alterados")._

## 7. Comandos Executados

```
git switch -c feat/session-11-bloco-19-auth-session-real
npx ddae-engine block create "Autenticação real e sessão doméstica" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_19_autenticacao_real_e_sessao_domestica --session session_11_fundacao_do_finanhouse
cd apps/api && npx drizzle-kit generate && npx drizzle-kit check
npm run build / verify:runtime / lint / typecheck / typecheck:api-scripts / test (múltiplas iterações)
npx ddae-engine validate / audit
npm audit --omit=dev / npm audit
npm run db:check
npm run db:audit:auth-sessions -- --phase=before   (pré-flight, somente leitura)
CONFIRM_DATABASE_MIGRATION=true npm run db:migrate   (1 execução, autorizada, aplicou 0003_auth_sessions.sql)
npm run db:audit:auth-sessions -- --phase=after
CONFIRM_INITIAL_PASSWORDS=true npm run db:configure:initial-passwords   (1 execução, autorização separada)
CONFIRM_AUTH_SMOKE_TEST=true npm run db:smoke:auth-sessions   (executado 3 vezes: versão inicial, após correção de origem, após correção de concorrência)
npm run dev:api / npm run dev:web   (validação funcional local, múltiplas iterações)
npx ddae-engine feedback create --block bloco_19_autenticacao_real_e_sessao_domestica --session session_11_fundacao_do_finanhouse
```

## 8. Testes Realizados

- 213 testes adicionados no conjunto do trabalho, elevando o total de 834 (fim do Bloco 18) para **1047**: API 391→550 (+159: hashing/token, repositórios Drizzle e em memória de auth, serviços de aplicação, rotas HTTP de auth, guards de senha inicial/auditoria/smoke-test, classificadores de erro de inicialização, testes de concorrência da geração de `id`), web 290→344 (+54: cliente de auth, `AuthProvider` com proteção contra corrida, `LoginPage` redesenhada, `AppRoot`, ajustes de `api-config`/`api-client` para mesma origem), domain inalterado (153).
- Testes automatizados cobrem: hash Argon2id e verificação resistente a timing attack (hash-dummy memoizado); geração/hash de token de sessão; `create()`/`update()` do repositório de sessão com id sempre vindo de `insertId` real, nunca calculado — dois `create()` sequenciais com ids diferentes, ambas as sessões independentes, `update()` nunca criando nem alterando `token_hash`, revogação de uma sessão não afetando outra, verificação estática de ausência de `information_schema`/`MAX(id)`/`nextId` no código real; login/sessão/logout via HTTP (cookie `HttpOnly`/`SameSite=Lax`, rate limit, mensagens genéricas, proteção de rota financeira, household divergente → 404, `createdByUserId` forjado → 400); `AuthProvider` com `requestId` compartilhado entre carga inicial/login/logout impedindo uma resposta obsoleta de sobrescrever um login bem-sucedido; `LoginPage` com validação local de e-mail/senha, mostrar/ocultar senha, ausência da palavra "household" na interface.
- **Validação funcional manual (real, não simulada), em três rodadas:** (1) primeira rodada reprovada — login não avançava ao Dashboard; (2) segunda rodada, após correção de origem — login avançava mas a suíte de sessão ainda tinha risco de concorrência apontado na revisão; (3) terceira rodada, após DT-15 — aprovada integralmente: login real → Dashboard → Movimentações/Comparativo/Planejamento/Histórico, todos carregando sem erro de contrato; logout retornando ao login; reload após logout permanecendo no login; `localStorage`/`sessionStorage` vazios; duas sessões simultâneas em dois `BrowserContext` do Playwright (mesma conta) funcionando de forma totalmente independente, incluindo logout seletivo. Credenciais reais usadas apenas em memória de scripts temporários, nunca impressas nem salvas — à exceção de um incidente sanitizado (ver seção 11).

## 9. Validações Executadas

- `ddae-engine validate`: OK, 0 warnings/erros.
- `ddae-engine audit`: OK, 0 pendências P1/P2 (warnings esperados de quality gates pendentes, mesma linha de base de blocos anteriores; o aviso de "bloco sem feedback" deixa de existir com este arquivo).
- `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts` / `test`: todos aprovados.
- `npx drizzle-kit check`: "Everything's fine".
- `npm audit --omit=dev`: 0 vulnerabilidades. `npm audit`: 4 moderadas, dev-only (`drizzle-kit`/`esbuild`), já documentadas em blocos anteriores, inalteradas.
- Pré-flight (antes da migration): Aiven, development, `finanhouse_dev`, TLS ativo, 7/7 tabelas estruturais, `auth_sessions` ausente, 3 migrations.
- Pós-migration: 8/8 tabelas da aplicação presentes, `auth_sessions` vazia, 4 migrations registradas, contagens das sete tabelas anteriores preservadas, zero usuário com senha configurada só pela migration.
- Pós-configuração de senhas: 2 usuários reais com senha configurada, nenhum usuário novo criado, nenhum dado financeiro alterado.
- Smoke-test transacional (3 execuções ao longo do bloco, sempre com rollback intencional): login, sessão, proteção de rota, household divergente, `createdByUserId` forjado, logout idempotente, revogação — aprovado nas três rodadas; a terceira rodada adicionou o cenário de duas sessões simultâneas do mesmo usuário com logout seletivo, também aprovado.

## 10. Decisões Técnicas

Registradas em `Docs/02_architecture/decisoes_tecnicas.md`:

- **DT-14** — estratégia geral de autenticação (sem cadastro público, Argon2id, token opaco de 256 bits, cookie `HttpOnly`, tabela `auth_sessions`, `createdByUserId`/`householdId` vindos exclusivamente da sessão).
- **DT-15** — geração do `id` de `auth_sessions` delegada ao `AUTO_INCREMENT` nativo do MySQL, nunca calculado em código; documenta as duas causas encontradas em sequência (`information_schema.TABLES.AUTO_INCREMENT` obsoleto, depois `MAX(id) + 1` ainda sujeito a corrida) e por que ambas foram rejeitadas como solução definitiva; registra a dívida técnica P2 dos outros três repositórios com o mesmo padrão.

Decisão adicional, não antecipada no bloco original: o proxy same-origin do Vite (`server.proxy` + `server.host` fixo) como estratégia definitiva para o cookie de sessão nunca cruzar hosts diferentes (`localhost` vs `127.0.0.1`) — documentada em DT-15 e nos READMEs, não como uma DT própria (é consequência direta da estratégia de cookie já registrada em DT-14).

## 11. Problemas Encontrados

1. **Falha de inicialização da API mal categorizada:** `server.ts` reaproveitava o classificador de erro de conexão com o banco para qualquer falha de `app.listen()` — uma colisão de porta (`EADDRINUSE`, sem relação com o banco) aparecia como "erro de banco de dados não classificado", mandando a investigação inicial na direção errada. Corrigido com classificadores separados para conexão de banco e vinculação de porta, mais retry limitado (3 tentativas) só para erros de banco transitórios.
2. **Login não avançava ao Dashboard (origem do cookie):** frontend em `http://localhost:5173`, API em `http://127.0.0.1:3000` — hosts diferentes para o navegador, cookie `SameSite=Lax` nunca reenviado em `fetch` cross-site. Login retornava 200, cookie era definido, mas toda chamada seguinte (incluindo `GET /auth/session`) retornava 401. Corrigido com proxy same-origin do Vite.
3. **Tela de login reprovada visualmente:** card pequeno e deslocado, logo minúscula, botão cinza genérico, linguagem técnica ("household" na interface). Redesenhada com layout de duas colunas, identidade visual roxo/preto, mostrar/ocultar senha, conteúdo revisado.
4. **Login não avançava ao Dashboard (segunda vez, causa diferente):** mesmo após a correção de origem, sessões criadas por logins sequenciais do mesmo usuário podiam colidir no mesmo `id` (`nextId()` via `information_schema.TABLES.AUTO_INCREMENT` retornava sempre o mesmo valor já usado pela primeira sessão), e o `save()` único (insere-ou-atualiza) não regravava `token_hash` no ramo de atualização — a sessão no banco nunca voltava a corresponder ao cookie emitido. Corrigido preliminarmente com `MAX(id) + 1` + regravação de `token_hash` no `UPDATE`.
5. **Condição de corrida remanescente, apontada em revisão:** a correção do item 4 ainda calculava o `id` em código antes do `INSERT`, mantendo uma janela de colisão sob login concorrente — para o mesmo usuário, um login podia sobrescrever silenciosamente o `token_hash` do outro; para usuários diferentes, o segundo `INSERT` falharia por `ER_DUP_ENTRY`. Corrigido de forma definitiva delegando o `id` ao `AUTO_INCREMENT` nativo (DT-15), com a porta dividida em `create()`/`update()`.
6. **Incidente operacional sanitizado:** uma captura de tela automatizada, feita durante a validação manual com credenciais reais, registrou momentaneamente o formulário de login com o e-mail do proprietário ainda visível no campo (a página não tinha avançado no instante da captura). O arquivo foi apagado imediatamente ao ser percebido, o valor nunca foi reproduzido em nenhum relatório ou commit, e as validações seguintes passaram a usar exclusivamente checagens programáticas, nunca screenshots enquanto campos pudessem conter dado real.

## 12. Correções Aplicadas Durante o Bloco

1. Classificadores de erro de inicialização separados (banco vs. porta HTTP) + retry limitado (item 11.1).
2. Proxy same-origin do Vite + `server.host` fixo em `127.0.0.1` (item 11.2).
3. Redesenho completo de `LoginPage` (item 11.3).
4. Correção intermediária de `nextId()`/`save()` — rejeitada como solução definitiva (item 11.4).
5. Correção definitiva: `AuthSessionRepository` dividido em `create()`/`update()`, `id` vindo de `insertId` real (item 11.5, DT-15).
6. Exclusão imediata do screenshot com dado pessoal e mudança de prática para checagens programáticas (item 11.6).

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

- `drizzle-category-budget-repository.ts`, `drizzle-financial-entry-repository.ts` e `drizzle-monthly-period-repository.ts` compartilham o mesmo padrão de geração de `id` corrigido em `auth_sessions` (`information_schema.TABLES.AUTO_INCREMENT` + `save()` único insere-ou-atualiza) — os próprios comentários originais desses arquivos já reconheciam o risco. Risco menor que o de sessões (ação deliberada do usuário, exceto `ensurePeriod`, que roda a cada carga do Dashboard), mas real. Correção registrada em DT-15, sugerida como bloco futuro dedicado.

### P3 — Melhoria Recomendada

- Limpeza periódica de sessões expiradas não implementada (`auth_sessions` cresce indefinidamente).
- Recuperação de senha, MFA, permissões granulares por papel — próximos passos naturais do roadmap, não pendências deste bloco.

### P4 — Opcional

- Deploy seguro/produção — fora de escopo, API continua estritamente local.

## 14. Riscos Restantes

Nenhum risco novo além da dívida técnica P2 já registrada (seção 13) e dos itens já documentados em DT-14 (sem MFA/recuperação de senha, sem limpeza automática de sessões). A API continua inacessível fora de `127.0.0.1` e recusa `runtimeMode: 'production'`.

## 15. Evidências

- Migration aplicada: `0003_auth_sessions.sql`, journal com 4 migrations registradas (era 3).
- Auditoria pós-migration: `Tabelas da aplicação presentes: 8/8`, `auth_sessions: vazia (esperado)`, `usuários com senha configurada: 0 (esperado — script de senhas é separado)`.
- Senhas iniciais configuradas: `owner: sim · partner: sim · total: 2`.
- Smoke-test final: `Ambas as sessões válidas simultaneamente: aprovado`, `As duas sessões têm ids diferentes no repositório real: aprovado`, `Primeira sessão inválida (401) e segunda ainda válida (200) após logout seletivo: aprovado`, `Ambas as sessões aparecem revogadas no repositório real: aprovado`, `Contagens finais: idênticas às iniciais em todas as tabelas`.
- Validação no navegador (dois `BrowserContext`, mesma conta real): login 200/200, ambas válidas simultaneamente (200/200), sessão A válida após login de B, sessão B válida após logout de A, ambas retornando ao login após seu próprio logout, reload após logout permanecendo no login.
- 1047 testes aprovados (550 API / 344 web / 153 domain); `ddae-engine audit`: 0 P1/P2.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo

## 17. Próximo Bloco Recomendado

Bloco dedicado à correção do mesmo padrão de geração de `id` (`AUTO_INCREMENT` nativo via `insertId`, porta dividida em `create()`/`update()`) nos três repositórios registrados como dívida P2 (`category_budgets`, `financial_entries`, `monthly_periods`) — aplicando exatamente a estratégia validada neste bloco para `auth_sessions`.

## 18. Commit Semântico Sugerido

```
feat(auth): concluir autenticação e sessões domésticas
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
