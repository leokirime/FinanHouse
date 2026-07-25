# Feedback — Bloco 07: Movimentações funcionais com estado em memória

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Resumo Executivo

Transformada a área de Movimentações em uma funcionalidade real e interativa, mantendo o Finanhouse inteiramente sem banco de dados. Foi introduzido um estado financeiro compartilhado em memória (`apps/web/src/state/`, `FinanceDemoProvider` + `useReducer`), inicializado a partir das mesmas fixtures do Bloco 06, e navegação real entre "Visão geral" (`/`) e "Movimentações" (`/movimentacoes`) via `react-router-dom`. O dashboard foi adaptado para receber dados por argumento em vez de importar fixtures diretamente, e agora ele e a página de Movimentações leem e escrevem no mesmo estado — qualquer criação, edição ou mudança de status feita em Movimentações aparece imediatamente nos indicadores, na evolução financeira, na distribuição por categoria e nas listas do dashboard. Todas as transições de status (`planned`/`pending`/`realized`/`cancelled`, incluindo estorno `realized→pending`) são delegadas às funções nomeadas de `@finanhouse/domain` — nenhuma regra financeira foi duplicada no frontend. 57 novos testes automatizados (mínimo exigido: 38), 235 no total do monorepo, todos passando. Nenhuma conexão com o banco, nenhuma migration, nenhum `localStorage`/`IndexedDB`, nenhuma persistência real — confirmado inclusive por checagem estática automatizada.

## 2. Objetivo do Bloco

Transformar a área de Movimentações em uma funcionalidade navegável e interativa, permitindo criar, editar e alterar estados de receitas e despesas durante a sessão do navegador, sem banco de dados ou persistência permanente.

## 3. Escopo Implementado

- `react-router-dom@7.18.1` (pin exato — ver Decisões Técnicas) e rotas reais `/` e `/movimentacoes`, com `RootLayout` (novo) montando `AppShell`/`DashboardHeader` uma única vez via `<Outlet />`.
- Estado financeiro compartilhado (`state/finance-demo-types.ts`, `finance-demo-initial-state.ts`, `finance-demo-reducer.ts`, `finance-demo-context.ts`, `FinanceDemoProvider.tsx`) e hook de acesso (`hooks/use-finance-demo.ts`).
- `view-models/dashboard-view-model.ts` reescrito para receber `{ entries, categories, periods, currentPeriodId, previousPeriodId }` por argumento — não lê mais fixtures diretamente. `hooks/use-dashboard-view-model.ts` conecta o estado a essa função.
- `view-models/financial-entries-view-model.ts` (novo): filtros/busca, rótulos de exibição e flags de ação (`canEdit`/`canRealize`/etc.) por movimentação.
- `pages/FinancialEntriesPage.tsx` e componentes em `components/financial-entries/`: `EntryDialog` (casca acessível reutilizada), `FinancialEntryForm` (criação/edição), `RealizeEntryDialog`, `CancelEntryDialog`, `FinancialEntryList`, `FinancialEntryActions`, `FinancialEntryFilters`, `FinancialEntryStatusBadge`, `FinancialEntryEmptyState`.
- `Sidebar` atualizada para navegação real ("Visão geral" e "Movimentações" como `NavLink`, com `aria-current="page"` automático); demais itens continuam `<button disabled>`.
- Fixtures corrigidas para suportar os fluxos: competência atual (`FIXTURE_CURRENT_PERIOD_ID`) mudou de `review` para `open` (exigido pelo domínio para criar/editar); adicionados `fixtureHouseholdMembers`/`fixtureMemberLabels` (um membro ativo, um inativo, para exercitar a regra de membro inativo).
- `utils/format-date-pt-br.ts` extraído de `dashboard-view-model.ts` (reaproveitado pelo novo view-model, evita duplicar a lógica UTC-safe de formatação de data).
- 57 testes automatizados novos.
- Documentação: `Docs/02_architecture/estado_temporario_frontend.md` (novo), `Docs/01_product/requisitos_funcionais.md`, `Docs/07_design_system/componentes_ui.md`, `apps/web/README.md`, `Docs/02_architecture/decisoes_tecnicas.md` (DT-02).

## 4. Arquivos Criados

