# Feedback — Bloco 09: Planejamento mensal com estado em memória

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-26

## 1. Resumo Executivo

O Bloco 09 implementou a área funcional `/planejamento`, usando a mesma fonte de estado em memória do dashboard, de Movimentações e do Comparativo (`FinanceDemoProvider`). A página permite definir, editar e remover (temporariamente) limites de orçamento mensal por categoria de despesa, e mostra — por categoria e agregado — limite, realizado, pendente, planejado, projetado, saldo restante, valor excedido, percentual consumido e um status textual (saudável/em atenção/excedido/sem planejamento), sem banco, API HTTP, persistência permanente ou biblioteca de gráficos nova.

O modelo `CategoryBudget` e todas as regras/cálculos financeiros foram implementados como funções puras em `packages/domain/src/planning/` (nunca em JSX), reaproveitando `assertPeriodAllowsEntryChanges` do domínio existente para a regra de "competência permite alteração" (decisão registrada em DT-05: diferente de movimentações comuns, limites de orçamento podem ser ajustados também em competência `review`, não só `open`). O comando local `npm run dev:web` já estava corretamente configurado no `package.json` raiz (`predev:web` → `build:domain`, sem `clean`, sem iniciar a API) — confirmado e coberto por teste dedicado, sem necessidade de alteração de código.

93 testes novos (32 no domínio, 61 no frontend), somando 391 testes aprovados no monorepo (mínimo exigido: 40 novos — entregue com folga). Status final: bloco concluído conforme escopo funcional, com ressalva P3 de refinamento visual já esperada no backlog de design. Nenhuma P2 nova foi aberta; a pendência TLS segue controlada pelos Blocos 03/04. Branch publicada no remoto, **não integrada à `main`** — decisão explícita do proprietário para esta etapa.

## 2. Objetivo do Bloco

Implementar uma área funcional de Planejamento mensal, permitindo definir limites para categorias de despesas e acompanhar valores realizados, pendentes, planejados e projetados, utilizando a mesma fonte de estado temporário das áreas existentes e sem persistência permanente.

## 3. Escopo Implementado

- Rota `/planejamento` adicionada ao React Router 8.3.0; item "Planejamento" habilitado na `Sidebar` (restam "Histórico"/"Configurações" desabilitados).
- Modelo `CategoryBudget` (`packages/domain/src/planning/category-budget.ts`): `{ id, householdId, periodId, categoryId, limitAmount }`, `bigint` centavos, no máximo um por `(periodId, categoryId)`.
- Regras de domínio (`category-budget-rules.ts`): `createCategoryBudget`, `updateCategoryBudget`, `assertCategoryBudgetRemovable` — categoria precisa ser `expense`/`active`, household consistente, limite positivo, sem duplicidade, competência `open`/`review` (nunca `closed`).
- Cálculos por categoria (`category-budget-calculations.ts`): `summarizeCategoryBudget`/`buildCategoryBudgetSummaries` — `realized`/`pending`/`planned`/`projected`, `remaining`/`exceeded`/`percentConsumed` (`null` sem limite), status `healthy`/`attention`/`exceeded`/`unplanned`; categoria sem limite e sem despesa é omitida da lista.
- Estado compartilhado: `FinanceDemoState.categoryBudgets`/`nextBudgetId`; reducer com `CREATE_CATEGORY_BUDGET`/`UPDATE_CATEGORY_BUDGET`/`REMOVE_CATEGORY_BUDGET`, delegando 100% ao domínio; fixtures cobrindo os quatro estados na competência atual mais um limite em competência fechada.
- View-model puro (`planning-view-model.ts`): períodos, resumo agregado, linhas por categoria (ordenadas por severidade), maiores riscos, categorias disponíveis para novo limite, despesas planejadas/pendentes em contexto, gráfico.
- Página e componentes (`PlanningPage.tsx` + `components/planning/*`): resumo, lista por categoria com ações contextuais, formulário de limite (diálogo acessível), despesas planejadas/pendentes, gráfico SVG/CSS leve, estado vazio.
- Criação de **novo** limite restrita à competência atual (mesma convenção de criação de movimentações); editar/remover funciona em qualquer competência não fechada, inclusive navegando para uma competência diferente no seletor da página.
- `npm run dev:web`/`predev:web` confirmados e documentados como comando oficial de execução local.
- Sincronização testada: criar/editar/realizar/cancelar movimentações e criar/editar/remover limites atualizam o Planejamento na mesma sessão; remontar o provider retorna às fixtures.

## 4. Arquivos Criados

