# Feedback — Bloco 01: Arquitetura HTTP e desbloqueio seguro do runtime de produção

> Sessão: 14 (preparacao_de_producao_e_deploy_housemanager) · Projeto: FinanHouse · Atualizado em: 2026-08-28

## 1. Resumo Executivo

Este bloco removeu os três bloqueadores de código identificados na auditoria de deploy realizada logo após o encerramento da Session 12: a recusa incondicional de `createHttpApp` a `runtimeMode: 'production'`, o bind HTTP hardcoded em `127.0.0.1`, e a lista de origens CORS hardcoded para as URLs do Vite. Nenhum dos três era um bug — todos eram guardas deliberados de uma sessão anterior, colocados exatamente para impedir um deploy sem que essas lacunas fossem resolvidas de verdade. Este bloco resolve as lacunas em vez de remover as guardas.

A recusa incondicional de produção foi substituída por uma validação real de pré-condições (`assertOriginsSafeForProduction`), que falha fechado: em produção, a aplicação só é construída se as origens de CORS estiverem explicitamente configuradas e nenhuma apontar para localhost/127.0.0.1. O mesmo padrão fail-closed foi aplicado ao bind de host via `HTTP_HOST`. Fora de produção (development/test), o comportamento observável é idêntico ao anterior — confirmado pelos testes existentes de `server.ts` continuando verdes sem nenhuma mudança de expectativa.

Também foi preparado o fallback de SPA para a Vercel (`apps/web/vercel.json`), com um rewrite que nunca captura `/api/*` — sem configurar o proxy real da API, que depende de um host ainda não escolhido. Nenhuma escolha de infraestrutura foi feita nesta rodada.

Suíte final: API 699 (+31), Web 467 (+4), Domain 214 (inalterado), Total 1380 — nenhuma suíte encolheu, nenhum teste anterior foi enfraquecido (os que esperavam a recusa incondicional de produção foram reescritos para provar a nova política segura, não removidos). **Classificação final: API_READY_FOR_PERSISTENT_NODE_HOST.** Nenhum commit, push ou merge foi realizado.

## 2. Objetivo do Bloco

Remover os bloqueadores de código que causaram o NO-GO da auditoria de deploy pós-Sessão 12 (portão de produção, bind de host, CORS), substituindo a recusa incondicional de `runtimeMode: 'production'` por uma validação real de pré-condições que falha fechado.

## 3. Escopo Implementado

Igual ao planejado, sem divergência:

- `config/cors-config.ts`/`config/http-bind-config.ts` novos, com fail closed em produção.
- `plugins/cors.ts`/`http/app.ts`/`http/server.ts` atualizados para usar os novos módulos de configuração.
- Portão de produção substituído por validação real de pré-condições.
- `apps/web/vercel.json` — fallback de SPA, sem proxy de API.
- `.env.example` documentado com as duas novas variáveis.
- Testes test-first para toda a nova superfície; testes existentes atualizados (não enfraquecidos).

## 4. Arquivos Criados

- `apps/api/src/config/cors-config.ts`
- `apps/api/src/config/cors-config.test.ts`
- `apps/api/src/config/http-bind-config.ts`
- `apps/api/src/config/http-bind-config.test.ts`
- `apps/web/vercel.json`
- `apps/web/vercel.config.test.ts`
- Este feedback, o bloco e o prompt do Bloco 01 (`05_blocks/`, `06_prompts/`).

## 5. Arquivos Alterados