- `apps/web/src/state/{finance-demo-types,finance-demo-initial-state,finance-demo-reducer,finance-demo-context,FinanceDemoProvider}.ts(x)`
- `apps/web/src/state/{finance-demo-reducer.test,finance-demo-dashboard-sync.test,FinanceDemoProvider.test,finance-demo-no-persistence.test}.ts(x)`
- `apps/web/src/hooks/{use-finance-demo,use-dashboard-view-model}.ts`
- `apps/web/src/view-models/{financial-entries-view-model,financial-entries-view-model.test}.ts`
- `apps/web/src/utils/format-date-pt-br.ts`
- `apps/web/src/components/layout/RootLayout.tsx`
- `apps/web/src/components/financial-entries/{EntryDialog,FinancialEntryForm,RealizeEntryDialog,CancelEntryDialog,FinancialEntryList,FinancialEntryActions,FinancialEntryFilters,FinancialEntryStatusBadge,FinancialEntryEmptyState}.tsx` + `.css` correspondentes
- `apps/web/src/components/financial-entries/{EntryDialog.test,RealizeEntryDialog.test,FinancialEntryList.test}.tsx`
- `apps/web/src/pages/{FinancialEntriesPage,FinancialEntriesPage.test}.tsx(x)`, `FinancialEntriesPage.css`
- `apps/web/src/test-utils.tsx`
- `Docs/02_architecture/estado_temporario_frontend.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/{05_blocks,06_prompts,08_feedbacks}/*bloco_07*`

## 5. Arquivos Alterados

- `apps/web/src/App.tsx` — rotas (`Routes`/`Route`/`Navigate`) no lugar da montagem fixa do dashboard
- `apps/web/src/main.tsx` — envolve a aplicação com `BrowserRouter` + `FinanceDemoProvider`
- `apps/web/src/pages/DashboardPage.tsx` — usa `useDashboardViewModel()` em vez de `buildDashboardViewModel()` sem argumentos
- `apps/web/src/view-models/dashboard-view-model.ts` — assinatura por argumento; reaproveita `utils/format-date-pt-br.ts`
- `apps/web/src/view-models/dashboard-view-model.test.ts` — reescrito para passar fixtures explicitamente e refletir competência `open`
- `apps/web/src/components/layout/Sidebar.tsx` (+`.css`) — navegação real com `NavLink`
- `apps/web/src/data/dashboard-fixtures.ts` — competência atual `review`→`open`; adicionados membros do household
- `apps/web/src/App.test.tsx`, `apps/web/src/components/layout/Sidebar.test.tsx` — reescritos para roteamento real e status `Aberta`
- `apps/web/package.json` — dependência `react-router-dom` (pin exato `7.18.1`)
- `Docs/01_product/requisitos_funcionais.md` — RF-01 e RF-06 atualizados
- `Docs/07_design_system/componentes_ui.md` — inventário de componentes do Bloco 07
- `Docs/02_architecture/decisoes_tecnicas.md` — nova decisão DT-02 (versão do `react-router-dom`)
- `apps/web/README.md`, `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md` — status atualizado

## 6. Arquivos Removidos

_Nenhum arquivo removido neste bloco._

## 7. Comandos Executados

```
git switch main && git pull --ff-only origin main
git merge --no-ff feat/session-11-bloco-06-dashboard-visual -m "merge: integrar dashboard visual com dados simulados"   (cad88c8..26ec450, sem conflitos)
npm ci && npm run clean && npm run build && npm run verify:runtime && npm run lint && npm run typecheck && npm run test
npx ddae-engine validate && npx ddae-engine audit && npm audit --omit=dev
git push origin main
git switch -c feat/session-11-bloco-07-movimentacoes-memory
npx ddae-engine block create "Movimentações funcionais com estado em memória" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_07_movimentacoes_funcionais_com_estado_em_memoria --session session_11_fundacao_do_finanhouse
npm view react-router-dom peerDependencies version --json   (checar compatibilidade com React 19)
npm install react-router-dom --workspace=web   (instalou 7.18.1 — npm audit acusou 2 altas em RSC Mode)
npm install react-router-dom@7.11.0 --workspace=web   (tentativa de mitigar — npm audit acusou 13 outras advisories na faixa 6.0.0–7.17.0)
npm install react-router-dom@7.18.1 --workspace=web   (revertido — WebFetch confirmou que a única advisory de 7.18.1 exige "RSC Mode", não usado aqui; ver DT-02)
npx tsc -b   (apps/web, repetido a cada módulo novo)
npx vitest run   (apps/web, repetido a cada arquivo novo/alterado)
npm run build && npm run lint && npm run typecheck
npx ddae-engine feedback create --block bloco_07_movimentacoes_funcionais_com_estado_em_memoria --session session_11_fundacao_do_finanhouse
npm ci && npm run clean && npm run build && npm run verify:runtime && npm run lint && npm run typecheck && npm run test
npx ddae-engine validate && npx ddae-engine audit && npm audit --omit=dev && npm audit
```

## 8. Testes Realizados