- `packages/domain/src/planning/{category-budget,category-budget-rules,category-budget-calculations}.ts`
- `packages/domain/src/planning/{category-budget-rules.test,category-budget-calculations.test}.ts`
- `apps/web/src/view-models/planning-view-model.ts`, `apps/web/src/view-models/planning-view-model.test.ts`
- `apps/web/src/pages/PlanningPage.tsx`, `apps/web/src/pages/PlanningPage.css`, `apps/web/src/pages/PlanningPage.test.tsx`
- `apps/web/src/components/planning/{PlanningSummary,CategoryBudgetList,BudgetProgress,CategoryBudgetForm,PlanningEntries,PlanningChart,PlanningEmptyState}.tsx`
- `apps/web/src/components/planning/Planning.css`
- `apps/web/src/state/finance-demo-budget-reducer.test.ts`, `apps/web/src/state/finance-demo-planning-sync.test.ts`
- `apps/web/src/dev-script.test.ts`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_09_planejamento_mensal_com_estado_em_memoria.md`

## 5. Arquivos Alterados

- `packages/domain/src/errors/domain-errors.ts` (novos erros `CategoryBudgetNotFoundError`/`DuplicateCategoryBudgetError`)
- `packages/domain/src/summaries/compare-periods.ts` (`nonCancelledExpenseCategoryTotals` exportado para reaproveitamento)
- `packages/domain/src/index.ts`
- `apps/web/src/state/{finance-demo-types,finance-demo-reducer,finance-demo-initial-state}.ts`
- `apps/web/src/data/dashboard-fixtures.ts` (limites sintéticos + membro/categoria auxiliares já existentes reaproveitados)
- `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx`
- `apps/web/src/components/layout/{Sidebar,RootLayout}.tsx`, `apps/web/src/components/layout/Sidebar.test.tsx`
- `Docs/01_product/requisitos_funcionais.md` (RF-06 atualizado, RF-07 novo)
- `Docs/02_architecture/estado_temporario_frontend.md` (seção 8 nova — Planejamento; seção 9 nova — execução local; renumeração das seções finais)
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-05 nova)
- `Docs/07_design_system/componentes_ui.md` (inventário do Bloco 09)
- `apps/web/README.md` (rota, estrutura, comando `dev:web`)
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_09_planejamento_mensal_com_estado_em_memoria.md`

## 6. Arquivos Removidos

- Nenhum.

## 7. Comandos Executados

```
git fetch origin && git status && git branch --show-current && git log -3 --oneline && git check-ignore -v apps/api/.env.local
git pull --ff-only origin main
git switch -c feat/session-11-bloco-09-planejamento-memory
npx ddae-engine block create "Planejamento mensal com estado em memória" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_09_planejamento_mensal_com_estado_em_memoria --session session_11_fundacao_do_finanhouse
npm run build --workspace=@finanhouse/domain   (repetido a cada módulo novo do domínio)
npx vitest run src/planning   (packages/domain, iterativo)
npx tsc -b   (apps/web, repetido a cada módulo novo)
npx vitest run <arquivo>   (apps/web, repetido a cada arquivo novo/alterado)
npx oxlint   (apps/web)
npx ddae-engine feedback create --block bloco_09_planejamento_mensal_com_estado_em_memoria --session session_11_fundacao_do_finanhouse
npm ci
npm run clean
npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run test
npx ddae-engine validate
npx ddae-engine audit
npm audit --omit=dev
npm audit
npm ls react-router react-router-dom
```

## 8. Testes Realizados

93 testes novos, todos automatizados (Vitest + Testing Library), somados aos 298 já existentes = **391 no total** (mínimo exigido no prompt: 40 novos — entregue com folga):

