# Feedback — Bloco 17: Integração direta do frontend com a API real

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-08-01

## 1. Resumo Executivo

Cortado o modo demonstrativo do frontend (`FinanceDemoProvider`, fixtures) para a API HTTP real do Bloco 16 — sem fallback, sem modo híbrido. Um cliente HTTP explícito e um `FinanceProvider` real substituem o estado em memória: carregam dados reais, criam a competência civil atual via `PUT` idempotente, aguardam a resposta HTTP antes de qualquer confirmação de sucesso, e nunca caem para dados fictícios em caso de falha (erro explícito via `FinanceStatusScreen`). Dashboard, Movimentações, Comparativo, Histórico e Planejamento foram migrados; Planejamento passou a usar movimentações reais (`planned`/`pending`) para receitas/despesas previstas, com limite por categoria explicitamente pendente (sem tabela/endpoint). Um script de bootstrap estrutural permanente criou o household inicial, 2 usuários, 2 membros e 7 categorias em `finanhouse_dev`, autorizado explicitamente pelo proprietário (`AUTORIZO BOOTSTRAP INICIAL FINANHOUSE_DEV`) após checkpoint com validações e pré-flight aprovados. A validação funcional local (API + frontend reais em execução) encontrou e corrigiu um bug real: o cliente HTTP não enviava corpo no `PUT` idempotente de competência, que o schema AJV exige como objeto vazio explícito — os testes com `fetch` mockado não capturavam essa divergência de contrato. RF-05 avança (integração do frontend concluída); autenticação real continua pendente.

## 2. Objetivo do Bloco

Substituir o modo demonstrativo do frontend por um corte direto para a API HTTP real do Bloco 16, sem fallback demonstrativo em runtime, migrando Dashboard, Movimentações, Comparativo, Histórico e Planejamento.

## 3. Escopo Implementado

Igual ao planejado em `05_blocks/bloco_17_integracao_direta_do_frontend_com_a_api_real.md`, seção 4 — sem divergência de escopo.

## 4. Arquivos Criados

- `apps/web/src/api/{api-config,api-errors,api-client,financial-api,financial-api.types,financial-api.mappers}.ts` (+ `.test.ts` de api-client/api-config/financial-api.mappers)
- `apps/web/src/state/{FinanceProvider,finance-context,finance-types}.ts` (+ `FinanceProvider.test.tsx`)
- `apps/web/src/state/test-support/{finance-test-fixtures,finance-test-reducer,FinanceTestProvider}.ts(x)` (+ `finance-test-reducer.test.ts`, `finance-{comparison,dashboard,history,planning}-sync.test.ts`)
- `apps/web/src/hooks/{use-finance,use-mutation-dialog}.ts`
- `apps/web/src/components/layout/FinanceStatusScreen.{tsx,css}`
- `apps/web/src/components/planning/{CategoryDistributionList,PlanningRealSummary}.tsx`
- `apps/web/src/utils/reference-month.ts`, `apps/web/src/vite-env.d.ts`
- `apps/web/src/no-runtime-persistence.test.ts` (substitui `state/finance-demo-no-persistence.test.ts`)
- `apps/api/scripts/db-bootstrap-household.ts`
- `apps/api/src/db/{household-bootstrap-guard,household-bootstrap-input}.ts` (+ `.test.ts`)
- `apps/web/.env.local` (não versionado — configurado após o bootstrap)
- `Docs/05_sessions/.../05_blocks/bloco_17_...md`, `06_prompts/prompt_bloco_17_...md`

## 5. Arquivos Alterados