57 testes novos, todos automatizados (Vitest + Testing Library), somados aos 178 já existentes = **235 no total** (mínimo exigido no prompt: 38 novos — entregue com folga):

- `state/finance-demo-reducer.test.ts` (17): criação de receita `planned` e despesa `pending`; rejeição de valor zero, categoria incompatível e competência fechada; edição de `planned`/`pending`; bloqueio de edição de `realized`; `MARK_PENDING`; `REALIZE` com valor/data; `CANCEL` de `planned`/`pending`; bloqueio de cancelamento direto de `realized`; `REACTIVATE`; `REVERT_REALIZATION` (estorno); `CLEAR_ERROR`; `RESET`.
- `state/finance-demo-dashboard-sync.test.ts` (3): indicadores/recentes/distribuição por categoria do dashboard mudam após criação, realização e cancelamento — mesma fonte de estado.
- `state/FinanceDemoProvider.test.tsx` (2): estado inicial com o mesmo total das fixtures; reset ao remontar o provider (equivalente a recarregar a página).
- `state/finance-demo-no-persistence.test.ts` (6): varredura estática de todo `src/` (fora de comentários) confirmando ausência de `localStorage`, `IndexedDB`, `mysql2`, `drizzle-orm`, `.env`.
- `view-models/financial-entries-view-model.test.ts` (9): busca por descrição e por categoria (case-insensitive), filtro por tipo/status/categoria, combinação de filtros sem `NaN`/`Infinity`, estado vazio, e as flags de ação (`canEdit`/`canMarkPending`/`canRealize`/`canCancel`/`canReactivate`/`canRevertRealization`) por status.
- `components/financial-entries/RealizeEntryDialog.test.tsx` (4): valor previsto pré-preenchido sem despachar nada sozinho; rejeição de realização sem valor; rejeição sem data; sucesso fecha o diálogo.
- `components/financial-entries/EntryDialog.test.tsx` (4): papel de diálogo modal (`aria-modal`); Escape fecha e devolve foco a quem abriu; botão fechar; clique no backdrop fecha, clique dentro não fecha.
- `components/financial-entries/FinancialEntryList.test.tsx` (2): `data-label` em todas as células (mecanismo de empilhamento responsivo); uma linha por movimentação.
- `pages/FinancialEntriesPage.test.tsx` (5): renderização e aviso de modo demonstrativo; listagem da competência atual; estado vazio + limpar filtros; criação via formulário atualizando a lista e mostrando a confirmação; rejeição de valor inválido sem criar.
- `App.test.tsx` (+3, agora 10): navegação para `/movimentacoes` com `aria-current` migrando; rota desconhecida redireciona para "Visão geral"; "Visão geral" continua funcional após ida e volta.
- `Sidebar.test.tsx` (+2, agora 5): "Movimentações" como link real habilitado; `aria-current="page"` acompanha a rota ativa.
- `view-models/dashboard-view-model.test.ts` (9, reescrito): mesma cobertura do Bloco 06, agora chamando `buildDashboardViewModel()` com argumentos explícitos e competência `open`/"Aberta".

## 9. Validações Executadas

- `npm ci && npm run clean && npm run build` — OK (asset da logo e bundle da app incluindo rotas gerados sem erro).
- `npm run verify:runtime` — OK (inalterado — não toca no domain/API).
- `npm run lint` — OK, 0 avisos (incluindo `apps/web/src/test-utils.tsx`, após ajuste para não disparar `react/only-export-components` — ver Problemas Encontrados).
- `npm run typecheck` — OK, 0 erros.
- `npm run test` — OK, **235/235** (34 api + 102 web + 99 domain).
- `ddae-engine validate` — OK, 0 erros/avisos.
- `ddae-engine audit` — OK, 9 warnings (7 gates + P2 Bloco 03 + P2 Bloco 04), 0 erros — **nenhuma P2 nova no Bloco 07** (refinamento visual do Bloco 06 continua como P3 no backlog próprio, TLS continua P2 só no Bloco 04).
- `npm audit --omit=dev` — **2 altas** (antes: 0) — `react-router` (`GHSA-qwww-vcr4-c8h2`, RSC Mode CSRF Bypass). Investigado e confirmado **não aplicável**: a advisory só afeta aplicações usando as APIs instáveis de RSC do React Router, que este projeto não usa (SPA client-side puro, sem loaders/actions/SSR). Decisão registrada em `Docs/02_architecture/decisoes_tecnicas.md` (DT-02). `npm audit fix --force` **não** executado (rebaixaria para uma versão exposta a 13 outras advisories).
- `npm audit` — 6 vulnerabilidades (4 moderadas, cadeia de desenvolvimento do `drizzle-kit`, já P3 desde o Bloco 03; 2 altas do `react-router`, ver acima).

