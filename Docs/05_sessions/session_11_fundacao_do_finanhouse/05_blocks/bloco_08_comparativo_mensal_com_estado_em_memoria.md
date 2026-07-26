# Bloco 08 — Comparativo mensal com estado em memória

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Implementar uma área funcional para comparar duas competências financeiras, utilizando a mesma fonte de estado temporário do dashboard e de Movimentações, sem banco de dados ou persistência permanente.

## 2. Contexto

Os Blocos 06 e 07 entregaram, respectivamente, o dashboard visual e a área de Movimentações, ambos consumindo o mesmo estado financeiro compartilhado em memória (`FinanceDemoProvider`). O roteamento foi corrigido para `react-router@8.3.0` (DT-03) antes deste bloco começar. O próximo passo natural do produto (`Docs/01_product/requisitos_funcionais.md`, "comparação entre períodos") é permitir que o proprietário compare duas competências mensais sem precisar de banco de dados real.

## 3. Problema que Este Bloco Resolve

Hoje não é possível visualizar, dentro do Finanhouse, como uma competência evoluiu em relação a outra — nem em indicadores agregados, nem por categoria, nem em despesas novas/descontinuadas, nem em planejado vs. realizado. Este bloco resolve isso com uma área "Comparativo" que deriva tudo do mesmo estado em memória já existente, reaproveitando as funções de comparação já implementadas em `@finanhouse/domain`.

## 4. Escopo

- Rota `/comparativo` e item "Comparativo" habilitado na `Sidebar` (mantendo "Planejamento"/"Histórico"/"Configurações" desabilitados).
- Seleção de duas competências: período base + período comparado, padrão = competência atual + imediatamente anterior; nunca permitir selecionar o mesmo período duas vezes; ordenação mais recente → mais antiga; rótulos em pt-BR (mês/ano); seleção válida preservada quando os dados mudam (ex.: nova movimentação criada); estado vazio explícito quando existem menos de duas competências (nunca inventar competência).
- Indicadores comparativos: receita realizada, despesa realizada, saldo realizado, fechamento projetado, receita esperada, despesa esperada — cada um com valor base, valor comparado, variação absoluta e variação percentual quando há base válida; texto "Sem base comparável" quando o valor anterior é zero; nunca `NaN`/`Infinity`/divisão por zero/percentuais inventados; dinheiro sempre `bigint` centavos; formatação pt-BR segura; aumento de despesa deve ser lido como piora, nunca só por cor.
- Comparação por categoria (despesas): total base, total comparado, diferença absoluta, variação percentual, rótulo de direção (aumentou/diminuiu/permaneceu estável/sem base), ordenado pela maior variação absoluta, destaque textual dos maiores aumentos/quedas, nunca misturar receita e despesa sem rótulo claro.
- Despesas novas e descontinuadas: presente na base mas não na comparada = nova; presente na comparada mas não na base = descontinuada; chave de comparação documentada = categoria + descrição normalizada (trim, minúsculas, espaços colapsados) + tipo de lançamento — nunca o ID da movimentação (IDs diferem entre competências); nunca alterar a descrição exibida na UI.
- Planejado vs. realizado por período: receita/despesa esperada e realizada, diferença; `cancelled` nunca compõe totais; `planned`/`pending` compõem a projeção; `realized` compõe o valor realizado; valores realizados usam `actualAmount`, valores não realizados usam `expectedAmount` na projeção — reaproveitando funções de domínio existentes, nunca reimplementando fórmulas em JSX.
- Visualização leve em SVG/CSS (sem biblioteca de gráficos nova), com título, legenda, resumo textual, alternativa acessível, valores consistentes com os cards, responsiva, com suporte a `prefers-reduced-motion`.

## 5. Fora de Escopo

- MySQL, API HTTP real, Drizzle em runtime, migrations, seeds.
- `localStorage`, `IndexedDB`, autenticação.
- Recorrências, parcelamentos, Planejamento completo, Histórico completo.
- Redesign geral do dashboard/Movimentações (refinamento visual continua no backlog próprio).
- Biblioteca de gráficos pesada.

