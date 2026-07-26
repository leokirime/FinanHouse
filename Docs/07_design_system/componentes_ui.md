# Componentes de UI

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Antes de criar um componente novo, verifique aqui se um equivalente já existe. Duplicar componentes com variações pequenas é a forma mais comum de o design system degradar.

## 1. Objetivo

Inventariar os componentes de UI reutilizáveis disponíveis, para evitar duplicação e inconsistência visual.

## 2. Inventário de Componentes (Bloco 06 + Bloco 07 + Bloco 08 + Bloco 09)

| Componente | Onde vive no código | Variantes | Estados suportados |
|---|---|---|---|
| `Brand` | `apps/web/src/components/brand/Brand.tsx` | Completo / compacto (`FH`); tipográfico / com logo (`logoSrc`) | Default — usado apenas em modo tipográfico (sidebar); nenhum arquivo compacto oficial existe ainda |
| `HeroBrand` | `apps/web/src/components/dashboard/HeroBrand.tsx` | — | `open` / `review` / `closed` (via `data-tone`); CTA "Revisar mês" com `disabled` nativo |
| `AppShell` | `apps/web/src/components/layout/AppShell.tsx` | — | Default |
| `RootLayout` | `apps/web/src/components/layout/RootLayout.tsx` | — | Novo (Bloco 07) — monta `AppShell`/`DashboardHeader` uma vez para todas as rotas via `<Outlet />` |
| `Sidebar` | `apps/web/src/components/layout/Sidebar.tsx` | — | Item ativo = link real com `aria-current="page"` (Bloco 07: "Visão geral" e "Movimentações"; Bloco 08: "Comparativo"; Bloco 09: "Planejamento"); indisponível = `<button disabled>` (restam "Histórico"/"Configurações") |
| `DashboardHeader` | `apps/web/src/components/layout/DashboardHeader.tsx` | — | CTA "Nova movimentação" com `disabled` nativo; título da área muda por rota, incluindo "Comparativo" e "Planejamento" |
| `SummaryCard` | `apps/web/src/components/dashboard/SummaryCard.tsx` | 4 indicadores (`realizedIncome`/`realizedExpense`/`realizedBalance`/`projectedBalance`) | Tom `income` / `expense` |
| `FinancialEvolutionChart` | `apps/web/src/components/dashboard/FinancialEvolutionChart.tsx` | — | Default (SVG puro, sem biblioteca) |
| `CategoryBreakdown` | `apps/web/src/components/dashboard/CategoryBreakdown.tsx` | — | Default |
| `RecentEntries` | `apps/web/src/components/dashboard/RecentEntries.tsx` | — | Tabela (desktop) / lista empilhada (mobile, `max-width: 640px`) |
| `UpcomingEntries` | `apps/web/src/components/dashboard/UpcomingEntries.tsx` | — | Com pendências / vazio ("Nenhuma pendência...") |
| `EntryDialog` | `apps/web/src/components/financial-entries/EntryDialog.tsx` | — | Novo (Bloco 07) — casca de diálogo (`<dialog open>`) reutilizada por criação/edição/realização/cancelamento; Escape fecha, foco retorna ao elemento de origem |
| `FinancialEntryForm` | `apps/web/src/components/financial-entries/FinancialEntryForm.tsx` | `mode="create"` / `mode="edit"` | Erro de campo (valor inválido), erro geral (`state.actionError`), sucesso (fecha + toast) |
| `RealizeEntryDialog` | `apps/web/src/components/financial-entries/RealizeEntryDialog.tsx` | — | Novo (Bloco 07) — valor pré-preenchido, mas exige confirmação explícita; erros de campo para valor/data ausentes |
| `CancelEntryDialog` | `apps/web/src/components/financial-entries/CancelEntryDialog.tsx` | — | Novo (Bloco 07) — confirmação obrigatória antes de cancelar |
| `FinancialEntryList` | `apps/web/src/components/financial-entries/FinancialEntryList.tsx` | — | Tabela (desktop) / lista empilhada (mobile, `max-width: 900px`) |
| `FinancialEntryActions` | `apps/web/src/components/financial-entries/FinancialEntryActions.tsx` | — | Botões contextuais por status (`canEdit`/`canMarkPending`/`canRealize`/`canCancel`/`canReactivate`/`canRevertRealization`) |
| `FinancialEntryFilters` | `apps/web/src/components/financial-entries/FinancialEntryFilters.tsx` | — | "Limpar filtros" desabilitado quando já nos valores padrão |
| `FinancialEntryStatusBadge` | `apps/web/src/components/financial-entries/FinancialEntryStatusBadge.tsx` | — | Reaproveita os tons `data-tone` já definidos em `RecentEntries.css` |
| `FinancialEntryEmptyState` | `apps/web/src/components/financial-entries/FinancialEntryEmptyState.tsx` | Sem filtro ativo / com filtro ativo | Default |
| `PeriodComparisonSelector` | `apps/web/src/components/comparison/PeriodComparisonSelector.tsx` | Base / comparado | `<select>` nativo, opções mês/ano em pt-BR, opções conflitantes desabilitadas |
| `ComparisonSummaryCard` | `apps/web/src/components/comparison/ComparisonSummaryCard.tsx` | `income` / `expense` / `balance` | Exibe base, comparado, variação absoluta, percentual e direção textual |
| `CategoryComparison` | `apps/web/src/components/comparison/CategoryComparison.tsx` | — | Tabela responsiva com destaques de maior aumento/redução; estado vazio |
| `NewAndEndedExpenses` | `apps/web/src/components/comparison/NewAndEndedExpenses.tsx` | Despesas novas / encerradas | Listas com estado vazio e descrições originais preservadas |
| `PlannedVsRealized` | `apps/web/src/components/comparison/PlannedVsRealized.tsx` | Um painel por período | Exibe receitas/despesas previstas, realizadas e diferença |
| `ComparisonChart` | `apps/web/src/components/comparison/ComparisonChart.tsx` | — | SVG leve, legenda base/comparado, `<title>`/`<desc>` e resumo textual acessível |
| `ComparisonEmptyState` | `apps/web/src/components/comparison/ComparisonEmptyState.tsx` | — | Vazio para menos de duas competências ou seleção inválida |
| `PlanningSummary` | `apps/web/src/components/planning/PlanningSummary.tsx` | — | Cards de limite total, projetado, saldo restante, total excedido e contagem por status |
| `CategoryBudgetList` | `apps/web/src/components/planning/CategoryBudgetList.tsx` | — | Tabela responsiva (empilha em `max-width: 900px`) com ações "Editar limite"/"Remover limite" ou "Definir limite" por linha |
| `BudgetProgress` | `apps/web/src/components/planning/BudgetProgress.tsx` | `healthy`/`attention`/`exceeded`/`unplanned` (via `data-tone`) | Puramente visual — sempre acompanhada do `statusLabel` em texto (nunca só cor) |
| `CategoryBudgetForm` | `apps/web/src/components/planning/CategoryBudgetForm.tsx` | `mode="create"` / `mode="edit"` | Erro de campo (valor inválido), erro geral (`state.actionError`), sucesso (fecha + toast) |
| `PlanningEntries` | `apps/web/src/components/planning/PlanningEntries.tsx` | Planejadas / pendentes | Listas com estado vazio próprio |
| `PlanningChart` | `apps/web/src/components/planning/PlanningChart.tsx` | — | SVG leve, legenda por status, `<title>`/`<desc>` e resumo textual acessível |
| `PlanningEmptyState` | `apps/web/src/components/planning/PlanningEmptyState.tsx` | — | Vazio para nenhuma competência disponível |

