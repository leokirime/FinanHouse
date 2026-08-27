# Estado Temporário do Frontend (Modo Demonstrativo) — RETIRADO NO BLOCO 17

> Projeto: HouseManager · Gerado no Bloco 07 (`bloco_07_movimentacoes_funcionais_com_estado_em_memoria`) · 2026-07-25 · Retirado em 2026-08-01 (`bloco_17_integracao_direta_do_frontend_com_a_api_real`)

> **Este documento descreve arquitetura histórica, removida do runtime no Bloco 17.** `FinanceDemoProvider`, `financeDemoReducer` e `data/dashboard-fixtures.ts` foram removidos de `apps/web/src` — o frontend real consome exclusivamente a API HTTP (DT-12, `Docs/03_contracts/contrato_frontend_backend.md`). A mesma lógica de transição (delegando a `@finanhouse/domain`) foi portada para `apps/web/src/state/test-support/` como infraestrutura **exclusiva de teste**, nunca importada por `main.tsx`. O texto abaixo é preservado como registro histórico do Bloco 07 — não reflete o estado atual do código.

> Este documento descreve o estado financeiro compartilhado que torna o dashboard e a página de Movimentações interativos, **inteiramente em memória do navegador**. Não representa nem deve ser lido como evidência de persistência real — não há banco de dados, API HTTP nem armazenamento local envolvidos.

## 1. Por Que Existe

Até o Bloco 06, o dashboard era somente leitura sobre fixtures estáticas. Para demonstrar o ciclo de vida real de uma movimentação (criar, editar, marcar pendente, realizar, cancelar, reativar) e ver o dashboard reagir a isso, era preciso um estado que pudesse mudar durante a sessão do navegador — sem, no entanto, adiantar a persistência real, que continua bloqueada pelo TLS (Bloco 04).

## 2. Camadas

```
apps/web/src/data/dashboard-fixtures.ts              (dados fictícios — usados só como estado INICIAL)
        │
        ▼  (uma única leitura, na inicialização)
apps/web/src/state/finance-demo-initial-state.ts      (createInitialFinanceDemoState())
        │
        ▼
apps/web/src/state/FinanceDemoProvider.tsx             (useReducer + React Context — fonte única do estado vivo)
        │
        ├──▶ apps/web/src/hooks/use-finance-demo.ts          (acesso a { state, dispatch })
        │
        ├──▶ apps/web/src/hooks/use-dashboard-view-model.ts  (dashboard deriva do estado)
        │        └──▶ view-models/dashboard-view-model.ts     (recebe entries/categories/periods por argumento)
        │
        ├──▶ apps/web/src/pages/FinancialEntriesPage.tsx      (Movimentações lê e despacha ações no mesmo estado)
        │        └──▶ view-models/financial-entries-view-model.ts  (filtros/busca/rótulos de exibição)
        │
        ├──▶ apps/web/src/pages/ComparisonPage.tsx            (Comparativo lê o mesmo estado, sem despachar)
        │        └──▶ view-models/comparison-view-model.ts    (seletores, indicadores e gráfico)
        │
        ├──▶ apps/web/src/pages/PlanningPage.tsx              (Planejamento lê e despacha ações no mesmo estado)
        │        └──▶ view-models/planning-view-model.ts      (resumo, linhas por categoria, gráfico)
        │
        └──▶ apps/web/src/pages/HistoryPage.tsx               (Histórico lê o mesmo estado, sem despachar — somente leitura)
                 └──▶ view-models/history-view-model.ts       (competências, filtros, resumo, movimentações)
```

- **Fixtures**: continuam existindo (`data/dashboard-fixtures.ts`), mas agora só são lidas em um lugar — `createInitialFinanceDemoState()` — para montar o estado inicial. Nenhum componente de UI importa fixtures diretamente.
- **Estado vivo**: um único `useReducer` (`financeDemoReducer`) dentro de `FinanceDemoProvider`, exposto via Context. Dashboard, Movimentações, Planejamento e Histórico leem o mesmo `state`; Dashboard/Movimentações/Planejamento também despacham ações no mesmo `dispatch` — nunca há dois estados financeiros paralelos. Histórico é a única área que **nunca** despacha nenhuma ação (somente leitura por design).
- **View-models**: `dashboard-view-model.ts`, `financial-entries-view-model.ts`, `comparison-view-model.ts`, `planning-view-model.ts` e `history-view-model.ts` são funções puras que recebem dados por argumento (não leem Context nem fixtures) — só formatam/derivam o que os componentes precisam.

