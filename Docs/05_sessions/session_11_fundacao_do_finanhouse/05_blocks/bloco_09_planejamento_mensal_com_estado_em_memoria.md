# Bloco 09 — Planejamento mensal com estado em memória

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-26

## 1. Objetivo

Implementar uma área funcional de Planejamento mensal, permitindo definir limites para categorias de despesas e acompanhar valores realizados, pendentes, planejados e projetados, utilizando a mesma fonte de estado temporário das áreas existentes e sem persistência permanente.

## 2. Contexto

Os Blocos 06–08 entregaram, nessa ordem, o dashboard visual, Movimentações e o Comparativo mensal, todos consumindo o mesmo `FinanceDemoProvider`. Com o Comparativo integrado à `main` (commit `1f68998`), o próximo passo natural do produto (`Docs/01_product/requisitos_funcionais.md`, RF-07) é permitir que o proprietário planeje limites de gasto por categoria e acompanhe o consumo desses limites — sem banco de dados real.

## 3. Problema que Este Bloco Resolve

Hoje não é possível saber, dentro do Finanhouse, se uma categoria de despesa está dentro do esperado, perto do limite ou já excedida antes do fim do mês. Este bloco resolve isso com uma área "Planejamento" que deriva tudo do mesmo estado em memória já existente, reaproveitando `calculateMonthlySummary`-style de agregação (agora específica de orçamento) em `packages/domain/src/planning/`.

## 4. Escopo

- Rota `/planejamento` e item "Planejamento" habilitado na `Sidebar` (restam "Histórico"/"Configurações" desabilitados).
- Modelo `CategoryBudget` no domínio: limite mensal por categoria de despesa/competência, `bigint` centavos, no máximo um por `(periodId, categoryId)`.
- Seleção de competência para visualização (padrão: competência atual).
- Limites por categoria: criação, edição, remoção temporária (só na sessão).
- Indicadores por categoria: limite, realizado, pendente, planejado, projetado, saldo restante, valor excedido, percentual consumido, status (`healthy`/`attention`/`exceeded`/`unplanned`).
- Resumo agregado da competência (totais + contagem por status).
- Despesas planejadas/pendentes listadas em contexto (sem recalcular totais).
- Visualização leve em SVG/CSS (sem biblioteca de gráficos nova).
- Correção do comando local (`npm run dev:web`) — já existia corretamente configurado (`predev:web` → `build:domain`), confirmado e documentado neste bloco.
- Sincronização com Movimentações e com o Comparativo via o mesmo `FinanceDemoProvider`.

## 5. Fora de Escopo

- MySQL, API HTTP real, Drizzle em runtime, migrations, seeds.
- `localStorage`, `IndexedDB`, autenticação.
- Notificações, recorrências automáticas, parcelamentos completos.
- Histórico, Configurações.
- Deploy, redesign geral, refinamento visual P3.

## 6. Arquivos e Pastas Envolvidos

- `packages/domain/src/planning/{category-budget,category-budget-rules,category-budget-calculations}.ts` (+ testes)
- `packages/domain/src/errors/domain-errors.ts` (novos erros), `packages/domain/src/summaries/compare-periods.ts` (export de helper reaproveitado), `packages/domain/src/index.ts`
- `apps/web/src/state/{finance-demo-types,finance-demo-reducer,finance-demo-initial-state}.ts`, `apps/web/src/data/dashboard-fixtures.ts`
- `apps/web/src/view-models/planning-view-model.ts`
- `apps/web/src/pages/PlanningPage.tsx` (+ `.css`)
- `apps/web/src/components/planning/**`
- `apps/web/src/components/layout/{Sidebar,RootLayout}.tsx`, `apps/web/src/App.tsx`
- `Docs/01_product/requisitos_funcionais.md`, `Docs/02_architecture/estado_temporario_frontend.md`, `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/07_design_system/componentes_ui.md`, `apps/web/README.md`
- Não tocar em `apps/api/src/db/**`, `database/migrations/**`, `apps/api/.env.local`