## 6. Arquivos e Pastas Envolvidos

- `apps/web/src/components/comparison/{PeriodComparisonSelector,ComparisonSummaryCard,CategoryComparison,NewAndEndedExpenses,PlannedVsRealized,ComparisonChart,ComparisonEmptyState}.tsx` (+ `.css`)
- `apps/web/src/pages/ComparisonPage.tsx`
- `apps/web/src/view-models/comparison-view-model.ts`
- `apps/web/src/components/layout/Sidebar.tsx` (habilitar "Comparativo"), `apps/web/src/App.tsx` (rota `/comparativo`)
- `packages/domain/src/**` — apenas se uma regra pura ainda não existir e precisar ser adicionada (com testes próprios, exportada via `index.ts`)
- `Docs/01_product/requisitos_funcionais.md`, `Docs/02_architecture/estado_temporario_frontend.md`, `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/07_design_system/componentes_ui.md`, `apps/web/README.md`
- Não tocar em `apps/api/src/db/**`, `database/migrations/**`, `apps/api/.env.local`

## 7. Dependências

- Bloco 07 (Movimentações funcionais com estado em memória, integrado à `main` em `27b2491`, incluindo a correção DT-03 do roteador)
- `@finanhouse/domain` — `compareMonthlyPeriods`, `calculateMonthlySummary`, `formatMoney` e demais funções de comparação/resumo já implementadas no Bloco 05

## 8. Plano de Implementação

1. Criar `view-models/comparison-view-model.ts`: funções puras que recebem `entries`/`categories`/`periods`/`basePeriodId`/`comparedPeriodId` por argumento e devolvem os dados já formatados para os componentes (indicadores, categorias, novas/descontinuadas, planejado vs. realizado).
2. Adicionar ao `packages/domain` qualquer regra pura ainda inexistente (ex.: comparação por categoria, detecção de despesas novas/descontinuadas), com testes próprios, exportada via `index.ts`.
3. Criar `pages/ComparisonPage.tsx` consumindo `useFinanceDemo()` e o novo view-model — nenhuma leitura direta de fixtures.
4. Criar os componentes de `components/comparison/` (seletor de período, cards de resumo, comparação por categoria, novas/descontinuadas, planejado vs. realizado, gráfico leve, estado vazio).
5. Adicionar rota `/comparativo` em `App.tsx` e habilitar "Comparativo" na `Sidebar` (`NavLink`, `aria-current` automático).
6. Escrever os 40 testes obrigatórios.
7. Documentar e gerar o feedback oficial.

## 8.1. Registro de Implementação

Implementação do Bloco 08:

- Rota: `/comparativo`, adicionada ao `App.tsx` e habilitada na `Sidebar` com `NavLink` de `react-router`.
- Título da área: `RootLayout` mapeia `/comparativo` para "Comparativo".
- Seletores: período base e período comparado usam `state.periods`, ordenados por `referenceMonth` da mais recente para a mais antiga, rótulos em pt-BR, padrão `state.currentPeriodId` + `state.previousPeriodId`, bloqueio de IDs iguais e revalidação quando o estado muda.
- Fonte única de estado: `ComparisonPage` consome apenas `useFinanceDemo()`; não lê fixtures diretamente, não cria provider e não duplica estado financeiro.
- View-model: `apps/web/src/view-models/comparison-view-model.ts` recebe competências, movimentações, categorias, base e comparado por argumento e devolve dados prontos para apresentação.
- Fórmulas: `calculateMonthlySummary`, `compareMonthlyPeriods`, `calculateChange`, `compareExpenseCategoryTotals` e `detectNewAndDiscontinuedExpenses` concentram os cálculos financeiros; JSX não contém fórmulas monetárias.
- Divisão por zero: percentuais com base zero retornam `null` no domínio e são apresentados como "Sem base comparável"; testes cobrem ausência de `NaN`/`Infinity`.
- Chave de comparação de despesas: `entry_type` + categoria + descrição normalizada (`trim`, lowercase, espaços repetidos colapsados); a descrição original é preservada na UI.
- Comportamento em memória: alterações feitas em Movimentações atualizam o Comparativo na mesma sessão; remontar o provider retorna às fixtures.
- Persistência/API: não há `localStorage`, `IndexedDB`, API HTTP real, conexão com MySQL, migration, seed ou dados reais.
- Visualização: gráfico leve em SVG/CSS, com título, legenda, `<desc>` e resumo textual acessível.
- Refinamento visual: permanece como pendência P3 no backlog de design, separado deste bloco.

