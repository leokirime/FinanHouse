# Feedback — Bloco 16: API HTTP financeira v1

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-08-01

## 1. Resumo Executivo

Implementada a camada HTTP da API do FinanHouse (Fastify 5.11.0), conectando os serviços de aplicação e os repositórios Drizzle reais do Bloco 14. 21 rotas sob `/api/v1/households/:householdId/...` cobrem categorias, membros, competências mensais e movimentações (incluindo suas transições de estado), todas reaproveitando os serviços de aplicação já existentes — nenhuma regra de domínio duplicada em handler. Durante a implementação, foi encontrado e corrigido um comportamento real do Fastify (`removeAdditional: true` por padrão no AJV, que removeria silenciosamente campos desconhecidos do corpo em vez de rejeitá-los) e reforçado o teste de ausência de efeitos colaterais na importação com mocks/spies comportamentais. Entre o checkpoint e a autorização, duas correções visuais retrospectivas do Bloco 15 foram incorporadas ao trabalho (posição da logo do hero corrigida de direita para esquerda; logo institucional adicionada à navegação lateral) — documentadas separadamente, sem reabrir o Bloco 15. O smoke-test HTTP transacional foi aprovado em todos os passos na primeira execução real contra `finanhouse_dev`, com rollback confirmado e zero dado residual. RF-05 avança (infraestrutura + schema + repositórios + API HTTP concluídos) mas não é declarado concluído — integração do frontend e autenticação real continuam pendentes.

## 2. Objetivo do Bloco

Criar a camada HTTP da API do FinanHouse, conectando os serviços de aplicação e os repositórios Drizzle reais implementados no Bloco 14 — uma API local testável para competências, movimentações, categorias e membros do household, sem integrar o frontend nem implementar autenticação real.

## 3. Escopo Implementado

- Fastify 5.11.0 como camada HTTP (`apps/api/src/http/`): `app.ts` (fábrica pura `createHttpApp`), `server.ts` (bootstrap runtime), `routes/`, `schemas/`, `mappers/`, `errors/`, `plugins/cors.ts`, `test-support/`.
- 21 rotas: infraestrutura (`/health`, `/ready`), categorias/membros (somente leitura), competências (listar, buscar, criar/idempotente, 4 ações de transição), movimentações (listar, buscar, criar, atualizar, 6 ações de transição).
- Isolamento por household em toda rota financeira; DTOs explícitos nunca expõem a coluna auxiliar do membro responsável (DT-09).
- Handler central de erros mapeando `DomainError`/`PersistenceError`/validação para status HTTP e formato `{ error: { code, message } }` sanitizado.
- Bind local (`127.0.0.1`), CORS restrito, recusa de `runtimeMode: 'production'`.
- Script de smoke-test transacional (`db-smoke-http.ts`, `db:smoke:http`).
- Duas correções visuais retrospectivas do Bloco 15 (fora do escopo original deste bloco, mas incorporadas a pedido explícito do proprietário antes da autorização do smoke): posição da logo do hero (direita → esquerda) e adição da marca institucional na sidebar.
- Documentação: DT-11, `Docs/03_contracts/contrato_api_http.md`, RF-05, READMEs.

## 4. Arquivos Criados

- `apps/api/src/http/app.ts`, `server.ts`, `server.test.ts`, `app.test.ts`
- `apps/api/src/http/routes/{health,ready,categories,members,periods,entries}.ts` (+ `.test.ts` de categories/members/periods/entries)
- `apps/api/src/http/schemas/{common,entry-schemas,period-schemas}.ts` (+ `common.test.ts`)
- `apps/api/src/http/mappers/{financial-entry-dto,monthly-period-dto,category-dto,household-member-dto}.ts`
- `apps/api/src/http/errors/{http-error,error-handler}.ts`
- `apps/api/src/http/plugins/cors.ts`
- `apps/api/src/http/test-support/build-test-app.ts`
- `apps/api/scripts/db-smoke-http.ts`
- `Docs/03_contracts/contrato_api_http.md`

## 5. Arquivos Alterados

- `apps/api/src/index.ts` (aponta para `http/server.ts`)
- `apps/api/package.json`, `package.json` (raiz) — dependência `fastify`, script `db:smoke:http`
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-11), `Docs/01_product/requisitos_funcionais.md` (RF-05)
- `README.md`, `apps/api/README.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`, `05_blocks/bloco_16_...md`, `06_prompts/prompt_bloco_16_...md`

