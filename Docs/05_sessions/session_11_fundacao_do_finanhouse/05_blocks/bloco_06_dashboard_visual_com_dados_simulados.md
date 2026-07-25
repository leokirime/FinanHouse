# Bloco 06 — Dashboard visual com dados simulados

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Construir a primeira interface visual navegável do Finanhouse (dashboard de visão geral), usando dados sintéticos e as funções puras de `@finanhouse/domain`, sem banco de dados, API real ou persistência.

## 2. Contexto

Com os Blocos 04 (TLS) e 05 (regras de domínio) integrados à `main` e `@finanhouse/domain` comprovadamente funcional em runtime compilado, não há mais bloqueio técnico para começar a interface. O TLS estrito continua pendente de resposta da Clever Cloud (Bloco 04) e a persistência real segue bloqueada — isso não impede a construção da camada visual, que consome apenas dados fictícios e cálculos derivados do pacote de domínio.

## 3. Problema que Este Bloco Resolve

Até aqui o projeto só existe como regras de domínio testadas e infraestrutura de backend — não há nada visível ou demonstrável. Este bloco resolve isso entregando uma interface navegável que já usa os cálculos reais do domínio (resumo mensal, comparação, formatação monetária), permitindo validar a direção visual e a experiência antes de existir qualquer dado real.

## 4. Escopo

- Design tokens (`tokens.css`, `global.css`, `utilities.css`) para a identidade visual preta/roxa
- App shell: `Sidebar`, `DashboardHeader`, `AppShell`
- Componente de marca (`Brand.tsx`) com fallback tipográfico quando a logo oficial não existir
- Dashboard de visão geral: status da competência, 4 indicadores principais, evolução financeira (SVG/CSS), distribuição de despesas, movimentações recentes, pendências próximas
- Fixtures sintéticas centralizadas (`data/dashboard-fixtures.ts`) e view-model (`view-models/dashboard-view-model.ts`) consumindo `@finanhouse/domain` (resumo mensal, comparação, cálculo de saldos)
- Função de formatação monetária pt-BR segura para `bigint` (`utils/format-money-pt-br.ts`)
- `@finanhouse/domain` adicionado como dependência explícita de `apps/web`, com `dev:web`/build ajustados para compilar o domain antes do Vite
- Responsividade (desktop/tablet/mobile) e acessibilidade básica (landmarks, `aria-current`, foco visível, `prefers-reduced-motion`)
- Testes automatizados da camada visual
- Documentação da arquitetura visual

## 5. Fora de Escopo

- Conexão com o banco MySQL real, API real, endpoints financeiros
- Autenticação, login, formulários completos, CRUD persistente
- Aplicação de migration, seeds, alteração de `DATABASE_SSL`, repositórios Drizzle
- Dados reais do proprietário
- Deploy
- Bibliotecas de gráficos pesadas (Chart.js, Recharts, D3, etc.) — apenas SVG/CSS
- Implementação completa das áreas "Movimentações", "Comparativo", "Planejamento", "Histórico", "Configurações" (apenas navegação visual não funcional além de "Visão geral")
- Roteador de páginas (sem `react-router` ou equivalente — apenas um item de navegação ativo)

## 6. Arquivos e Pastas Envolvidos

- `apps/web/src/styles/{tokens,global,utilities}.css`
- `apps/web/src/data/dashboard-fixtures.ts`
- `apps/web/src/view-models/dashboard-view-model.ts`
- `apps/web/src/utils/format-money-pt-br.ts`
- `apps/web/src/components/layout/{AppShell,Sidebar,DashboardHeader}.tsx`
- `apps/web/src/components/dashboard/{PeriodOverview,SummaryCard,FinancialEvolutionChart,CategoryBreakdown,RecentEntries,UpcomingEntries}.tsx`
- `apps/web/src/components/brand/Brand.tsx`
- `apps/web/src/pages/DashboardPage.tsx`
- `apps/web/src/App.tsx` (integração)
- `apps/web/package.json` (dependência `@finanhouse/domain`)
- `package.json` (raiz, ajuste de `dev:web` se necessário)
- `Docs/07_design_system/` (documentação de tokens/componentes, se aplicável) e/ou novo documento em `Docs/02_architecture/`
- Não tocar em `apps/api/src/db/**`, `database/migrations/**`, `apps/api/.env.local`, branches dos Blocos 04/05

## 7. Dependências

- Bloco 05 (`@finanhouse/domain` compilado, com build real e `verify:runtime` validado)
- Nenhuma dependência do Bloco 04 (TLS) — trabalho totalmente independente do banco

## 8. Plano de Implementação