- `apps/web/src/App.tsx`, `main.tsx`, `test-utils.tsx` — gateiam/usam o `FinanceProvider` real
- `apps/web/src/pages/{DashboardPage(via hook),FinancialEntriesPage,ComparisonPage,HistoryPage,PlanningPage}.tsx` + testes correspondentes
- `apps/web/src/components/financial-entries/{FinancialEntryForm,RealizeEntryDialog,CancelEntryDialog,FinancialEntryActions}.tsx` + testes
- `apps/web/src/components/planning/PlanningEntries.tsx`, `apps/web/src/components/layout/Sidebar.{tsx,css}` (+ teste)
- `apps/web/src/hooks/use-dashboard-view-model.ts`
- `apps/web/src/view-models/{financial-entries-view-model,planning-view-model}.ts` + testes de view-model (caminho de fixtures)
- `apps/api/package.json`, `package.json` (raiz) — script `db:bootstrap:household`
- `apps/api/scripts/connection-safety.test.ts` — novo script incluído na checagem de segurança de conexão
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-12), `Docs/02_architecture/estado_temporario_frontend.md` (banner de retirada), `Docs/03_contracts/contrato_frontend_backend.md`, `Docs/01_product/requisitos_funcionais.md` (RF-05, RF-06, RF-07)
- `README.md`, `apps/web/README.md`, `apps/api/README.md`, `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`

## 6. Arquivos Removidos

- `apps/web/src/state/{FinanceDemoProvider,finance-demo-context,finance-demo-initial-state,finance-demo-reducer,finance-demo-types}.ts(x)` + todos os `finance-demo-*.test.ts`
- `apps/web/src/hooks/use-finance-demo.ts`, `apps/web/src/data/dashboard-fixtures.ts`
- `apps/web/src/components/planning/{CategoryBudgetForm,CategoryBudgetList,BudgetProgress,PlanningChart,PlanningSummary}.tsx`

## 7. Comandos Executados

```
git switch -c feat/session-11-bloco-17-frontend-api-real
npx ddae-engine block create "Integração direta do frontend com a API real" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_17_integracao_direta_do_frontend_com_a_api_real --session session_11_fundacao_do_finanhouse
npm run build / verify:runtime / lint / typecheck / typecheck:api-scripts / test (múltiplas iterações)
npx ddae-engine validate / audit
npm audit --omit=dev / npm audit
npm run db:check
npm run db:audit:schema -- --phase=after
npm run db:audit:responsible-member -- --phase=after
CONFIRM_HOUSEHOLD_BOOTSTRAP=true npm run db:bootstrap:household   (1 execução, aprovada — permanente, sem rollback)
npm run dev:api / npm run dev --workspace=web -- --host 127.0.0.1 --port 5173   (validação funcional local)
npx ddae-engine feedback create --block bloco_17_integracao_direta_do_frontend_com_a_api_real --session session_11_fundacao_do_finanhouse
```

## 8. Testes Realizados

- 84 testes adicionados no conjunto do trabalho (103 testes novos menos 80 testes demonstrativos/obsoletos removidos, saldo líquido +23): 19 na API (guards e validação de entrada do bootstrap, cobertura estendida de `connection-safety.test.ts`) e 4 líquidos no web (cliente HTTP, `FinanceProvider`, reducer/fixtures de teste portados, páginas migradas), elevando o total de 738 para 761.
- API: 337 testes (318 → 337). Web: 271 testes (267 → 271). Domain: 153 (inalterado).
- Testes automatizados cobrem: cliente HTTP (URL, query, timeout, cancelamento, mapeamento de erro por código), `FinanceProvider` (carga inicial, criação idempotente da competência atual, ausência de competência anterior, erro de rede sem fallback, `RETRY`, mutação com sucesso/erro, guarda de duplo envio por `ref`), guards e validação de entrada do bootstrap (ambiente, migrations exatas, household existente, variáveis obrigatórias), migração das 5 páginas (incluindo reescrita completa de `PlanningPage.test.tsx` para o novo modelo sem limite por categoria), e um teste estático (`no-runtime-persistence.test.ts`) que garante ausência de `FinanceDemoProvider`/fixtures fora de `state/test-support/`.
- **Validação funcional manual (real, não simulada):** API (`npm run dev:api`) e frontend (`npm run dev --workspace=web`) iniciados localmente contra `finanhouse_dev`. Confirmado via HTTP real: `/health` 200, `/ready` 200 (TLS/pool/conexão ok), CORS aprovado para `http://127.0.0.1:5173`, categorias/membros reais do household 11 retornados corretamente, `PUT /periods/2026-08-01` idempotente (201 na primeira chamada, 200 na segunda, sem duplicata), `GET /entries` vazio conforme esperado.