- `packages/domain/src/planning/category-budget-rules.test.ts` (17): criação válida; rejeição de limite zero/negativo/categoria income/categoria inativa/competência fechada; permissão em competência `review`; rejeição de categoria de outro household; rejeição de duplicidade; permissão da mesma categoria em competências diferentes; edição de limite (válida, zero rejeitado, fechada rejeitada, `review` permitida); remoção permitida em `open`/`review`, rejeitada em `closed`.
- `packages/domain/src/planning/category-budget-calculations.test.ts` (15): soma separada de realizado/pendente/planejado; `cancelled` fora dos totais; os quatro status (`healthy`/`attention` no limiar de 80%/`exceeded`/`unplanned`); ausência de `NaN`/`Infinity`; `remainingAmount` negativo quando excedido; isolamento por categoria/competência; `buildCategoryBudgetSummaries` inclui categoria com limite sem despesa, inclui categoria sem limite com despesa (unplanned), omite categoria sem limite e sem despesa, nunca inclui categorias `income`, despesa cancelada sozinha não vira "unplanned".
- `apps/web/src/state/finance-demo-budget-reducer.test.ts` (18): criação válida; rejeição de zero/negativo/mais de duas casas/income/inativa/fechada/duplicidade; edição válida e rejeitada em competência fechada; remoção e rejeição em competência fechada; categoria vira "unplanned" após remoção; `RESET` restaura fixtures; imutabilidade; categoria de outro household rejeitada; categoria inexistente rejeitada.
- `apps/web/src/view-models/planning-view-model.test.ts` (14): ordenação/rótulos de competência; estado vazio sem competências; os quatro status nas fixtures reais; categoria sem limite/sem despesa ausente da lista; contagens do resumo batendo com as linhas; percentual `null`/sem `NaN`/`Infinity`; maiores riscos só excedido/atenção; ordenação por severidade; categorias disponíveis para novo limite; gráfico consistente com os cards; competência fechada navegável; resumo acessível cita a competência; competência sem categorias relevantes não quebra o resumo.
- `apps/web/src/pages/PlanningPage.test.tsx` (15): renderização e modo demonstrativo; competência padrão; status das fixtures; criação/edição/remoção de limite via formulário/lista; rejeição de valor com mais de duas casas; ação "Definir limite" em categoria sem planejamento; despesas planejadas/pendentes visíveis; "Definir limite" desabilitado fora da competência atual; estado vazio sem competências; navegação por teclado; ausência de `NaN`/`Infinity`; `data-label` responsivo; diálogo acessível fecha com Escape.
- `apps/web/src/state/finance-demo-planning-sync.test.ts` (7): atualização após criar/realizar/cancelar movimentação; atualização após editar/remover limite; mesma fonte de estado; reset ao remontar o provider.
- `apps/web/src/dev-script.test.ts` (4): `dev:web`/`predev:web` corretos; `predev:web` sem `clean`; `dev:web` não inicia a API nem referencia banco.
- `apps/web/src/App.test.tsx` (+1, agora 13): navegação para `/planejamento` com `aria-current` e título.
- `apps/web/src/components/layout/Sidebar.test.tsx` (+2, agora 9): "Planejamento" como link real habilitado; `aria-current="page"` acompanha a rota ativa.

## 9. Validações Executadas

- `npm ci` — OK; 4 moderadas dev conhecidas no resumo do npm.
- `npm run clean` — OK; removeu `packages/domain/dist`, `apps/api/dist`, `apps/web/dist`.
- `npm run build` — OK.
- `npm run verify:runtime` — OK; "Nenhum servidor iniciado, nenhuma conexão de banco, nenhuma leitura de .env.local."
- `npm run lint` — OK, sem erros ou avisos.
- `npm run typecheck` — OK.
- `npm run test` — OK, **391/391** (34 api + 204 web + 153 domain).
- `npx ddae-engine validate` — OK, 0 warnings, 0 errors.
- `npx ddae-engine audit` — OK, 9 warnings conhecidos (7 quality gates pendentes + P2 Blocos 03/04), 0 errors — nenhuma P2 nova.
- `npm audit --omit=dev` — OK, 0 vulnerabilidades de produção.
- `npm audit` — 4 vulnerabilidades moderadas (cadeia dev `drizzle-kit`/`@esbuild-kit`/`esbuild`, já conhecidas desde o Bloco 03); 0 altas.
- `npm ls react-router react-router-dom` — `react-router@8.3.0` presente; `react-router-dom` ausente.
- `packages/domain/dist/index.js` — confirmado presente após o build.

## 10. Decisões Técnicas

- **DT-05 registrada em `Docs/02_architecture/decisoes_tecnicas.md`**: limites de orçamento podem ser alterados em competência `open` **ou** `review` (`assertPeriodAllowsBudgetChanges`), diferente da regra padrão de movimentações comuns — planejar/ajustar é uma atividade de acompanhamento, mais útil justamente durante a revisão de fechamento.
- **Criação de novo limite restrita à competência atual** (mesma convenção já usada para criar movimentações) — evita o caso ambíguo de criar um limite para uma competência diferente da que o reducer assume (`state.currentPeriodId`); editar/remover um limite existente não tem essa restrição, pois opera sobre um registro já ligado a uma competência específica.
- **Categoria de despesa sem limite e sem despesa não cancelada é omitida da lista de Planejamento** (não é tratada como "unplanned") — decisão explícita registrada em `estado_temporario_frontend.md`, já que não há nada de orçamento relevante a mostrar para ela.
- **`nonCancelledExpenseCategoryTotals` (Bloco 08) exportado e reaproveitado** pelos cálculos de orçamento, em vez de duplicar a soma de despesas não canceladas por categoria/competência.
- **Sem biblioteca de gráficos nova** — `PlanningChart` segue o mesmo padrão SVG/CSS já usado por `ComparisonChart`/`FinancialEvolutionChart`.

