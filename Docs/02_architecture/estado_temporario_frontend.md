# Estado Temporário do Frontend (Modo Demonstrativo)

> Projeto: FinanHouse · Gerado no Bloco 07 (`bloco_07_movimentacoes_funcionais_com_estado_em_memoria`) · 2026-07-25

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
        └──▶ apps/web/src/pages/FinancialEntriesPage.tsx      (Movimentações lê e despacha ações no mesmo estado)
                 └──▶ view-models/financial-entries-view-model.ts  (filtros/busca/rótulos de exibição)
```

- **Fixtures**: continuam existindo (`data/dashboard-fixtures.ts`), mas agora só são lidas em um lugar — `createInitialFinanceDemoState()` — para montar o estado inicial. Nenhum componente de UI importa fixtures diretamente.
- **Estado vivo**: um único `useReducer` (`financeDemoReducer`) dentro de `FinanceDemoProvider`, exposto via Context. Dashboard e Movimentações leem o mesmo `state` e despacham ações no mesmo `dispatch` — nunca há dois estados financeiros paralelos.
- **View-models**: tanto `dashboard-view-model.ts` quanto `financial-entries-view-model.ts` são funções puras que recebem dados por argumento (não leem Context nem fixtures) — só formatam/derivam o que os componentes precisam.

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
| `CLEAR_ERROR` / `CLEAR_MESSAGE` | — | limpa `actionError`/`lastActionMessage` |
| `RESET` | `createInitialFinanceDemoState()` | volta tudo às fixtures |

`realized → cancelled` direto **não existe** — é preciso estornar primeiro (mesma regra do domínio desde o Bloco 05).

## 5. Regras de Formulário

- Valor previsto/realizado: o texto do campo é convertido para `Money` via `parseMoney` (a mesma função do domínio) — nunca via `Number()`/`parseFloat`. Isso já rejeita, pelo formato exigido (`\d+\.\d\d`), sinal negativo, mais de duas casas decimais e texto não numérico; `assertPositiveMoney` (dentro das funções de domínio) rejeita zero.
- Categoria: o `<select>` só lista categorias ativas do mesmo `entryType` da movimentação — o domínio valida de novo no reducer (defesa em profundidade).
- Membro responsável: o `<select>` só lista membros ativos.
- Competência: sempre a competência atual do estado (`state.currentPeriodId`) — o formulário não permite escolher outra. Ela precisa estar `open` para criar/editar normalmente (ver `Docs/02_architecture/regras_dominio_financeiro.md`, seção 5).
- Realização exige valor **e** data explícitos — o campo de valor vem pré-preenchido com o valor previsto (visível, editável), mas a realização só ocorre com confirmação explícita do formulário, nunca automaticamente.

## 6. Nenhuma Duplicação de Regra Financeira

`apps/web` não importa `mysql2`, `drizzle-orm`, arquivos `.env*`, scripts de migration nem repositórios da API — apenas `@finanhouse/domain` (funções puras) e seus próprios componentes/estado. As classes de serviço de `apps/api/src/application/services/` (que orquestram repositórios reais) **não** foram movidas nem duplicadas — o frontend orquestra sozinho, no reducer, chamando diretamente as mesmas funções de regra que essas classes usam.

## 7. Substituição Futura Pela API Real

Quando a persistência real for liberada (pós-TLS, Bloco 04), a substituição esperada é trocar `FinanceDemoProvider` por um provider que busca/envia dados via HTTP para `apps/api`, mantendo a mesma interface (`useFinanceDemo()` retornando `{ state, dispatch }` ou equivalente) — `dashboard-view-model.ts`, `financial-entries-view-model.ts` e todos os componentes de UI não precisam mudar, pois já recebem dados por argumento/Context, nunca leem fixtures diretamente.

## 8. O Que Ainda Não Existe

- Persistência real (banco, API HTTP) — ver `Docs/02_architecture/regras_dominio_financeiro.md` e `Docs/02_architecture/arquitetura_visual_dashboard.md`.
- Autenticação — `DEMO_CREATED_BY_USER_ID` é uma constante fictícia, não um usuário autenticado.
- Páginas "Comparativo", "Planejamento", "Histórico", "Configurações" — apenas itens de navegação não funcionais.
- Refinamento visual do dashboard e da nova página de Movimentações — ver `Docs/07_design_system/backlog_refinamento_visual.md`.
