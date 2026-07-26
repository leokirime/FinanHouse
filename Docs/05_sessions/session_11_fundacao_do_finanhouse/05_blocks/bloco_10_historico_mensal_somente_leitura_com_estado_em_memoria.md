# Bloco 10 — Histórico mensal somente leitura com estado em memória

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-26

## 1. Objetivo

Implementar uma área de Histórico mensal somente leitura, permitindo consultar competências e movimentações anteriores por meio da fonte compartilhada de estado temporário, sem banco de dados ou persistência permanente.

## 2. Contexto

Os Blocos 06–09 entregaram, nessa ordem, o dashboard visual, Movimentações, Comparativo e Planejamento, todos consumindo o mesmo `FinanceDemoProvider` — com o Bloco 09 já integrado à `main` (commit `e107716`). O próximo passo natural do produto (`Docs/01_product/requisitos_funcionais.md`, RF-08) é permitir que o proprietário consulte o histórico de competências e movimentações anteriores, de forma estritamente consultiva — sem qualquer ação de mutação e sem banco de dados real. Esta é a última das quatro áreas funcionais planejadas para esta rodada (Movimentações, Comparativo, Planejamento, Histórico).

## 3. Problema que Este Bloco Resolve

Hoje é possível ver apenas a competência atual (Dashboard/Movimentações), comparar duas competências (Comparativo) ou planejar a atual (Planejamento) — não há como navegar livremente pelo histórico completo de competências fechadas/em revisão/abertas e suas movimentações. Este bloco resolve isso com uma área "Histórico" somente leitura, reaproveitando `calculateMonthlySummary` já existente em `@finanhouse/domain`.

## 4. Escopo

- Rota `/historico` e item "Histórico" habilitado na `Sidebar` (resta apenas "Configurações" desabilitada).
- Lista cronológica de competências (mais recente → mais antiga), com filtro por ano e por status da competência (`open`/`review`/`closed`).
- Seleção de uma competência (padrão: a mais recente que atende aos filtros).
- Resumo financeiro da competência selecionada: receitas realizadas, despesas realizadas, saldo realizado, fechamento projetado.
- Contagem de movimentações por status (`planned`/`pending`/`realized`/`cancelled`) da competência selecionada.
- Movimentações da competência, filtráveis por status, ordenadas da data mais recente para a mais antiga.
- Estado vazio (nenhuma competência; filtros de competência sem resultado; filtro de movimentação sem resultado).
- Responsividade estrutural e acessibilidade (landmarks, labels, foco visível, seleção por teclado, status nunca só por cor).

## 5. Fora de Escopo

- Criar, editar, realizar, cancelar ou excluir movimentações pelo Histórico.
- Fechar ou reabrir competências.
- Excluir dados.
- Alterar planejamento (limites de orçamento).
- API HTTP real, MySQL, migrations, seeds, autenticação.
- Exportação de arquivo, gráficos pesados, redesign visual geral.

O Histórico é estritamente consultivo — nenhum componente despacha ações no `FinanceDemoProvider`.

## 6. Arquivos e Pastas Envolvidos

- `apps/web/src/view-models/history-view-model.ts` (+ teste)
- `apps/web/src/pages/HistoryPage.tsx` (+ `.css`, + teste)
- `apps/web/src/components/history/{HistoryFilters,PeriodHistoryList,HistoricalPeriodSummary,HistoricalStatusBreakdown,HistoricalEntries,HistoryEmptyState}.tsx` (+ `History.css`)
- `apps/web/src/components/layout/{Sidebar,RootLayout}.tsx`, `apps/web/src/App.tsx`
- `apps/web/src/state/finance-demo-history-sync.test.ts`
- `Docs/01_product/requisitos_funcionais.md`, `Docs/02_architecture/estado_temporario_frontend.md`, `Docs/07_design_system/componentes_ui.md`, `apps/web/README.md`
- Não tocar em `apps/api/src/db/**`, `database/migrations/**`, `apps/api/.env.local`

## 7. Dependências