## 3. Ciclo de Vida em Memória

- O estado inicial é construído uma vez, quando `<FinanceDemoProvider>` monta (em `main.tsx`, envolvendo toda a aplicação).
- Toda mudança (criar, editar, mudar status) passa por `financeDemoReducer`, que **nunca reimplementa regra financeira** — localiza as entidades relacionadas (período, categoria, membro) no próprio estado e delega a validação/transição para as funções nomeadas de `@finanhouse/domain` (`createFinancialEntry`, `updateFinancialEntry`, `markFinancialEntryAsPending`, `realizeFinancialEntry`, `cancelFinancialEntry`, `reactivateFinancialEntry`, `revertFinancialEntryRealization`).
- Erros de domínio (`DomainError` e subclasses) são capturados dentro do reducer e viram `state.actionError` — nunca lançados durante o render do React.
- **Ao recarregar a página, `FinanceDemoProvider` é remontado e `createInitialFinanceDemoState()` roda de novo** — o estado volta exatamente ao ponto de partida das fixtures. Isso é testado explicitamente (`state/FinanceDemoProvider.test.tsx`, remontando o provider e conferindo que o estado reseta).
- Nenhum dado é persistido em `localStorage`, `IndexedDB`, cookies ou service worker — confirmado por checagem estática automatizada (`state/finance-demo-no-persistence.test.ts`).

## 4. Operações Disponíveis

| Ação (`dispatch`) | Função de domínio delegada | Transição |
|---|---|---|
| `CREATE_ENTRY` | `createFinancialEntry` (+ `markFinancialEntryAsPending` se `initialStatus: 'pending'`) | — → `planned` (ou `pending`) |
| `UPDATE_ENTRY` | `updateFinancialEntry` | `planned`/`pending` (edição direta) |
| `MARK_PENDING` | `markFinancialEntryAsPending` | `planned` → `pending` |
| `REALIZE` | `realizeFinancialEntry` | `planned`\|`pending` → `realized` |
| `CANCEL` | `cancelFinancialEntry` | `planned`\|`pending` → `cancelled` |
| `REACTIVATE` | `reactivateFinancialEntry` | `cancelled` → `planned` |
| `REVERT_REALIZATION` | `revertFinancialEntryRealization` | `realized` → `pending` (estorno) |
| `CREATE_CATEGORY_BUDGET` | `createCategoryBudget` | — → limite de orçamento novo (sempre na competência atual) |
| `UPDATE_CATEGORY_BUDGET` | `updateCategoryBudget` | altera `limitAmount` de um limite existente |
| `REMOVE_CATEGORY_BUDGET` | `assertCategoryBudgetRemovable` (remoção feita pelo reducer após validar) | remove o limite do estado da sessão |
| `CLEAR_ERROR` / `CLEAR_MESSAGE` | — | limpa `actionError`/`lastActionMessage` |
| `RESET` | `createInitialFinanceDemoState()` | volta tudo às fixtures (inclui `categoryBudgets`) |

`realized → cancelled` direto **não existe** — é preciso estornar primeiro (mesma regra do domínio desde o Bloco 05).

## 5. Regras de Formulário

- Valor previsto/realizado: o texto do campo é convertido para `Money` via `parseMoney` (a mesma função do domínio) — nunca via `Number()`/`parseFloat`. Isso já rejeita, pelo formato exigido (`\d+\.\d\d`), sinal negativo, mais de duas casas decimais e texto não numérico; `assertPositiveMoney` (dentro das funções de domínio) rejeita zero.
- Categoria: o `<select>` só lista categorias ativas do mesmo `entryType` da movimentação — o domínio valida de novo no reducer (defesa em profundidade).
- Membro responsável: o `<select>` só lista membros ativos.
- Competência: sempre a competência atual do estado (`state.currentPeriodId`) — o formulário não permite escolher outra. Ela precisa estar `open` para criar/editar normalmente (ver `Docs/02_architecture/regras_dominio_financeiro.md`, seção 5).
- Realização exige valor **e** data explícitos — o campo de valor vem pré-preenchido com o valor previsto (visível, editável), mas a realização só ocorre com confirmação explícita do formulário, nunca automaticamente.

## 6. Nenhuma Duplicação de Regra Financeira

`apps/web` não importa `mysql2`, `drizzle-orm`, arquivos `.env*`, scripts de migration nem repositórios da API — apenas `@finanhouse/domain` (funções puras) e seus próprios componentes/estado. As classes de serviço de `apps/api/src/application/services/` (que orquestram repositórios reais) **não** foram movidas nem duplicadas — o frontend orquestra sozinho, no reducer, chamando diretamente as mesmas funções de regra que essas classes usam.