**`PeriodOverview` foi substituído por `HeroBrand`** (correção pós-Bloco 06): a responsabilidade de "hero da competência" passou a incluir a logo oficial, então o componente foi renomeado/absorvido em vez de manter os dois lado a lado com conteúdo duplicado (status/competência apareceriam duas vezes). `PeriodOverview.tsx`/`.css` foram removidos.

Classes utilitárias compartilhadas (`apps/web/src/styles/utilities.css`): `.fh-card`, `.fh-card--elevated`, `.fh-grid`, `.fh-badge`, `.fh-container`, `.fh-visually-hidden`, `.fh-text-secondary`, `.fh-text-muted`.

## 3. Estados Visuais Obrigatórios

Todo componente interativo deve ter comportamento visual definido para:

- [x] Default
- [x] Hover / Focus (`:focus-visible` global em `global.css`; hover em `Sidebar`, `SummaryCard`, `DashboardHeader` CTA)
- [ ] Active / Pressed — não aplicável neste bloco (nenhum componente tem ação real que produza estado "pressionado" persistente; botões são "apenas visuais")
- [x] Disabled — atributo HTML `disabled` nativo (não apenas `aria-disabled`) nos itens de navegação futuros da `Sidebar` e nos dois CTAs visuais ("Nova movimentação", "Revisar mês"); estilo visual próprio (`:disabled` no CSS) para cada um.
- [ ] Loading — não aplicável (dados são síncronos, em memória — nenhuma chamada assíncrona real)
- [x] Erro / Validação — `FinancialEntryForm`/`RealizeEntryDialog` (Bloco 07), `CategoryBudgetForm` (Bloco 09): erro de campo (`role="alert"`, `aria-describedby`) e erro geral vindo do domínio (`state.actionError`)
- [x] Vazio (`UpcomingEntries` quando não há pendências; `FinancialEntryEmptyState` quando a busca/filtro não encontra nada; `ComparisonEmptyState` quando há menos de duas competências; `PlanningEmptyState` quando não há nenhuma competência)

## 4. Regras Obrigatórias

- [x] Antes de criar um componente novo, verificar se um existente (com prop/variante adicional) resolve o mesmo caso.
- [x] Todo componente novo é adicionado a este inventário no mesmo bloco em que é criado.
- [x] Nenhum componente lê fixtures ou recalcula valores monetários diretamente — todos recebem dados já prontos via `view-models/dashboard-view-model.ts`, `view-models/financial-entries-view-model.ts`, `view-models/comparison-view-model.ts` ou `view-models/planning-view-model.ts`.

## 5. Perguntas Orientadoras

- Este componente novo é genuinamente diferente de um já existente, ou é uma variação que deveria ser uma prop?
- Este componente cobre todos os estados visuais obrigatórios listados acima?

## 6. Decisões Pendentes

- ~~Página "Movimentações" ainda não tem componentes próprios~~ — **resolvido no Bloco 07**: componentes em `apps/web/src/components/financial-entries/`.
- ~~Páginas "Comparativo", "Planejamento", "Histórico", "Configurações" ainda não têm componentes próprios~~ — **resolvido para "Comparativo" (Bloco 08) e "Planejamento" (Bloco 09)**; "Histórico" e "Configurações" continuam indisponíveis (`<button disabled>`).