## 7. Dependências

- Bloco 08 (Comparativo mensal com estado em memória, integrado à `main` em `1f68998`)
- `@finanhouse/domain` — `calculateMonthlySummary`, `Money`/`assertPositiveMoney`, `assertPeriodAllowsEntryChanges` (reaproveitado por `assertPeriodAllowsBudgetChanges`)

## 8. Plano de Implementação

1. Modelar `CategoryBudget` e as regras de domínio (`createCategoryBudget`, `updateCategoryBudget`, `assertCategoryBudgetRemovable`) em `packages/domain/src/planning/`, com testes próprios.
2. Implementar os cálculos por categoria (`summarizeCategoryBudget`, `buildCategoryBudgetSummaries`) com os quatro estados (`healthy`/`attention`/`exceeded`/`unplanned`), com testes próprios.
3. Estender `FinanceDemoState`/`financeDemoReducer`/fixtures com `categoryBudgets` e as ações `CREATE_CATEGORY_BUDGET`/`UPDATE_CATEGORY_BUDGET`/`REMOVE_CATEGORY_BUDGET`.
4. Criar `view-models/planning-view-model.ts` (funções puras, dados por argumento).
5. Criar `pages/PlanningPage.tsx` e os componentes de `components/planning/`.
6. Adicionar rota `/planejamento` e habilitar "Planejamento" na `Sidebar`/`RootLayout`.
7. Confirmar/documentar `npm run dev:web`.
8. Escrever os testes obrigatórios, documentar e gerar o feedback oficial.

## 8.1. Registro de Implementação

- Rota: `/planejamento`, adicionada ao `App.tsx` e habilitada na `Sidebar` com `NavLink` de `react-router`; `RootLayout` mapeia para o título "Planejamento".
- Domínio: `packages/domain/src/planning/category-budget.ts` (tipo), `category-budget-rules.ts` (`createCategoryBudget`/`updateCategoryBudget`/`assertCategoryBudgetRemovable`, reaproveitando `assertPeriodAllowsEntryChanges` via `assertPeriodAllowsBudgetChanges` — ver DT-05), `category-budget-calculations.ts` (`summarizeCategoryBudget`/`buildCategoryBudgetSummaries`). `nonCancelledExpenseCategoryTotals` de `compare-periods.ts` foi exportado para reaproveitamento (não duplicado).
- Estado compartilhado: `FinanceDemoState` ganhou `categoryBudgets`/`nextBudgetId`; reducer ganhou `CREATE_CATEGORY_BUDGET`/`UPDATE_CATEGORY_BUDGET`/`REMOVE_CATEGORY_BUDGET`, delegando 100% ao domínio. Fixtures (`dashboard-fixtures.ts`) cobrem de propósito os quatro estados na competência atual (Moradia `attention`, Alimentação `healthy`, Transporte `exceeded`, Lazer `unplanned`) mais um limite em competência fechada (Moradia/junho) para testar o bloqueio de edição/remoção.
- View-model: `apps/web/src/view-models/planning-view-model.ts` recebe competências, categoria selecionada, categorias, movimentações e limites por argumento; formata e ordena por severidade (excedido → atenção → sem planejamento → saudável); nenhuma fórmula financeira em JSX.
- Página/componentes: `PlanningPage.tsx` + `components/planning/{PlanningSummary,CategoryBudgetList,BudgetProgress,CategoryBudgetForm,PlanningEntries,PlanningChart,PlanningEmptyState}.tsx` (+ `Planning.css` compartilhado, seguindo o padrão já usado por `comparison/Comparison.css`).
- Criação de **novo** limite restrita à competência atual do estado (mesma convenção de criação de movimentações); editar/remover funciona em qualquer competência não fechada, inclusive ao navegar para uma competência diferente da atual no seletor da página (ver DT-05).
- Comando local: `npm run dev:web`/`predev:web` já estavam corretamente configurados no `package.json` raiz — confirmado e documentado (não precisou de alteração de código), com teste dedicado (`apps/web/src/dev-script.test.ts`).
- Persistência/API: não há `localStorage`, `IndexedDB`, API HTTP real, conexão com MySQL, migration, seed ou dados reais.
- Refinamento visual: permanece como pendência P3 no backlog de design, separado deste bloco.