- `apps/api/src/http/plugins/cors.ts` — `registerCorsPlugin(fastify, allowedOrigins)` recebe as origens por parâmetro; nenhuma constante hardcoded no módulo.
- `apps/api/src/http/app.ts` — `CreateHttpAppOptions.corsAllowedOrigins?: string[]` (opcional); a recusa incondicional de `runtimeMode: 'production'` virou `assertOriginsSafeForProduction(corsAllowedOrigins)`, chamada só em produção.
- `apps/api/src/http/server.ts` — `bindHost`/`corsAllowedOrigins` resolvidos do `process.env` real antes de `resolveDatabaseConfig`/qualquer conexão de banco; `LOCAL_HOST` fixo removido, `app.listen({port, host: bindHost})`.
- `apps/api/src/http/app.test.ts` — o teste de recusa incondicional virou uma `describe` com 4 casos de fail-closed + build válido, +1 teste de invariante do cookie (`Secure` sempre `true` em produção), +1 teste de ponta a ponta de `corsAllowedOrigins` customizada; o teste estático que travava o bind em `127.0.0.1` foi substituído por dois testes que provam a delegação correta aos novos módulos.
- `apps/api/src/http/server.test.ts` — +3 testes comportamentais de ponta a ponta (produção sem config → nunca cria a app; produção com `HTTP_HOST=127.0.0.1` → rejeita mesmo com CORS válido; produção com config válida → escuta no host configurado).
- `.env.example` (raiz) — `HTTP_HOST`, `PORT`, `CORS_ALLOWED_ORIGINS` documentadas, sem valor sensível.

## 6. Arquivos Removidos

- Nenhum.

## 7. Comandos Executados

```
npm install (worktree novo)
npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run typecheck:api-scripts
npm run test (por workspace)
npx drizzle-kit check
npx ddae-engine validate
npx ddae-engine audit
npx vitest run <arquivos individuais, durante o desenvolvimento test-first>
```

## 8. Testes Realizados

Todos automatizados (vitest), test-first em cada módulo novo:

- **`cors-config.test.ts`** (14 testes): dev/test sem env → origens do Vite; dev/test com env → origens fornecidas (múltiplas, com espaços); origem mal formada/com path rejeitada mesmo fora de produção; produção sem env → rejeita; produção com env em branco → rejeita; produção com origem localhost/127.0.0.1 → rejeita; produção com origem pública válida → aceita; mistura de origem válida + localhost → rejeita; `assertOriginsSafeForProduction` isolado (lista vazia, localhost, válida).
- **`http-bind-config.test.ts`** (8 testes): dev/test sem env → `127.0.0.1`; dev/test com env → valor configurado; produção sem env → rejeita; produção com `127.0.0.1`/`localhost` → rejeita; produção com `0.0.0.0`/host real → aceita; produção com env em branco → rejeita.
- **`app.test.ts`** (+6 testes): produção sem CORS → rejeita (mensagem menciona "CORS"); produção com CORS vazia → rejeita; produção com origem localhost → rejeita (mensagem menciona "localhost"); produção com origem pública válida → constrói sem lançar; cookie `Secure` sempre `true` em produção; `corsAllowedOrigins` customizada respeitada de ponta a ponta via `app.inject()` (origem configurada recebe o cabeçalho, origem local deixa de receber).
- **`server.test.ts`** (+3 testes): produção sem `HTTP_HOST`/`CORS_ALLOWED_ORIGINS` → nunca chega a criar a app HTTP, `process.exit(1)`, mensagem contém "Configuração inválida"; produção com `HTTP_HOST=127.0.0.1` (mesmo com CORS válido) → rejeita antes de qualquer conexão de banco; produção com ambas configuradas corretamente → escuta no host configurado (`0.0.0.0` no teste), sem `process.exit`.
- **`vercel.config.test.ts`** (4 testes): arquivo existe e é JSON válido; tem rewrite de fallback para `/index.html`; o fallback nunca captura `/api/*` (testado com regex ancorada reproduzindo a semântica de matching do Vercel); nenhum rewrite aponta para localhost/127.0.0.1.

Todos os testes passaram após a implementação correspondente — nenhuma iteração de correção de lógica foi necessária, apenas dois ajustes de teste (seção 12).

## 9. Validações Executadas