## 9. Critérios de Aceite

- [x] Rota `/comparativo` navegável a partir da `Sidebar`, com `aria-current="page"` na rota ativa.
- [x] Página consome o mesmo `FinanceDemoProvider` do dashboard/Movimentações — nenhuma leitura direta de fixtures, nenhum estado financeiro paralelo.
- [x] Seleção de período nunca permite o mesmo período duas vezes; ordenação mais recente → mais antiga; estado vazio explícito com menos de duas competências.
- [x] Todos os indicadores/comparações usam funções de `@finanhouse/domain` — nenhuma fórmula financeira duplicada em JSX.
- [x] Nenhum `NaN`/`Infinity`/percentual inventado em nenhum cenário, incluindo período anterior zerado.
- [x] `cancelled` nunca compõe totais; `planned`/`pending` compõem projeção; `realized` usa `actualAmount`.
- [x] Chave de comparação de despesas novas/descontinuadas documentada (categoria + descrição normalizada + tipo) — nunca ID de movimentação.
- [x] Gráfico leve (SVG/CSS) com resumo textual e alternativa acessível, valores consistentes com os cards, responsivo, respeitando `prefers-reduced-motion`.
- [x] Nenhum uso de `localStorage`, `IndexedDB`, `mysql2`, `drizzle-orm` ou `.env*`.
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

Nenhum dado real é usado (fixtures sintéticas, mesmo estado em memória do Bloco 07). Nenhuma autenticação implementada (fora de escopo). Nenhuma conexão com o banco, nenhuma credencial tocada.

## 12. Performance

Cálculos comparativos derivados em memória (`useMemo`/funções puras) a partir do mesmo estado do `FinanceDemoProvider` — sem I/O novo. Nenhuma biblioteca de gráficos adicionada; visualização em SVG/CSS puro, como no dashboard (Bloco 06).

## 13. Design System / UX

Reaproveita tokens e classes utilitárias já existentes (`fh-card`, `fh-badge`, `fh-grid`, etc.) — nenhum novo token de cor introduzido. Novos componentes registrados em `Docs/07_design_system/componentes_ui.md`. Aumento de despesa nunca comunicado só por cor (texto explícito "aumentou"/"piorou" etc.).

## 14. Riscos

- Reaproveitar a chave de comparação errada (ex.: ID de movimentação) quebraria silenciosamente a detecção de despesas novas/descontinuadas entre competências — mitigado por documentar e testar explicitamente a chave (categoria + descrição normalizada + tipo).
- Duplicar fórmulas de domínio em JSX divergiria do que `@finanhouse/domain` já calcula — mitigado por reaproveitar exclusivamente as funções existentes (`compareMonthlyPeriods`, `calculateMonthlySummary`).

## 15. Pendências Esperadas

- P3 — Refinamento visual do Comparativo permanece pendente da mesma sessão dedicada de UI/UX já registrada para Dashboard e Movimentações (`Docs/07_design_system/backlog_refinamento_visual.md`).
- P3 — Quando a API real existir, o Comparativo deve continuar consumindo `useFinanceDemo()` (ou seu substituto HTTP), sem duplicar lógica.
- P4 — "Planejamento" e "Histórico" continuam apenas itens de navegação não funcionais.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_08_comparativo_mensal_com_estado_em_memoria --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

```
feat(web): implementar comparativo mensal em memória
```