## 7. Comparativo Mensal em Memória

O Bloco 08 adicionou a rota `/comparativo`, também alimentada por `FinanceDemoProvider`. A página mantém apenas o estado local dos IDs selecionados nos dois seletores; os dados financeiros continuam vindo de `useFinanceDemo()` e todos os cálculos ficam em `view-models/comparison-view-model.ts` + `@finanhouse/domain`.

Regras registradas:

- Seletores: opções derivadas de `state.periods`, ordenadas por `referenceMonth` da mais recente para a mais antiga; padrão = `state.currentPeriodId` como base e `state.previousPeriodId` como comparado; os dois seletores nunca mantêm o mesmo ID.
- Indicadores: `compareMonthlyPeriods`, `calculateMonthlySummary` e `calculateChange` fornecem receitas/despesas/saldo realizados, fechamento projetado, receitas/despesas previstas, variação absoluta e percentual.
- Divisão por zero: percentual `null` vira "Sem base comparável"; nenhuma UI inventa percentual quando o período comparado é zero.
- Chave de despesa nova/encerrada: tipo de lançamento + categoria + descrição normalizada (`trim`, lowercase, espaços repetidos colapsados), preservando a descrição original na apresentação.
- Previsto vs. realizado: `cancelled` fica fora dos totais; `planned` e `pending` compõem projeção com `expectedAmount`; `realized` usa `actualAmount`.
- Sincronização: criar, realizar ou cancelar uma movimentação em Movimentações atualiza o Comparativo na mesma sessão porque ambos leem o mesmo estado; remontar o provider retorna às fixtures.
- Persistência: não há `localStorage`, `IndexedDB`, cookies, API HTTP, banco, migrations ou dados reais.

O refinamento visual do Comparativo segue como P3 no backlog de design, junto da evolução visual já registrada para Dashboard/Movimentações.

## 8. Planejamento Mensal em Memória

O Bloco 09 adicionou a rota `/planejamento`, também alimentada por `FinanceDemoProvider`. A página mantém apenas o estado local da competência sendo visualizada (`selectedPeriodId`) e de qual diálogo está aberto; os limites (`state.categoryBudgets`) e os cálculos ficam em `view-models/planning-view-model.ts` + `@finanhouse/domain` (`packages/domain/src/planning/`).

Modelo `CategoryBudget` (`packages/domain/src/planning/category-budget.ts`): `{ id, householdId, periodId, categoryId, limitAmount }` — no máximo um por `(periodId, categoryId)`. A ausência de um `CategoryBudget` para uma categoria/competência **nunca** é representada como limite zero — é `null` em todo o pipeline (domínio → view-model → UI).

Regras registradas:

- Limite: `bigint` de centavos, sempre positivo (`assertPositiveMoney`); só pode ser criado/editado/removido com a competência `open` ou `review` (`assertPeriodAllowsBudgetChanges` — diferente das movimentações comuns, que bloqueiam `review` por padrão); `closed` sempre bloqueia. Categoria precisa ser `expense` e `active`; household do limite, período e categoria precisam bater.
- Criação de um **novo** limite (formulário "Definir limite") é oferecida apenas para a competência atual do estado (`state.currentPeriodId`) — mesma convenção já usada para criar movimentações (`Docs/02_architecture/estado_temporario_frontend.md`, seção 5). Editar/remover um limite existente funciona em qualquer competência não fechada em que ele exista, inclusive ao navegar para uma competência passada pelo seletor da página.
- Cálculo por categoria (`summarizeCategoryBudget`/`buildCategoryBudgetSummaries`, `packages/domain/src/planning/category-budget-calculations.ts`): `realizedAmount` usa `actualAmount` de `realized`; `pendingAmount` usa `expectedAmount` de `pending`; `plannedAmount` usa `expectedAmount` de `planned`; `cancelled` nunca compõe nenhum total; `projectedAmount = realized + pending + planned`.
- Estados: `healthy` (projeção < 80% do limite), `attention` (projeção entre 80% e 100% do limite, inclusive), `exceeded` (projeção > limite), `unplanned` (há despesa não cancelada, mas nenhum limite definido). Percentual (`percentConsumed`) é `null` sem limite — nunca `NaN`/`Infinity`/zero inventado.
- Categoria de despesa sem limite **e** sem nenhuma despesa não cancelada na competência **não aparece na lista** — decisão documentada aqui (não é um estado "unplanned": não há nada de orçamento a mostrar). Ver `buildCategoryBudgetSummaries`.
- Sincronização: criar, editar, realizar ou cancelar uma movimentação de despesa em Movimentações atualiza o Planejamento na mesma sessão (mesmo `state.entries`); criar/editar/remover um limite atualiza os indicadores imediatamente; remontar o provider retorna às fixtures (incluindo `categoryBudgets`).
- Persistência: não há `localStorage`, `IndexedDB`, cookies, API HTTP, banco, migrations ou dados reais.