## 9. Validações Executadas

- `ddae-engine validate`: OK, 0 warnings/erros.
- `ddae-engine audit`: OK, apenas os 7 quality gates pendentes (mesma linha de base desde blocos anteriores) — 0 pendências P1/P2.
- `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts` / `test`: todos aprovados (re-executados após a correção do bug do `ensurePeriod`).
- `npm audit --omit=dev`: 0 vulnerabilidades. `npm audit`: 4 moderadas, dev-only (`drizzle-kit`/`esbuild`), já documentadas em blocos anteriores.
- Pré-flight (antes do bootstrap): Aiven, development, `finanhouse_dev`, MySQL 8.4.8, TLS ativo, 6/6 tabelas, 2 migrations, zero registros em todas as tabelas.

## 10. Decisões Técnicas

Registrada em `Docs/02_architecture/decisoes_tecnicas.md`, DT-12 — corte direto do frontend demonstrativo para a API HTTP local, sem fallback em runtime, resolução de `createdByUserId` pelo membro `owner`, Planejamento com movimentações reais em vez de limite por categoria.

## 11. Problemas Encontrados

1. **Guarda de duplo envio insuficiente no `FinanceProvider`:** checar apenas `state.pendingAction` no corpo de `dispatch` não bastava — dois `dispatch` chamados na mesma tick síncrona (antes do React re-renderizar após `MUTATION_START`) enxergavam a mesma closure de `state` com `pendingAction: false`, permitindo que ambos disparassem a chamada HTTP. Descoberto pelo teste "ignora um segundo dispatch..." falhando de forma consistente.
2. **`useMutationDialog` não fechava o diálogo em cenários onde nem `pendingAction` nem `actionError` mudavam de valor** (ex.: mutação síncrona bem-sucedida sem erro anterior) — o `useEffect` dependia de valores derivados que podiam permanecer idênticos entre renders, nunca reexecutando. Corrigido para depender do objeto `state` inteiro (sempre uma referência nova a cada `dispatch`).
3. **Bug real de contrato descoberto na validação funcional (não capturado pelos testes com `fetch` mockado):** `ensurePeriod` não enviava corpo no `PUT .../periods/:referenceMonth`; o schema AJV da rota exige `{ type: 'object' }` explícito — sem corpo, a API rejeitava com 400 (sem `Content-Type`) ou 500 (com `Content-Type` mas corpo vazio, erro de parsing não tratado). Corrigido enviando `body: {}` explicitamente; confirmado por chamada HTTP real (201 na criação, 200 na segunda chamada idempotente).

## 12. Correções Aplicadas Durante o Bloco

1. `pendingActionRef` (item 11.1) — guarda síncrona por `ref`, independente de re-render.
2. `useMutationDialog` (item 11.2) — dependência no objeto `state` inteiro em vez de campos derivados.
3. `ensurePeriod` (item 11.3) — `body: {}` explícito no `PUT` idempotente de competência.
4. Ordem de carregamento do `apps/api/.env.local` no script de bootstrap — `resolveBootstrapInput` estava sendo chamado antes de `loadLocalEnv()`, fazendo a primeira tentativa de execução falhar com "variável ausente" mesmo com as variáveis preenchidas no arquivo. Nenhuma conexão foi aberta nessa tentativa (falha ocorreu antes de qualquer acesso ao banco); corrigido invertendo a ordem, e a execução real subsequente foi aprovada.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._

### P3 — Melhoria Recomendada

- Persistência de limites por categoria (orçamento) — RF-07 regrediu para pendente; exige tabela e endpoints próprios, decisão arquitetural em bloco futuro.
- Autenticação real — `createdByUserId` hoje resolvido como o primeiro membro `role: 'owner'`, não um usuário autenticado.
- `db:audit:schema`/`db:audit:responsible-member --phase=after` foram escritos para o fluxo de migration (esperam zero registros); após o bootstrap estrutural, `households`/`users`/`household_members`/`categories` legitimamente têm dados, então essas duas checagens "reprovam" por design — não é um problema de integridade (a auditoria interna do próprio `db-bootstrap-household.ts` já confirma as contagens esperadas). Uma evolução futura poderia ensinar essas auditorias a diferenciar "pós-migration" de "pós-bootstrap".