- `npm run build` — OK.
- `npm run verify:runtime` — OK.
- `npm run lint` — OK (oxlint, sem avisos).
- `npm run typecheck` — OK.
- `npm run typecheck:api-scripts` — OK.
- `npm run test` — OK: **API 699/699** (668 + 31 novos), **Web 467/467** (463 + 4 novos), **Domain 214/214** (inalterado). Nenhuma suíte encolheu.
- `npx drizzle-kit check` — "Everything's fine" — nenhuma migration tocada.
- `npx ddae-engine validate` — Status OK, 0 warnings, 0 errors.
- `npx ddae-engine audit` — Status OK, 0 errors, 0 pendências P1/P2, 9 warnings nesta execução (8 estruturais já conhecidos + "Bloco 01 sem feedback correspondente", que desaparece assim que este arquivo for detectado na próxima auditoria).

Revisão de segurança: nenhuma mensagem de erro nova expõe segredo/credencial/connection string (ecoa só o valor de host/origem que o próprio operador configurou); CORS nunca aceita `*` combinado com `credentials`; cookie de sessão preservado sem nenhuma alteração de código. Nenhuma migration, nenhum acesso ao Aiven, nenhum dado real.

## 10. Decisões Técnicas

- **Defesa em profundidade: `assertOriginsSafeForProduction` chamada tanto dentro de `resolveCorsAllowedOrigins` (produção, via env) quanto diretamente em `createHttpApp` (independente de como as origens chegaram)** — garante que mesmo uma chamada direta de `createHttpApp` com `runtimeMode: 'production'` (ex.: um teste ou script futuro) nunca construa a aplicação com CORS aberto/local, mesmo que bypasse a resolução via `server.ts`.
- **`corsAllowedOrigins` opcional em `CreateHttpAppOptions`, com default para as origens do Vite fora de produção** — preserva 100% de compatibilidade com todos os call sites de teste existentes (`buildTestApp`, chamadas diretas com `runtimeMode: 'development'`/`'test'`), sem exigir nenhuma migração de teste não relacionada a este bloco.
- **Resolução de bind/CORS acontece em `server.ts`, antes de `resolveDatabaseConfig`** — uma configuração HTTP inválida falha antes de gastar uma tentativa de conexão com o Aiven, mesmo padrão de "falhar o mais cedo possível" já usado pelo restante do arquivo.
- **Cookie de sessão preservado sem nenhuma alteração** — a topologia same-origin-via-proxy (browser → frontend público → `/api/*` → reverse proxy → API) torna a configuração atual (`HttpOnly`, `Secure` em produção, `SameSite=Lax`, sem `Domain`) suficiente por construção: do ponto de vista do navegador, página e API compartilham a mesma origem pública. Mudar para `SameSite=None` ou adicionar um `Domain` arbitrário teria sido uma gambiarra desnecessária, explicitamente evitada por instrução do usuário.
- **`vercel.json` sem proxy real de `/api/*`** — configurar um destino ainda não decidido criaria uma configuração enganosa (pareceria pronta para deploy sem estar). O fallback de SPA sozinho já é seguro: uma chamada a `/api/*` sem proxy configurado simplesmente falha visivelmente (404), nunca é mascarada como um 200 de HTML.

Nenhuma decisão acima introduz dependência nova; nenhuma foi registrada em `Docs/04_governance/registro_decisoes.md` por não alterar contrato de domínio/arquitetura de dados.

## 11. Problemas Encontrados

Nenhuma regressão. Dois ajustes triviais durante o desenvolvimento test-first, descritos na seção 12.

## 12. Correções Aplicadas Durante o Bloco