## 10. Decisões Técnicas

- **`react-router-dom` fixado em `7.18.1` exato (DT-02)** — ver seção 9. Resumo: é a versão mais recente; sua única vulnerabilidade conhecida exige um modo (RSC) que este projeto não usa; qualquer versão anterior (`6.0.0`–`7.17.0`, incluindo a `7.11.0` inicialmente cogitada como "mais segura") está exposta a 13 outras advisories, várias delas relevantes mesmo em uso client-side puro (open redirect em `<Link>`/`useNavigate`).
- **`dashboard-view-model.ts` migrado para receber dados por argumento** — decisão central do bloco, exigida pelo prompt ("o dashboard não pode continuar lendo fixtures diretamente"). Efeito colateral positivo: o módulo ficou testável isoladamente com qualquer conjunto de dados, sem depender de import de fixtures.
- **Reducer com `try/catch` interno, nunca lançando durante o render** — erros de domínio (`DomainError`) viram `state.actionError`; isso evita que uma validação rejeitada pelo domínio derrube a árvore de componentes React (que não tem `ErrorBoundary` neste bloco, fora de escopo).
- **`FinancialEntryForm` único para criar e editar** (`mode: 'create' | 'edit'`), em vez de dois componentes — os campos são quase idênticos (edição omite tipo e status inicial); evita duplicar a lógica de parse/validação do valor monetário.
- **`Brand.tsx` não reaproveitado para o hero nem para os novos diálogos** — mantém-se a separação já registrada no Bloco 06 (marca compacta vs. composições maiores).
- **Atributo HTML `required` removido dos campos com validação customizada (valor previsto, valor realizado, data de realização)** — ver Problemas Encontrados: a validação nativa do navegador bloqueava o `submit` antes do JavaScript rodar, impedindo as mensagens de erro em português definidas pelo bloco.
- **Competência atual das fixtures mudou de `review` para `open`** — exigência explícita do prompt ("não enfraqueça as regras de domínio"); a mudança foi feita na fixture, não relaxando `assertPeriodAllowsEntryChanges`.
- **`EntryDialog` usa `<dialog open>` sem `showModal()`** — evita depender da API imperativa de `HTMLDialogElement`, cujo suporte no jsdom (usado pelos testes) é mais recente/parcial; foco inicial delegado ao primeiro campo de cada formulário (`autoFocus`), foco de retorno e Escape implementados manualmente.

## 11. Problemas Encontrados

- **`npm audit` acusou 2 vulnerabilidades altas ao instalar `react-router-dom`** — investigado a fundo (ver seção 10/DT-02) antes de decidir a versão a fixar; não é um "problema resolvido superficialmente", é uma decisão de risco aceito e documentada.
- **Atributo `required` bloqueando a validação customizada**: os testes de "rejeitar realização sem valor/sem data" falhavam silenciosamente — o `handleSubmit` nunca era chamado porque o navegador (e o jsdom) interceptava o `submit` por causa do `required` nos campos vazios, antes do JavaScript rodar. Corrigido removendo `required` dos campos com validação própria (valor previsto, valor realizado, data de realização) — a validação em português definida pelo bloco passou a ser a única fonte de erro.
- **Teste de `FinanceDemoProvider` com asserção incorreta**: um `Probe` de teste procurava "a movimentação atualmente planned" a cada render — depois de despachar `MARK_PENDING`, não havia mais nenhuma `planned` para encontrar, e o teste falhava por engano (o código estava correto; o teste que raciocinava errado). Corrigido para rastrear uma movimentação específica por `id` capturado na primeira renderização.
- **Falso positivo na checagem estática de ausência de `localStorage`/`IndexedDB`**: os próprios comentários de `finance-demo-types.ts`/`FinanceDemoProvider.tsx`, que documentam explicitamente a ausência dessas APIs, continham as palavras "localStorage"/"IndexedDB" e disparavam a busca ingênua. Corrigido removendo comentários do conteúdo antes de aplicar os padrões de busca.
- **`oxlint` acusou `react/only-export-components` em `test-utils.tsx`** — arquivo de utilitário de teste que reexporta `@testing-library/react` inteiro (padrão oficial da própria biblioteca). Corrigido eliminando um componente nomeado desnecessário e suprimindo a regra especificamente na linha do `export *`, com comentário explicando o porquê.

## 12. Correções Aplicadas Durante o Bloco