Correção retrospectiva do Bloco 15 (arquivos separados, documentados em seção própria do feedback do Bloco 15):

- `apps/web/src/components/dashboard/HeroBrand.css`, `HeroBrand.test.tsx`
- `apps/web/src/components/brand/Brand.tsx`, `Brand.css`, `Brand.test.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`, `Sidebar.css`, `Sidebar.test.tsx`
- `apps/web/src/App.test.tsx`
- `Docs/07_design_system/identidade_visual.md`, `tokens_design.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_15_...md`, `06_prompts/prompt_bloco_15_...md`, `08_feedbacks/feedback_bloco_15_...md`

## 6. Arquivos Removidos

- `apps/api/src/server.ts` (servidor `node:http` puro, substituído pela camada Fastify)

## 7. Comandos Executados

```
git switch -c feat/session-11-bloco-16-api-http-financeira
npx ddae-engine block create "API HTTP financeira v1" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_16_api_http_financeira_v1 --session session_11_fundacao_do_finanhouse
npm install (fastify)
npm run build / verify:runtime / lint / typecheck / typecheck:api-scripts / test
npx drizzle-kit check
npx ddae-engine validate / audit
npm audit --omit=dev / npm audit
npm run db:check
npm run db:audit:schema -- --phase=after
npm run db:audit:responsible-member -- --phase=after
CONFIRM_HTTP_SMOKE=true npm run db:smoke:http   (1 execução, aprovada)
npx ddae-engine feedback create --block bloco_16_api_http_financeira_v1 --session session_11_fundacao_do_finanhouse
```

## 8. Testes Realizados

- 77 testes adicionados no conjunto do trabalho: 64 na API e 13 no frontend, elevando o total de 661 para 738.
- API (64 novos, 254 → 318; inclui os 3 testes comportamentais de `server.test.ts` com mocks/spies + importação dinâmica): `app.test.ts`, `server.test.ts`, `routes/*.test.ts`, `schemas/common.test.ts` — criação sem efeitos colaterais, recusa de `production`, `/health`/`/ready` (com dependência falsa), CORS (origem permitida/negada/preflight), IDs válidos/inválidos, isolamento por household em leitura e escrita, dinheiro como string (número JSON rejeitado), datas/enums inválidos, campos desconhecidos rejeitados (incluindo confirmação de que nada é salvo), CRUD completo de competências e movimentações, todas as transições de estado, erro de domínio/conflito de escopo sanitizado (não 500), erro de conexão (503) e erro inesperado (500) sanitizados, ausência da coluna auxiliar nos DTOs.
- Web (13 novos, 254 → 267) da correção retrospectiva do Bloco 15: 7 em `HeroBrand.test.tsx`, 6 em `Brand.test.tsx` (+2) e `Sidebar.test.tsx` (+4), mais reescrita de 1 teste existente em `App.test.tsx` (não contabilizado como novo).
- Domain: inalterado, 153 testes.
- Suíte completa: 738 testes (318 api / 267 web / 153 domain), todos verdes.
- Smoke-test transacional real contra `finanhouse_dev` (`db-smoke-http.ts`): `GET /health`, criação idempotente de competência via `PUT`, criação de movimentação (com e sem responsável, dinheiro como string confirmado), leitura após escrita, rejeição de responsável de outro household via HTTP (409), isolamento de leitura entre households, transição de estado (`mark-pending`) — todos aprovados na única execução realizada; rollback intencional confirmado; zero dado residual.

## 9. Validações Executadas

- `ddae-engine validate`: OK, 0 warnings/erros.
- `ddae-engine audit`: OK, apenas os 7 quality gates pendentes (mais o feedback deste bloco, resolvido por este próprio documento) — 0 pendências P1/P2.
- `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts` / `test`: todos aprovados.
- `npx drizzle-kit check`: sem divergências.
- `npm audit --omit=dev`: 0 vulnerabilidades. `npm audit`: 4 moderadas, dev-only, já documentadas.
- `npm ls`: `fastify@5.11.0`, `react-router@8.3.0`, `react-router-dom` ausente, `mysql2`/`drizzle-orm`/`drizzle-kit` preservados.

## 10. Decisões Técnicas