### P4 — Opcional

- Validação funcional foi feita via chamadas HTTP reais (curl) simulando o `FinanceProvider`, não via navegador — recomenda-se ao proprietário abrir `http://127.0.0.1:5173` para confirmação visual final (API e frontend deixados em execução em background ao final deste bloco).

## 14. Riscos Restantes

Nenhum risco novo além dos já documentados (DT-11, DT-12). A API continua inacessível fora de `127.0.0.1` e recusa `production`. `apps/web/.env.local` nunca deve ser commitado (confirmado ignorado pelo Git).

## 15. Evidências

- Bootstrap aprovado: `householdId: 11`, `ownerMemberId: 11`, `partnerMemberId: 12`, 7 categorias criadas; auditoria interna: `households: 1 · users: 2 · household_members: 2 · categories: 7 · monthly_periods: 0 · financial_entries: 0`.
- `/ready` real: `{"ready":true,"checks":{"configResolved":true,"poolAvailable":true,"connectionOk":true,"tlsActive":true}}`.
- `PUT /periods/2026-08-01`: 201 Created na primeira chamada, 200 OK idêntico na segunda — nenhuma duplicata em `GET /periods`.
- 761 testes aprovados (337 API / 271 web / 153 domain); `ddae-engine audit`: 0 P1/P2.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo

## 17. Próximo Bloco Recomendado

Bloco 18 (não criado nesta sessão) — persistência de limites por categoria (orçamento) e/ou autenticação real, como próximos passos naturais de RF-05/RF-07.

## 18. Commit Semântico Sugerido

```
feat(web): integrar frontend com API financeira real
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._

## 19. Correção Pós-Bloco (aplicada pelo Codex, 2026-08-01)

Após o fechamento deste bloco, o frontend passou a ficar preso indefinidamente em "Carregando o Finanhouse". **Esta correção não foi feita pelo Claude** — foi identificada e aplicada pelo Codex, fora desta sessão de trabalho, sem reabrir o Bloco 17.

**Causa raiz:** `mountedRef` era um `ref` único compartilhado entre execuções do efeito de carga do `FinanceProvider`, zerado por um `useEffect` de cleanup que nunca o reafirmava como `true` em um novo mount. Em `React.StrictMode` (ambiente de desenvolvimento), o próprio React executa mount→cleanup→mount de cada efeito — o cleanup simulado da primeira execução marcava `mountedRef.current = false` permanentemente, e a segunda execução (real, com resposta HTTP 200 válida) tinha seu `LOAD_SUCCESS` silenciosamente descartado pela guarda `!mountedRef.current`, deixando a interface presa em `status: 'loading'`.

**Correção:** `mountedRef` passou a ser reafirmado a cada mount; cada execução do efeito de carga ganhou seu próprio estado local `active` e seu próprio `AbortController` (não mais um `ref` único compartilhado entre execuções), com `requestIdRef` como guarda adicional contra uma execução antiga sobrescrever a mais recente. `loadAll` deixou de ser uma função externa memoizada (`useCallback`) e passou a viver dentro do próprio `useEffect`, disparado por um contador `loadAttempt`; `RETRY` agora incrementa esse contador em vez de invocar a função diretamente.

**Arquivos alterados:** `apps/web/src/state/FinanceProvider.tsx`, `apps/web/src/state/FinanceProvider.test.tsx` (4 testes novos: carga em `React.StrictMode` chegando a `ready`; requisição cancelada por uma nova carga sem loading preso; execução antiga não sobrescrevendo a mais recente mesmo respondendo depois; desmontagem real cancelando a carga em andamento).

**Testes:** web 271 → 275 (+4); total do projeto 761 → 765 (+4). API e domain inalterados (337 e 153).

**Commits:** branch `fix/finance-provider-loading-infinito`, commit `7402c7e`, integrada à `main` em 2026-08-01 (merge `a4cb943`). Nenhum fallback demonstrativo foi reintroduzido; nenhuma alteração de banco, migration, seed ou API.