## 9. Critérios de Aceite

- [x] Rota `/planejamento` navegável a partir da `Sidebar`, com `aria-current="page"` na rota ativa.
- [x] Página consome o mesmo `FinanceDemoProvider` do dashboard/Movimentações/Comparativo — nenhuma leitura direta de fixtures, nenhum estado financeiro paralelo.
- [x] Limite pode ser criado, editado e removido (temporariamente); duplicidade por categoria/competência é rejeitada.
- [x] Categoria sem limite nunca aparece com limite zero inventado; percentual é `null` sem limite.
- [x] `cancelled` nunca compõe totais; `planned`/`pending` compõem projeção; `realized` usa `actualAmount`.
- [x] Quatro estados (`healthy`/`attention`/`exceeded`/`unplanned`) sempre comunicados em texto, nunca só por cor.
- [x] Nenhum `NaN`/`Infinity`/limite/percentual inventado em nenhum cenário.
- [x] Gráfico leve (SVG/CSS) com resumo textual e alternativa acessível, valores consistentes com os cards, responsivo, respeitando `prefers-reduced-motion` (herdado da regra global em `global.css`).
- [x] Nenhum uso de `localStorage`, `IndexedDB`, `mysql2`, `drizzle-orm` ou `.env*`.
- [x] `npm run dev:web` prepara `@finanhouse/domain` antes do Vite, sem `clean` e sem iniciar a API.
- [x] Pelo menos 40 novos testes, todos passando, somados aos já existentes.

## 10. Validações Obrigatórias

- [x] `npm ci`
- [x] `npm run clean`
- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `ddae-engine validate`
- [x] `ddae-engine audit`
- [x] `npm audit --omit=dev` / `npm audit`

## 11. Segurança

Nenhum dado real é usado (fixtures sintéticas, mesmo estado em memória dos Blocos 07/08). Nenhuma autenticação implementada (fora de escopo). Nenhuma conexão com o banco, nenhuma credencial tocada.

## 12. Performance

Cálculos de orçamento derivados em memória (`useMemo`/funções puras) a partir do mesmo estado do `FinanceDemoProvider` — sem I/O novo. Nenhuma biblioteca de gráficos adicionada; visualização em SVG/CSS puro.

## 13. Design System / UX

Reaproveita tokens já existentes (`--fh-income`, `--fh-warning`, `--fh-expense`, `--fh-text-muted`) para os quatro status — nenhum novo token de cor introduzido. Status sempre comunicado em texto (badge + `statusLabel`), nunca só por cor. Novos componentes registrados em `Docs/07_design_system/componentes_ui.md`.

## 14. Riscos

- Confundir a regra de "competência permite alteração" de limites com a de movimentações comuns criaria fricção desnecessária durante a revisão de fechamento — mitigado com `assertPeriodAllowsBudgetChanges` documentado em DT-05.
- Tratar "sem limite" como limite zero inflaria percentuais/erros de divisão — mitigado com `limitAmount`/`percentConsumed` `null` explícito em todo o pipeline, testado.

## 15. Pendências Esperadas

- P3 — Refinamento visual do Planejamento permanece pendente da mesma sessão dedicada de UI/UX já registrada para Dashboard/Movimentações/Comparativo (`Docs/07_design_system/backlog_refinamento_visual.md`).
- P3 — Quando a API real existir, o Planejamento deve continuar consumindo `useFinanceDemo()` (ou seu substituto HTTP), sem duplicar lógica.
- P4 — "Histórico" e "Configurações" continuam apenas itens de navegação não funcionais.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_09_planejamento_mensal_com_estado_em_memoria --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

```
feat(web): implementar planejamento mensal em memória
```