Registradas em `Docs/02_architecture/decisoes_tecnicas.md`, DT-11 — adoção do Fastify, estrutura da camada HTTP, política de segurança local (sem autenticação), e a correção real do `removeAdditional` do AJV.

## 11. Problemas Encontrados

1. **`removeAdditional: true` (padrão do Fastify/AJV):** campos desconhecidos no corpo — incluindo um `householdId` concorrente tentando contornar o escopo da URL — eram removidos silenciosamente em vez de rejeitados, apesar de `additionalProperties: false` nos schemas. Confirmado por teste isolado (script `tsx` descartável) antes de qualquer suposição. Corrigido com `ajv.customOptions.removeAdditional: false` na criação da instância Fastify (`app.ts`), validado por testes reais via `app.inject()`.
2. **Falta o script `db:smoke:http` no `package.json` raiz** (só havia sido adicionado em `apps/api/package.json`) — a primeira tentativa, `CONFIRM_HTTP_SMOKE=true npm run db:smoke:http` na raiz após a autorização, falhou com "Missing script: db:smoke:http"; nenhuma conexão transacional ou escrita foi iniciada nessa tentativa (falha puramente de wiring do npm, anterior a qualquer conexão com o banco). O wrapper `"db:smoke:http": "npm run db:smoke:http --workspace=api"` foi adicionado ao `package.json` raiz sem alterar o comportamento do script já revisado no checkpoint. Depois disso ocorreu uma única execução real do smoke, aprovada em todos os passos, com rollback confirmado e zero dado residual (detalhada na seção 8).

## 12. Correções Aplicadas Durante o Bloco

1. `ajv.customOptions.removeAdditional: false` (item 11.1), com testes de regressão via `app.inject()` confirmando rejeição de campo desconhecido e ausência de efeito colateral (nenhum dado salvo).
2. Reforço do teste de ausência de efeitos colaterais na importação: substituída/complementada a checagem estática (leitura de texto-fonte) por um teste comportamental (`server.test.ts`) com mocks/spies (`process.loadEnvFile`, `createDatabasePool`, `createHttpApp`) e importação dinâmica.
3. Correção retrospectiva do Bloco 15 incorporada (posição da logo do hero; adição da marca institucional na sidebar) — a pedido explícito do proprietário, antes da autorização do smoke. Detalhada na seção 19 do feedback do Bloco 15; não repetida aqui para não duplicar a mesma informação em dois documentos.
4. `db:smoke:http` ausente no `package.json` raiz (item 11.2) — adicionado antes da execução real do smoke.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._

### P3 — Melhoria Recomendada

- Integração do frontend com esta API e implementação de autenticação real — próximos passos naturais do roadmap (RF-05), não pendências deste bloco.
- `nextId()` (herdado do Bloco 14, agora também exposto via HTTP) não é atômico sob concorrência real — já documentado no código; reavaliar caso o projeto precise de múltiplos escritores simultâneos.

### P4 — Opcional

- Sem porta/repositório para `users`/`households`, a API não pode criar essas entidades — se um bloco futuro precisar disso, será necessária uma decisão arquitetural própria (nova porta ou endpoint administrativo separado).

## 14. Riscos Restantes

Nenhum risco novo além dos já documentados (DT-10, DT-11). A API continua inacessível fora de `127.0.0.1` e recusa `production` — sem autenticação, não deve ser exposta em nenhuma rede além da máquina local.

## 15. Evidências

- Saída do smoke-test HTTP aprovado: todos os passos "aprovado"/"sim (esperado)", `Rollback intencional executado com sucesso — nenhum dado deve ter persistido.`, `Contagens finais: idênticas às iniciais (nenhum dado residual).`
- `db:audit:schema -- --phase=after` e `db:audit:responsible-member -- --phase=after` aprovados antes e depois do smoke, com as mesmas seis tabelas, duas migrations, zero registros, FK `RESTRICT` e `CHECK` presentes.
- `ddae-engine audit`: 0 pendências P1/P2 antes e depois deste bloco.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo

## 17. Próximo Bloco Recomendado

Bloco 17 (não criado nesta sessão) — integração do frontend com a API HTTP implementada aqui, e/ou implementação de autenticação real, como próximos passos de RF-05.

## 18. Commit Semântico Sugerido

```
feat(api): implementar API HTTP financeira v1
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
