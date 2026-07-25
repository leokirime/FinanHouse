# Componentes de UI

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Antes de criar um componente novo, verifique aqui se um equivalente já existe. Duplicar componentes com variações pequenas é a forma mais comum de o design system degradar.

## 1. Objetivo

Inventariar os componentes de UI reutilizáveis disponíveis, para evitar duplicação e inconsistência visual.

## 2. Inventário de Componentes (Bloco 06)

| Componente | Onde vive no código | Variantes | Estados suportados |
|---|---|---|---|
| `Brand` | `apps/web/src/components/brand/Brand.tsx` | Completo / compacto (`FH`); tipográfico / com logo (`logoSrc`) | Default — usado apenas em modo tipográfico (sidebar); nenhum arquivo compacto oficial existe ainda |
| `HeroBrand` | `apps/web/src/components/dashboard/HeroBrand.tsx` | — | `open` / `review` / `closed` (via `data-tone`); CTA "Revisar mês" com `disabled` nativo |
| `AppShell` | `apps/web/src/components/layout/AppShell.tsx` | — | Default |
| `Sidebar` | `apps/web/src/components/layout/Sidebar.tsx` | — | Item ativo (`aria-current="page"`, habilitado) / indisponível (`disabled` nativo) |
| `DashboardHeader` | `apps/web/src/components/layout/DashboardHeader.tsx` | — | CTA "Nova movimentação" com `disabled` nativo |
| `SummaryCard` | `apps/web/src/components/dashboard/SummaryCard.tsx` | 4 indicadores (`realizedIncome`/`realizedExpense`/`realizedBalance`/`projectedBalance`) | Tom `income` / `expense` |
| `FinancialEvolutionChart` | `apps/web/src/components/dashboard/FinancialEvolutionChart.tsx` | — | Default (SVG puro, sem biblioteca) |
| `CategoryBreakdown` | `apps/web/src/components/dashboard/CategoryBreakdown.tsx` | — | Default |
| `RecentEntries` | `apps/web/src/components/dashboard/RecentEntries.tsx` | — | Tabela (desktop) / lista empilhada (mobile, `max-width: 640px`) |
| `UpcomingEntries` | `apps/web/src/components/dashboard/UpcomingEntries.tsx` | — | Com pendências / vazio ("Nenhuma pendência...") |

**`PeriodOverview` foi substituído por `HeroBrand`** (correção pós-Bloco 06): a responsabilidade de "hero da competência" passou a incluir a logo oficial, então o componente foi renomeado/absorvido em vez de manter os dois lado a lado com conteúdo duplicado (status/competência apareceriam duas vezes). `PeriodOverview.tsx`/`.css` foram removidos.

Classes utilitárias compartilhadas (`apps/web/src/styles/utilities.css`): `.fh-card`, `.fh-card--elevated`, `.fh-grid`, `.fh-badge`, `.fh-container`, `.fh-visually-hidden`, `.fh-text-secondary`, `.fh-text-muted`.

## 3. Estados Visuais Obrigatórios

Todo componente interativo deve ter comportamento visual definido para:

- [x] Default
- [x] Hover / Focus (`:focus-visible` global em `global.css`; hover em `Sidebar`, `SummaryCard`, `DashboardHeader` CTA)
- [ ] Active / Pressed — não aplicável neste bloco (nenhum componente tem ação real que produza estado "pressionado" persistente; botões são "apenas visuais")
- [x] Disabled — atributo HTML `disabled` nativo (não apenas `aria-disabled`) nos itens de navegação futuros da `Sidebar` e nos dois CTAs visuais ("Nova movimentação", "Revisar mês"); estilo visual próprio (`:disabled` no CSS) para cada um.
- [ ] Loading — não aplicável (dados são síncronos, vindos de fixtures em memória)
- [ ] Erro / Validação — não aplicável (não há formulários neste bloco)
- [x] Vazio (`UpcomingEntries` quando não há pendências)

## 4. Regras Obrigatórias

- [x] Antes de criar um componente novo, verificar se um existente (com prop/variante adicional) resolve o mesmo caso.
- [x] Todo componente novo é adicionado a este inventário no mesmo bloco em que é criado.
- [x] Nenhum componente lê fixtures ou recalcula valores monetários diretamente — todos recebem dados já prontos via `view-models/dashboard-view-model.ts` (ver `Docs/02_architecture/arquitetura_visual_dashboard.md`).

## 5. Perguntas Orientadoras

- Este componente novo é genuinamente diferente de um já existente, ou é uma variação que deveria ser uma prop?
- Este componente cobre todos os estados visuais obrigatórios listados acima?

## 6. Decisões Pendentes

- P4 — Páginas "Movimentações", "Comparativo", "Planejamento", "Histórico", "Configurações" ainda não têm componentes próprios (apenas itens de navegação não funcionais na `Sidebar`).