- Bloco 09 (Planejamento mensal com estado em memória, integrado à `main` em `e107716`)
- `@finanhouse/domain` — `calculateMonthlySummary`

## 8. Plano de Implementação

1. Criar `view-models/history-view-model.ts`: funções puras que recebem competências, movimentações, categorias, competência selecionada e filtros por argumento; reaproveitam `calculateMonthlySummary` para o resumo financeiro.
2. Criar `pages/HistoryPage.tsx` consumindo `useFinanceDemo()` — somente leitura, sem `dispatch`.
3. Criar os componentes de `components/history/` (filtros, lista de competências, resumo, contagem por status, movimentações, estado vazio).
4. Adicionar rota `/historico` em `App.tsx` e habilitar "Histórico" na `Sidebar`/`RootLayout`.
5. Escrever os testes obrigatórios (view-model, página, sincronização com Movimentações/Planejamento).
6. Documentar e gerar o feedback oficial.

## 9. Critérios de Aceite

- [x] Rota `/historico` navegável a partir da `Sidebar`, com `aria-current="page"` na rota ativa.
- [x] Página consome o mesmo `FinanceDemoProvider` do dashboard/Movimentações/Comparativo/Planejamento — nenhuma leitura direta de fixtures, nenhum estado financeiro paralelo, nenhum `dispatch`.
- [x] Competências listadas da mais recente para a mais antiga, com filtro por ano e por status da competência.
- [x] Movimentações filtráveis por status, ordenadas da data mais recente para a mais antiga.
- [x] `cancelled` nunca compõe totais realizados/projetados (via `calculateMonthlySummary`).
- [x] Nenhum `NaN`/`Infinity` em nenhum cenário, incluindo competência sem movimentações.
- [x] Nenhuma ação de criar/editar/realizar/cancelar/excluir oferecida em nenhum componente do Histórico.
- [x] Nenhum uso de `localStorage`, `IndexedDB`, `mysql2`, `drizzle-orm` ou `.env*`.
- [x] Pelo menos 41 novos testes, todos passando, somados aos já existentes.

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

Nenhum dado real é usado (fixtures sintéticas, mesmo estado em memória dos Blocos 07–09). Nenhuma autenticação implementada (fora de escopo). Nenhuma conexão com o banco, nenhuma credencial tocada. Área estritamente consultiva — reduz ainda mais a superfície de risco em relação às demais áreas (nenhuma escrita de estado).

## 12. Performance

Cálculos derivados em memória (`useMemo`/funções puras) a partir do mesmo estado do `FinanceDemoProvider` — sem I/O novo. Nenhuma biblioteca nova adicionada.

## 13. Design System / UX

Reaproveita tokens/classes já existentes e os tons `data-tone` já definidos para status de competência (`HeroBrand.css`: `open`/`review`/`closed`) e de movimentação (`RecentEntries.css`: `planned`/`pending`/`realized`/`cancelled`) — nenhum novo token de cor introduzido. Status sempre comunicado também em texto, nunca só por cor. Novos componentes registrados em `Docs/07_design_system/componentes_ui.md`.

## 14. Riscos

- Confundir "Histórico" com uma área de gestão (permitir edição) quebraria a garantia de que é estritamente consultivo — mitigado por nunca importar `dispatch` nos componentes de `components/history/` e testar explicitamente a ausência de ações de mutação.
- Misturar os filtros do Histórico com o estado compartilhado poderia vazar estado de UI para `FinanceDemoState` — mitigado mantendo `selectedPeriodId`/filtros como estado local da página, nunca escritos em `state`.

## 15. Pendências Esperadas

- P3 — Refinamento visual do Histórico permanece pendente da mesma sessão dedicada de UI/UX já registrada para Dashboard/Movimentações/Comparativo/Planejamento (`Docs/07_design_system/backlog_refinamento_visual.md`).
- P4 — "Configurações" continua apenas item de navegação não funcional.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_10_historico_mensal_somente_leitura_com_estado_em_memoria --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

```
feat(web): implementar histórico mensal em memória
```