- O primeiro rascunho de `vercel.config.test.ts` testava o padrão de rewrite com `new RegExp(fallback.source)` sem âncoras (`^`/`$`), o que produzia falso positivo para `/api/...` (o motor de regex encontrava um match a partir de uma posição no meio da string). Corrigido ancorando a regex reconstruída (`^${source}$`) e testando com o caminho completo, incluindo a barra inicial (`/api/v1/health`, `/movimentacoes`) — reproduzindo fielmente como o Vercel casa `source` contra o caminho inteiro. Erro de teste, sem impacto no `vercel.json` real (que já estava correto).
- Nenhuma correção de código de produção foi necessária em nenhum dos módulos novos — cada implementação passou nos testes já escritos na primeira tentativa.

## 13. Pendências

### P1 — Crítica

_Nenhuma._

### P2 — Importante

_Nenhuma._

### P3 — Melhoria Recomendada

_Nenhuma nova identificada nesta rodada._

### P4 — Opcional / Evolução Futura (ações de infraestrutura, não bloqueadores de código)

_Escolha e provisionamento do host Node persistente para a API (Railway/Render/Fly/VPS/etc.) — decisão de infraestrutura, deliberadamente não tomada nesta rodada._

_Provisionamento de `finanhouse_prod` no Aiven — já exigido estruturalmente por `assertDatabaseNameAllowed` (Sessão 12), mas o banco em si ainda não existe. Nenhum acesso ao Aiven foi feito nesta rodada._

_Confirmação de backup/retenção do plano Aiven — não documentado no repositório, precisa ser confirmado manualmente no console do provedor._

_Domínio/DNS público — não configurado._

_Proxy real de `/api/*` na Vercel (`apps/web/vercel.json`) — depende do host da API escolhido acima; hoje uma chamada a `/api/*` no deploy estático da Vercel falha visivelmente (404), o que é o comportamento seguro esperado até a próxima etapa._

## 14. Riscos Restantes

Nenhum risco técnico novo. O risco que motivou a criação desta sessão (deploy prematuro sem validação de pré-condições de produção) foi diretamente endereçado: a aplicação agora recusa ativamente iniciar em produção sem uma configuração explícita e segura — o oposto de um "silenciosamente funciona errado".

## 15. Evidências

Contagem de testes por arquivo (novos/alterados nesta rodada):
- `cors-config.test.ts`: 14 (novo)
- `http-bind-config.test.ts`: 8 (novo)
- `app.test.ts`: 23 (17 + 6)
- `server.test.ts`: 9 (6 + 3)
- `vercel.config.test.ts`: 4 (novo)

Totais por workspace:
- API: 699/699 passando (668 + 31 novos).
- Web: 467/467 passando (463 + 4 novos).
- Domain: 214/214 passando (inalterado).
- Total do monorepo: **1380** (1345 + 35).

`npx drizzle-kit check`: `Everything's fine 🐶🔥`.
`npx ddae-engine validate`: `Status: OK / Warnings: 0 / Errors: 0`.
`npx ddae-engine audit`: `Status: OK / Errors: 0 / Pendências P1/P2: Nenhuma pendência P1/P2 encontrada.` (9 warnings nesta execução — 8 estruturais + "Bloco 01 sem feedback", ver seção 9).

**Classificação final: `API_READY_FOR_PERSISTENT_NODE_HOST`.**

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

Tecnicamente concluído. Nenhuma pendência P1/P2/P3 — só P4/ações de infraestrutura, todas explicitamente fora do escopo deste bloco por decisão do usuário. **Aguardando nova aprovação humana explícita antes de qualquer commit/push/merge.**

## 17. Próximo Bloco Recomendado

Um bloco dedicado à escolha e provisionamento do host Node persistente para a API, seguido de um bloco para o proxy real `/api/*` na Vercel e a configuração de `CORS_ALLOWED_ORIGINS`/`HTTP_HOST` reais — ambos dependentes de decisões de infraestrutura externas a este repositório.

## 18. Commit Semântico Sugerido

```
feat(http): desbloquear runtime de producao com validacao real de pre-condicoes
```

_Aguardando aprovação explícita do usuário antes de `git add`/`commit`/`push`/`merge` — nenhuma ação de versionamento foi executada nesta rodada._