O refinamento visual do Planejamento segue como P3 no backlog de design, junto da evolução visual já registrada para Dashboard/Movimentações/Comparativo.

## 9. Histórico Mensal em Memória (Somente Leitura)

O Bloco 10 adicionou a rota `/historico`, também alimentada por `FinanceDemoProvider`, mas **estritamente consultiva**: a página nunca despacha nenhuma ação — apenas lê `state.periods`/`state.entries`/`state.categories` e mantém localmente a competência selecionada e os filtros ativos (nunca escritos de volta no estado compartilhado). Todos os cálculos ficam em `view-models/history-view-model.ts` + `@finanhouse/domain` (`calculateMonthlySummary`, reaproveitado sem duplicar fórmula).

Regras registradas:

- Ordenação: competências da mais recente para a mais antiga (por `referenceMonth`); movimentações da data mais recente para a mais antiga (`realizationDate ?? dueDate`).
- Filtros (aplicados só na leitura, nunca alteram `state`): ano (`all` ou um ano específico, derivado de `referenceMonth`), status da competência (`all`/`open`/`review`/`closed`), status da movimentação (`all`/`planned`/`pending`/`realized`/`cancelled`).
- Resumo por competência: `calculateMonthlySummary` fornece receita/despesa/saldo realizados e fechamento projetado; `cancelled` nunca compõe nenhum total (já garantido pela função de domínio).
- Contagem por status: `planned`/`pending`/`realized`/`cancelled`, calculada sobre as movimentações da competência selecionada (antes do filtro de status de movimentação, para mostrar o panorama completo).
- Nenhuma ação de mutação: sem botões de editar/realizar/cancelar/excluir/reativar em nenhum componente de `components/history/`.
- Sincronização: criar, editar, realizar ou cancelar uma movimentação em Movimentações atualiza o Histórico na mesma sessão (mesmo `state.entries`); alterações em Planejamento (`state.categoryBudgets`) **não** afetam os valores históricos de movimentações, pois `history-view-model.ts` nunca lê `categoryBudgets`. Remontar o provider retorna às fixtures.
- Persistência: não há `localStorage`, `IndexedDB`, cookies, API HTTP, banco, migrations ou dados reais.

O refinamento visual do Histórico segue como P3 no backlog de design, junto da evolução visual já registrada para Dashboard/Movimentações/Comparativo/Planejamento.

## 10. Execução Local do Frontend

`npm run dev:web` (raiz do monorepo) executa `predev:web` (`npm run build:domain`) antes de iniciar o Vite do workspace `web` — garante que `packages/domain/dist/index.js` existe sem exigir compilação manual, sem rodar `clean` (que apagaria o `dist` recém-gerado) e sem iniciar a API ou tocar no banco. Ver `apps/web/README.md`.

## 11. Substituição Futura Pela API Real

Quando a persistência real for liberada (pós-TLS, Bloco 04), a substituição esperada é trocar `FinanceDemoProvider` por um provider que busca/envia dados via HTTP para `apps/api`, mantendo a mesma interface (`useFinanceDemo()` retornando `{ state, dispatch }` ou equivalente) — `dashboard-view-model.ts`, `financial-entries-view-model.ts`, `comparison-view-model.ts`, `planning-view-model.ts`, `history-view-model.ts` e todos os componentes de UI não precisam mudar, pois já recebem dados por argumento/Context, nunca leem fixtures diretamente.

## 12. O Que Ainda Não Existe

- Persistência real (banco, API HTTP) — ver `Docs/02_architecture/regras_dominio_financeiro.md` e `Docs/02_architecture/arquitetura_visual_dashboard.md`.
- Autenticação — `DEMO_CREATED_BY_USER_ID` é uma constante fictícia, não um usuário autenticado.
- Página "Configurações" — apenas item de navegação não funcional.
- Refinamento visual do dashboard, Movimentações, Comparativo, Planejamento e Histórico — ver `Docs/07_design_system/backlog_refinamento_visual.md`.