- Downgrade e depois reversão da versão do `react-router-dom` (`7.18.1` → `7.11.0` → `7.18.1`), com investigação via GHSA antes da decisão final.
- Remoção do atributo `required` dos campos de valor previsto (`FinancialEntryForm`), valor realizado e data de realização (`RealizeEntryDialog`).
- Correção do `Probe` de teste em `FinanceDemoProvider.test.tsx` para rastrear uma movimentação por `id` fixo.
- Adição de `stripComments()` em `finance-demo-no-persistence.test.ts` antes de aplicar os padrões de busca.
- Simplificação de `test-utils.tsx` para eliminar o aviso de lint sobre exportações não-componente.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._ TLS/persistência real continuam **dependência externa já controlada pelo Bloco 04**. Refinamento visual do dashboard continua **P3 já registrado no backlog do Bloco 06** (`Docs/07_design_system/backlog_refinamento_visual.md`). Nenhum dos dois é duplicado aqui.

### P3 — Melhoria Recomendada

- `react-router-dom` está exposto a uma advisory de alta severidade (GHSA-qwww-vcr4-c8h2) não aplicável ao uso atual (modo RSC não usado) — mesmo assim, vale revisar quando uma versão publicada corrigir isso sem reabrir as demais 13 advisories da faixa anterior (ver DT-02).
- O refinamento visual da nova página de Movimentações (densidade, hierarquia dos diálogos) deve entrar na mesma sessão dedicada de UI/UX já prevista para o dashboard.
- Contraste de cores dos novos componentes (diálogos, formulário) não foi medido numericamente — mesma limitação já registrada para o Bloco 06.
- Inspeção visual em navegador real dos novos fluxos (criar, realizar, cancelar) não foi realizada neste ambiente (sem ferramenta de captura de tela) — fica para o próximo checkpoint do proprietário.
- Quando a persistência real for liberada, `FinanceDemoProvider` deve ser substituído por um provider que fale com a API real, mantendo a mesma interface (`useFinanceDemo()`) — documentado em `Docs/02_architecture/estado_temporario_frontend.md`, seção 7.

### P4 — Opcional

- Páginas "Comparativo", "Planejamento", "Histórico", "Configurações" continuam apenas como itens de navegação não funcionais.
- Estorno (`REVERT_REALIZATION`) foi implementado e testado no reducer, mas não tem um botão dedicado de destaque na UI além da ação contextual "Estornar" — avaliar se merece um fluxo com confirmação como o cancelamento, quando o refinamento visual acontecer.

## 14. Riscos Restantes

- A decisão de manter `react-router-dom@7.18.1` apesar do `npm audit` acusar 2 altas é um risco aceito e documentado, não eliminado — se uma versão futura corrigir a advisory de RSC sem reabrir as demais, a atualização deve ser feita.
- O estado em memória não passou por teste de carga/performance com um volume grande de movimentações — aceitável nesta fase de protótipo demonstrativo.
- Definições visuais dos novos diálogos/formulário ainda não foram revisadas pelo proprietário em navegador real.

## 15. Evidências

```
$ npm run test (resumo pós npm ci)
api: Test Files 6 passed (6) · Tests 34 passed (34)
web: Test Files 19 passed (19) · Tests 102 passed (102)
domain: Test Files 5 passed (5) · Tests 99 passed (99)
Total: 235/235

$ npx ddae-engine audit
Status: OK · Warnings: 9 (7 gates + P2 Bloco 03 + P2 Bloco 04) · Errors: 0

$ npm audit --omit=dev
react-router  7.12.0 - 8.2.0 (GHSA-qwww-vcr4-c8h2, RSC Mode CSRF Bypass — não aplicável, ver DT-02)
2 high severity vulnerabilities

$ npm audit
6 vulnerabilities (4 moderate — drizzle-kit/esbuild dev, já P3; 2 high — react-router, ver acima)

$ npm run verify:runtime
[verify:runtime] SUCESSO — @finanhouse/domain e o serviço de aplicação compilado funcionam via import padrão do Node, sem depender de arquivos .ts em runtime.

$ npm run build (apps/web)
dist/assets/finanhouse-logo-hero-*.png, dist/assets/index-*.css, dist/assets/index-*.js gerados sem erros (87 módulos, incluindo rotas)
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Sessão dedicada de refinamento visual (dashboard + Movimentações) com o proprietário, revisando hierarquia, identidade roxa/preta, densidade dos diálogos e responsividade em navegador real — antes ou em paralelo a um eventual Bloco 08 de API HTTP real, que só pode avançar depois da resposta da Clever Cloud sobre TLS (Bloco 04).

## 18. Commit Semântico Sugerido

```
feat(web): implementar movimentações com estado em memória
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
