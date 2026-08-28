# Bloco 01 — Arquitetura HTTP e desbloqueio seguro do runtime de produção

> Sessão: 14 (preparacao_de_producao_e_deploy_housemanager) · Projeto: FinanHouse · Atualizado em: 2026-08-28

## 1. Objetivo

Remover os bloqueadores de código que causaram o NO-GO da auditoria de deploy pós-Sessão 12 (portão de produção, bind de host, CORS), substituindo a recusa incondicional de `runtimeMode: 'production'` por uma validação real de pré-condições que falha fechado.

## 2. Contexto

A Session 12 (parcelamentos) foi encerrada com sucesso (`Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/09_validation/fechamento_sessao.md`). Uma auditoria de deploy realizada em seguida concluiu **NO-GO**, exclusivamente por bloqueadores de arquitetura HTTP/runtime — nunca por regra financeira ou qualidade de código. Esta sessão existe especificamente para remediar esses bloqueadores, sem misturar com parcelamentos.

## 3. Problema que Este Bloco Resolve

`createHttpApp` (`apps/api/src/http/app.ts`) recusava incondicionalmente `runtimeMode: 'production'`, o bind HTTP era hardcoded em `127.0.0.1` (`http/server.ts`) e a lista de origens CORS era hardcoded para as URLs do Vite (`http/plugins/cors.ts`) — juntos, tornavam literalmente impossível rodar a API fora de uma máquina de desenvolvimento local, mesmo com toda a infraestrutura de autenticação/autorização já madura desde o Bloco 19 da Sessão 11.

## 4. Escopo

- Tornar o host de bind da API configurável por ambiente, com fail closed em produção (nunca aceitar `127.0.0.1`/`localhost`).
- Tornar as origens de CORS configuráveis por ambiente, com fail closed em produção (nunca vazio, nunca localhost).
- Substituir a recusa incondicional de `runtimeMode: 'production'` por uma validação real de pré-condições (`assertOriginsSafeForProduction`).
- Preparar o fallback de SPA para a Vercel (`apps/web/vercel.json`), sem configurar o proxy real de `/api/*` (depende de um host ainda não escolhido).
- Documentar as duas novas variáveis de ambiente em `.env.example`.
- Testes cobrindo toda a nova superfície (test-first).

## 5. Fora de Escopo

- Escolha do provedor de host Node (Railway/Render/Fly/VPS/etc.) — decisão de infraestrutura, não de código.
- Provisionamento de `finanhouse_prod` no Aiven, backup/retenção, domínio/DNS — ações manuais fora deste bloco.
- Proxy real de `/api/*` na Vercel — depende do host escolhido.
- Qualquer alteração em `SameSite`/`Domain` do cookie de sessão — a topologia same-origin-via-proxy já torna a configuração atual (`HttpOnly`, `Secure` em produção, `SameSite=Lax`, sem `Domain`) suficiente, sem gambiarra.
- Conversão da API para serverless — o modelo Fastify + pool `mysql2` persistente é preservado.
- Deploy real, acesso ao Aiven, migration, dado real.

## 6. Arquivos e Pastas Envolvidos

- `apps/api/src/config/cors-config.ts` (novo), `cors-config.test.ts` (novo).
- `apps/api/src/config/http-bind-config.ts` (novo), `http-bind-config.test.ts` (novo).
- `apps/api/src/http/plugins/cors.ts` (assinatura alterada).
- `apps/api/src/http/app.ts` (portão de produção substituído).
- `apps/api/src/http/server.ts` (bind/CORS resolvidos do ambiente).
- `apps/api/src/http/app.test.ts`, `server.test.ts` (atualizados/estendidos).
- `apps/web/vercel.json` (novo), `vercel.config.test.ts` (novo).
- `.env.example` (raiz) — duas novas variáveis documentadas.

## 7. Dependências

- Session 12 encerrada e integrada na `main` (`715422dc273ef482908b4c328515fa4389239c4f`).
- Auditoria de deploy pós-Sessão 12 (achados: portão de produção, bind, CORS, SPA sem fallback).

## 8. Plano de Implementação

1. Escrever os testes de `resolveCorsAllowedOrigins`/`assertOriginsSafeForProduction` (test-first) — confirmar que falham por módulo inexistente.
2. Implementar `config/cors-config.ts`.
3. Escrever os testes de `resolveBindHost` (test-first) — confirmar falha.
4. Implementar `config/http-bind-config.ts`.
5. Atualizar `plugins/cors.ts` para receber as origens por parâmetro.
6. Atualizar `app.ts`: `corsAllowedOrigins` opcional, portão de produção via `assertOriginsSafeForProduction`.
7. Atualizar `server.ts`: resolver `bindHost`/`corsAllowedOrigins` do ambiente antes de qualquer conexão de banco, fail closed.
8. Atualizar os testes existentes que assumiam a recusa incondicional de produção e o bind hardcoded (`app.test.ts`, `server.test.ts`) para provar a nova política.
9. Preparar `apps/web/vercel.json` (fallback de SPA, sem proxy de API) com teste.
10. Documentar `HTTP_HOST`/`CORS_ALLOWED_ORIGINS`/`PORT` em `.env.example`.
11. Rodar a suíte completa e todas as validações obrigatórias.
12. Documentar evidência e criar o feedback — sem versionar.