## 11. Problemas Encontrados

- Vários testes iniciais de `PlanningPage.test.tsx` usaram `getByText`/`getByRole` sem escopo suficiente e falharam por "múltiplos elementos encontrados" (ex.: o nome da categoria aparece tanto na tabela quanto no rótulo do gráfico SVG; o rótulo de status aparece tanto no card de resumo quanto no badge da linha; o botão "Definir limite" existe tanto na barra de ferramentas quanto nas linhas "sem planejamento"). Corrigido usando `getAllByText`/`getAllByRole` com o primeiro elemento explicitamente selecionado, quando a duplicação é esperada e correta.
- Um teste de sincronização inicial comparou valores de fixtures com o `parseMoney` do valor errado (confundiu R$ 18,00 com R$ 180,00 de uma fixture existente) — corrigido para comparar contra o valor literal esperado após a operação, não uma subtração calculada errada.

## 12. Correções Aplicadas Durante o Bloco

- Ajuste de seletividade (`getAllByRole`/`getAllByText`) em `PlanningPage.test.tsx` para lidar com duplicação intencional de texto entre tabela, gráfico e cards de resumo.
- Correção do valor esperado em um teste de `finance-demo-planning-sync.test.ts` (pendente da fixture de Alimentação é R$ 180,00, não R$ 18,00).
- Exposição de `budgetId` no `CategoryBudgetRowViewModel` (em vez de recalcular o id do limite dentro do componente) para que editar/remover funcionem corretamente também ao visualizar uma competência diferente da atual.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._ TLS/persistência real continuam controladas pelos Blocos 03/04 e não foram duplicadas aqui.

### P3 — Melhoria Recomendada

- Refinamento visual do Planejamento permanece no backlog de design, junto dos refinamentos visuais já registrados para Dashboard/Movimentações/Comparativo.
- Vulnerabilidades moderadas de desenvolvimento na cadeia `drizzle-kit`/`esbuild` seguem conhecidas; produção continua com 0 vulnerabilidades.

### P4 — Opcional

- Quando a API real existir, substituir o provider demonstrativo mantendo a interface consumida pelos view-models.
- "Histórico" e "Configurações" continuam como navegação futura desabilitada.
- Avaliar, em bloco futuro, se vale oferecer criação de limite também para competências passadas (hoje restrita à competência atual, por design).

## 14. Riscos Restantes

- A página ainda opera somente sobre fixtures sintéticas em memória; não há persistência entre recarregamentos.
- A experiência visual cumpre o uso funcional, mas ainda não representa aceite visual final.
- A futura troca para API deve preservar a interface de dados ou adaptar os view-models sem duplicar fórmulas.

## 15. Evidências

```
$ npm run test
api: Test Files 6 passed (6) · Tests 34 passed (34)
web: Test Files 28 passed (28) · Tests 204 passed (204)
domain: Test Files 8 passed (8) · Tests 153 passed (153)
Total: 391/391

$ npx ddae-engine validate
Status: OK · Warnings: 0 · Errors: 0

$ npx ddae-engine audit
Status: OK · Warnings: 9 (7 gates + P2 Bloco 03 + P2 Bloco 04) · Errors: 0

$ npm audit --omit=dev
found 0 vulnerabilities

$ npm audit
4 moderate severity vulnerabilities (esbuild/@esbuild-kit/drizzle-kit, cadeia de desenvolvimento, já P3 desde o Bloco 03)

$ npm ls react-router react-router-dom
web -> react-router@8.3.0   (react-router-dom ausente)

$ npm run verify:runtime
[verify:runtime] SUCESSO — @finanhouse/domain e o serviço de aplicação compilado funcionam via import padrão do Node, sem depender de arquivos .ts em runtime.

$ ls packages/domain/dist/index.js
presente
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Sessão dedicada de refinamento visual (Dashboard/Movimentações/Comparativo/Planejamento) com o proprietário, ou Bloco 10 de Histórico em memória — a decidir junto ao proprietário. Persistência real (API + MySQL) continua bloqueada até a resolução do TLS (Bloco 04).

## 18. Commit Semântico Sugerido

```
feat(web): implementar planejamento mensal em memória
```

Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário.