1. Adicionar `@finanhouse/domain` como dependência de `apps/web` e ajustar `dev:web`/build para compilar o domain antes do Vite.
2. Verificar `assets/brand/` e criar `Brand.tsx` com fallback tipográfico se a logo oficial não existir.
3. Criar design tokens (`tokens.css`, `global.css`, `utilities.css`) para a identidade preta/roxa.
4. Criar `format-money-pt-br.ts` (formatação segura de `bigint` centavos → pt-BR) com testes.
5. Criar fixtures sintéticas (`dashboard-fixtures.ts`) e o view-model (`dashboard-view-model.ts`) usando `calculateMonthlySummary`/`compareMonthlyPeriods`/`parseMoney` de `@finanhouse/domain`.
6. Criar componentes de layout (`AppShell`, `Sidebar`, `DashboardHeader`).
7. Criar componentes do dashboard (`PeriodOverview`, `SummaryCard`, `FinancialEvolutionChart`, `CategoryBreakdown`, `RecentEntries`, `UpcomingEntries`).
8. Criar `DashboardPage.tsx` e integrar no `App.tsx`.
9. Escrever testes da camada visual.
10. Verificar responsividade (1440/1024/768/390px) e acessibilidade básica.
11. Documentar a arquitetura visual.
12. Gerar e preencher o feedback oficial do bloco.

## 9. Critérios de Aceite

- [ ] Todos os valores monetários exibidos derivam da mesma coleção de fixtures, via `@finanhouse/domain` (sem duplicar fórmulas no frontend)
- [ ] Formatação monetária pt-BR não converte `bigint` para `number` para formatar
- [ ] Apenas "Visão geral" é navegação funcional; demais itens não levam a páginas inexistentes
- [ ] Nenhum dado real do proprietário é usado
- [ ] Gráfico de evolução não produz `NaN`/`Infinity` e possui resumo textual alternativo
- [ ] `aria-current="page"` no item de navegação ativo; foco visível; landmarks semânticos
- [ ] Layout responsivo nas larguras 1440/1024/768/390px sem rolagem horizontal obrigatória
- [ ] `apps/web` importa `@finanhouse/domain` compilado (`dist/`), não `.ts` diretamente
- [ ] Nenhum arquivo novo importa `mysql2`, `drizzle-orm`, `.env*` ou scripts de migration

## 10. Validações Obrigatórias

- [ ] `npm ci`
- [ ] `npm run clean`
- [ ] `npm run build`
- [ ] `npm run verify:runtime`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `npm audit --omit=dev` / `npm audit`

## 11. Segurança

Nenhum dado real é usado (apenas fixtures sintéticas). Nenhum arquivo deste bloco acessa `apps/api/.env.local` ou credenciais. Nenhuma autenticação implementada — o dashboard é um protótipo visual sem controle de acesso, explicitamente fora de escopo.

## 12. Performance

Sem bibliotecas de gráficos pesadas (SVG/CSS puro). Bundle do `apps/web` deve permanecer enxuto — sem novas dependências de runtime além de `@finanhouse/domain` (workspace).

## 13. Design System / UX

Introduz a primeira versão de `Docs/07_design_system/` para o Finanhouse: identidade preta/roxa, tokens de cor/espaçamento/sombra, padrões de card, tipografia. Documentado em `Docs/07_design_system/` e/ou `Docs/02_architecture/arquitetura_visual_dashboard.md`.

## 14. Riscos

- Ausência da logo oficial em `assets/brand/` pode obrigar o uso do fallback tipográfico — mitigado por deixar o componente `Brand.tsx` preparado para receber o arquivo depois, sem bloquear o bloco.
- Definições visuais (cores, espaçamento) são decisões de produto tanto quanto técnicas — documentadas explicitamente para revisão do proprietário no checkpoint visual anunciado.
- Gráfico de evolução em SVG/CSS puro tem menos recursos que uma biblioteca dedicada — aceitável nesta fase (protótipo com dados simulados).

## 15. Pendências Esperadas

- P3 — Quando a logo oficial do Finanhouse estiver disponível em `assets/brand/`, substituir o fallback tipográfico de `Brand.tsx`.
- P3 — Quando a persistência real for liberada, `dashboard-view-model.ts` precisará trocar as fixtures sintéticas por dados vindos de repositórios reais, mantendo a mesma interface de saída.
- P4 — Páginas "Movimentações", "Comparativo", "Planejamento", "Histórico" e "Configurações" continuam não implementadas (apenas itens de navegação não funcionais).

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_06_dashboard_visual_com_dados_simulados --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
feat(web): construir dashboard visual com dados simulados
```