## 9. Critérios de Aceite

- [x] `createHttpApp` constrói normalmente em produção com configuração válida.
- [x] `createHttpApp` falha fechado em produção sem `corsAllowedOrigins`, com lista vazia, ou com origem localhost.
- [x] Bind de host configurável, fail closed em produção sem `HTTP_HOST` ou com `127.0.0.1`/`localhost`.
- [x] CORS configurável, fail closed em produção nas mesmas condições.
- [x] Nenhuma suíte de teste anterior enfraquecida — as que esperavam a recusa incondicional foram atualizadas para provar a nova política.
- [x] Cookie de sessão preservado sem alteração (`Secure` continua garantido em produção — testado).
- [x] Modelo Fastify + pool `mysql2` persistente preservado — nenhuma conversão para serverless.
- [x] `apps/web/vercel.json` com fallback de SPA que nunca captura `/api/*`.
- [x] Nenhuma migration, nenhum acesso ao Aiven, nenhum dado real.

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

Revisão dedicada: nenhuma mensagem de erro nova expõe segredo/credencial (ecoa apenas o valor de host/origem que o próprio operador configurou); CORS nunca aceita `*` combinado com `credentials`; cookie de sessão preservado sem enfraquecimento; nenhuma rota nova, nenhuma superfície de autenticação alterada.

## 12. Performance

Não aplicável — validação de configuração é síncrona e ocorre uma única vez no startup, antes de qualquer conexão de banco.

## 13. Design System / UX

Não aplicável — nenhuma tela alterada.

## 14. Riscos

- Risco de regressão em desenvolvimento: mitigado — os defaults de `resolveBindHost`/`resolveCorsAllowedOrigins` fora de produção reproduzem exatamente o comportamento anterior (`127.0.0.1`, origens do Vite), confirmado pelos testes existentes de `server.ts` continuando verdes sem alteração de expectativa.
- Risco de over-engineering: mitigado — nenhuma escolha de provedor, nenhuma migration, nenhuma conversão de arquitetura; escopo estritamente limitado aos três bloqueadores de código identificados na auditoria.

## 15. Pendências Esperadas

- P4 (evolução futura, fora deste bloco): escolha do host Node, provisionamento de `finanhouse_prod`, backup/retenção, domínio/DNS, proxy real de `/api/*` na Vercel — todos dependem de decisões de infraestrutura tratadas em blocos futuros desta mesma sessão.

## 16. Feedback Obrigatório

Feedback gerado via `ddae-engine feedback create --block bloco_01_arquitetura_http_e_desbloqueio_seguro_do_runtime_de_producao --session session_14_preparacao_de_producao_e_deploy_housemanager` após todas as validações.

## 17. Commit Semântico Sugerido

```
feat(http): desbloquear runtime de producao com validacao real de pre-condicoes
```

---

## 18. Executado — Evidência

Todos os itens do plano (seção 8) foram executados na ordem descrita, test-first confirmado em cada novo módulo (`cors-config.test.ts`/`http-bind-config.test.ts`/`vercel.config.test.ts` falharam por módulo/arquivo inexistente antes da implementação correspondente). Nenhum item do "Fora de Escopo" (seção 5) foi tocado.

**`config/cors-config.ts`** (novo): `resolveCorsAllowedOrigins(env, runtimeMode)` — fora de produção, usa `CORS_ALLOWED_ORIGINS` se definida (validando formato) ou cai para as origens locais do Vite; em produção, exige a variável, rejeita vazio e rejeita qualquer origem localhost/127.0.0.1. `assertOriginsSafeForProduction(origins)` — gate de defesa em profundidade, reutilizado dentro de `createHttpApp` independente de como as origens chegaram até ali.

**`config/http-bind-config.ts`** (novo): `resolveBindHost(runtimeMode, env)` — mesmo padrão: `127.0.0.1` fora de produção quando `HTTP_HOST` não definido; em produção exige a variável e rejeita `127.0.0.1`/`localhost`.

**`http/plugins/cors.ts`**: `registerCorsPlugin(fastify, allowedOrigins)` — origens agora recebidas por parâmetro, nunca mais uma constante hardcoded no módulo.

**`http/app.ts`**: `CreateHttpAppOptions.corsAllowedOrigins?: string[]` (opcional — default para as origens do Vite fora de produção). A recusa incondicional de `runtimeMode: 'production'` foi substituída por `assertOriginsSafeForProduction(corsAllowedOrigins)`, chamada apenas quando `runtimeMode === 'production'` — falha fechado com a mesma mensagem clara de `cors-config.ts`, nunca um fallback silencioso.

**`http/server.ts`**: `bindHost`/`corsAllowedOrigins` resolvidos do `process.env` real (`resolveBindHost`/`resolveCorsAllowedOrigins`) **antes** de `resolveDatabaseConfig`/qualquer conexão — uma configuração HTTP inválida nunca gasta uma tentativa de conexão com o Aiven. `app.listen({port, host: bindHost})` substitui o `LOCAL_HOST` fixo removido.

**`apps/web/vercel.json`** (novo): um único rewrite (`/((?!api/).*)` → `/index.html`) — fallback de SPA que exclui explicitamente qualquer caminho `/api/*`, testado com casos negativos/positivos reais (`vercel.config.test.ts`). Nenhum proxy de API configurado — depende do host ainda não escolhido (registrado como P4, seção 15).

**`.env.example`**: `HTTP_HOST`, `PORT`, `CORS_ALLOWED_ORIGINS` documentadas, sem valor sensível, com a mesma convenção das variáveis de banco já existentes.

**Testes atualizados (não enfraquecidos, reescritos para provar a nova política):**
- `app.test.ts`: o teste que esperava recusa incondicional de produção virou uma `describe` com 4 casos (sem CORS → rejeita; CORS vazio → rejeita; origem localhost → rejeita; origem pública válida → constrói), + 1 teste de invariante do cookie (`Secure` sempre `true` em produção) + 1 teste de ponta a ponta confirmando que `corsAllowedOrigins` customizada é respeitada via `app.inject()`.
- `server.test.ts`: o teste estático que travava o bind em `127.0.0.1`/proibia ler `HTTP_HOST` foi substituído por dois testes que provam a delegação correta aos novos módulos de configuração; 3 novos testes comportamentais de ponta a ponta (produção sem config → nunca cria a app HTTP; produção com `HTTP_HOST=127.0.0.1` → rejeita mesmo com CORS válido; produção com config válida → escuta no host configurado).

**Cookie de sessão:** nenhuma alteração de código — `sessionCookieOptions()` continua `HttpOnly: true`, `Secure: runtimeMode !== 'development'`, `SameSite: 'lax'`, sem `Domain`. Isso é suficiente para a topologia same-origin-via-proxy adotada (seção 9 do prompt): do ponto de vista do navegador, a página e as chamadas a `/api/*` compartilham a mesma origem pública — o cookie host-only já funciona sem `SameSite=None` nem `Domain` arbitrário.

## 19. Executado — Resultado da Suíte e Validações

Baseline no início deste bloco (herdado de `origin/main` pós-Sessão 12): API 668, Web 463, Domain 214, Total 1345.

- API: 668 → **699** (+31: 14 `cors-config.test.ts`, 8 `http-bind-config.test.ts`, 6 `app.test.ts`, 3 `server.test.ts`).
- Web: 463 → **467** (+4: `vercel.config.test.ts`).
- Domain: 214 → 214 (inalterado — nenhuma regra financeira tocada).
- Total: 1345 → **1380**.

Todas as validações obrigatórias (seção 10) passaram limpas: `build`, `verify:runtime`, `lint`, `typecheck`, `typecheck:api-scripts`, `test` (as três suítes), `drizzle-kit check` ("Everything's fine" — nenhuma migration tocada), `ddae-engine validate` (0/0), `ddae-engine audit` (0 erros, 0 P1/P2, 9 warnings nesta execução — os 8 estruturais já conhecidos + "Bloco 01 sem feedback", que desaparece assim que o feedback for criado).

## 20. Executado — Classificação Final

**API_READY_FOR_PERSISTENT_NODE_HOST.** Os três bloqueadores de código (🔴) da auditoria de deploy foram eliminados:
- Portão de produção: recusa incondicional → validação real de pré-condições, fail closed.
- Bind de host: hardcoded `127.0.0.1` → configurável via `HTTP_HOST`, fail closed em produção.
- CORS: hardcoded para URLs do Vite → configurável via `CORS_ALLOWED_ORIGINS`, fail closed em produção.

Permanecem como 🟡 (ações externas, não bloqueadores de código, tratadas em blocos futuros desta sessão): escolha/provisionamento do host Node, `finanhouse_prod` no Aiven, backup/retenção, domínio/DNS, proxy real de `/api/*` na Vercel, deploy real.

**Nenhum commit, push ou merge foi realizado.** Aguardando nova aprovação explícita do usuário antes de versionar este bloco.
