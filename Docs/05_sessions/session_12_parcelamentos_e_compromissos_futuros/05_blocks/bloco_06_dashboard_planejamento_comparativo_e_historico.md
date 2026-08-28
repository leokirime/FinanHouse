# Bloco 06 — Dashboard, Planejamento, Comparativo e Histórico

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-27

## 1. Objetivo

Comprovar por teste — não por código novo — que Dashboard, Planejamento, Comparativo e Histórico já refletem corretamente as parcelas de um `InstallmentPlan` (cada uma uma `FinancialEntry` real desde o Bloco 03/04), e ajustar rotulagem pontual apenas onde fizer sentido.

## 2. Contexto

O plano de execução da Sessão 12 (`04_planning/plano_execucao.md`, etapa 6) definiu este bloco como principalmente validação: "telas de cálculo (Dashboard/Comparativo/Planejamento/Histórico) por último, porque a expectativa (confirmada na análise arquitetural) é que já funcionem sem alteração, uma vez que cada parcela é uma `financial_entry` real". O Bloco 05 (integrado em `main`, aprovado visualmente) entregou criação/listagem/detalhe de parcelamentos; RS-01 (persistência atômica) já está resolvida desde o Bloco 04. Este bloco fecha o ciclo de "confiança" antes do Bloco 07 (smoke-test e encerramento da sessão).

## 3. Problema que Este Bloco Resolve

Ninguém ainda comprovou, por teste, que uma parcela criada via parcelamento se comporta exatamente como qualquer `FinancialEntry` nas quatro telas de cálculo — o risco não é "vai quebrar", é "ninguém verificou formalmente", o que deixaria uma lacuna de confiança antes do encerramento da sessão.

## 4. Escopo

- Inspeção read-only de `DashboardPage`/`PlanningPage`/`ComparisonPage`/`HistoryPage`, seus hooks e view-models, para confirmar como cada um deriva de `state.entries`.
- Testes novos (ou extensão de testes existentes) que provem, com uma parcela real de um `InstallmentPlan`, os 7 casos da seção 12 do prompt (A–G) nas quatro telas + Movimentações.
- Ajuste de rotulagem mínimo em Movimentações — indicador de que um lançamento pertence a um parcelamento (ex.: "3/10") — **somente se** a inspeção confirmar que não existe hoje (ver seção "Situação em Movimentações" abaixo: confirmado que não existe).
- Documentação do resultado da validação (feedback do bloco, ao final da execução).

## 5. Fora de Escopo

- Qualquer nova regra de cálculo, novo indicador, novo componente visual além do ajuste de rotulagem em Movimentações.
- Editar/excluir/renegociar `InstallmentPlan`, recorrência genérica, notificações, calendário doméstico.
- Qualquer migration, acesso ao Aiven, seed/bootstrap.
- Bloco 07 (smoke-test transacional, validação manual final, encerramento da sessão).

## 6. Arquivos e Pastas Envolvidos

Inspeção (leitura, arquitetura já mapeada nesta abertura):
- `apps/web/src/pages/{DashboardPage,PlanningPage,ComparisonPage,HistoryPage}.tsx`
- `apps/web/src/hooks/use-dashboard-view-model.ts`, `use-period-budgets.ts`
- `apps/web/src/view-models/{dashboard,planning,comparison,history}-view-model.ts`
- `packages/domain/src/summaries/{monthly-summary,compare-periods}.ts`

Possível alteração (execução do bloco, não desta abertura):
- `apps/web/src/components/financial-entries/FinancialEntryList.tsx`, `FinancialEntryStatusBadge.tsx` ou `financial-entries-view-model.ts` — rotulagem mínima de parcela em Movimentações, se confirmado necessário.
- Testes correspondentes às quatro páginas + Movimentações (arquivos `*.test.tsx`/`*.test.ts` já existentes, estendidos com os casos da seção 12).
- Feedback do Bloco 06 (só ao final).

## 7. Dependências

- Bloco 05 integrado em `main` (commit `7b27f02703de6cfa4719d561fafd7467b4646021`, após a correção documental da data de aprovação) — API/UI de parcelamentos prontas e aprovadas visualmente.
- RS-01 resolvida (Bloco 04, DT-19) — persistência atômica do plano + parcelas.

## 8. Plano de Implementação (para a execução, não desta abertura)

1. Ler o estado real das quatro páginas + Movimentações (feito nesta abertura — ver seções "Estratégias planejadas" abaixo).
2. Escrever os testes dos casos A–G (seção 12 do prompt) contra o estado/fixtures já existentes de cada página, sem nenhuma alteração de código de produção primeiro.
3. Rodar a suíte — se todos os casos passarem sem qualquer alteração, o bloco confirma a hipótese do plano de execução (telas já corretas) e só resta o ajuste de rotulagem.
4. Implementar o ajuste mínimo de rotulagem em Movimentações (se confirmado necessário), com teste.
5. Rodar a suíte completa e as validações obrigatórias.
6. Preencher feedback só depois de tudo validado.

## 9. Critérios de Aceite

- [x] Caso A (Dashboard contabiliza só a parcela da competência atual, não o total do plano) comprovado por teste — `dashboard-view-model.test.ts`, describe "parcelas de InstallmentPlan (Sessão 12, Bloco 06)".
- [x] Caso B (parcela de competência futura não entra no mês atual; entra ao navegar para o mês dela) comprovado por teste — mesmo describe do Caso A.
- [x] Caso C (parcela `planned` entra no previsto/projetado da categoria real, nunca como realizado) comprovado por teste — `planning-view-model.test.ts`, describe "parcela de InstallmentPlan (Sessão 12, Bloco 06, Caso C)".
- [x] Caso D (Comparativo — cada mês carrega só sua própria parcela, nunca o total do plano em mais de um mês) comprovado por teste — `comparison-view-model.test.ts`, describe "parcelas de InstallmentPlan em meses consecutivos (Sessão 12, Bloco 06, Caso D)".
- [x] Caso E (Histórico — cada competência lista só sua própria parcela) comprovado por teste — `history-view-model.test.ts`, describe "parcelas de InstallmentPlan por competência (Sessão 12, Bloco 06, Caso E)".
- [x] Caso F (parcela realizada segue a mesma semântica de qualquer `FinancialEntry` realizada) comprovado por teste — segundo teste do describe do Caso C em `planning-view-model.test.ts`.
- [x] Caso G (lançamento avulso continua produzindo os mesmos indicadores, sem regressão) comprovado por teste — terceiro teste do describe do Caso A/B em `dashboard-view-model.test.ts`.
- [x] Situação de Movimentações resolvida — indicador mínimo de parcela ("Parcela N/Total", com fallback gracioso para "Parcela N") adicionado e testado (`financial-entries-view-model.test.ts`, `FinancialEntryList.test.tsx`); ver seção 24.
- [x] Nenhuma segunda fonte de verdade financeira baseada em `InstallmentPlan` introduzida nas quatro telas — confirmado por leitura de código (seção 19) e por todos os testes A–G passarem sem alteração de nenhum view-model/função de domínio de cálculo.
- [x] Suíte completa sem regressão — ver seção 25 (API 667, Domain 214, Web 438; nenhuma suíte encolheu).

## 10. Validações Obrigatórias

- [x] `npm run build` — OK (domain + api + web, incluindo `vite build`).
- [x] `npm run verify:runtime` — OK.
- [x] `npm run lint` — OK (oxlint, 0 avisos/erros em api/web/domain).
- [x] `npm run typecheck` — OK (domain, api, web).
- [x] `npm run typecheck:api-scripts` — OK.
- [x] `npm run test` (todos os workspaces) — OK: API 667, Web 438, Domain 214.
- [x] `npx drizzle-kit check` — "Everything's fine" (nenhuma migration pendente, nenhuma alteração de schema).
- [x] `npx ddae-engine validate` — Status OK, 0 warnings, 0 errors.
- [x] `npx ddae-engine audit` — Status OK, 0 errors, 0 pendências P1/P2, 9 warnings (os 8 estruturais já conhecidos + "Bloco 06 sem feedback", que deixa de existir assim que o feedback for criado).

## 11. Segurança

Não aplicável — bloco de validação de leitura financeira já autenticada/escopada por household (nenhuma rota nova, nenhum dado sensível novo).

## 12. Performance

Não aplicável — nenhuma nova consulta esperada; as quatro telas já leem de `state.entries` (`FinanceProvider`, carregado uma vez). Se o ajuste de rotulagem em Movimentações precisar de dado adicional, deve vir de campos já presentes em `FinancialEntry` (`installmentPlanId`/`installmentNumber`), nunca uma nova chamada de rede.

## 13. Design System / UX

Se o ajuste de rotulagem em Movimentações for necessário: reaproveitar `fh-badge`/tokens existentes — nenhum componente visual novo, nenhuma paleta nova.

## 14. Riscos

- Risco de escopo: a tentação de "melhorar" Dashboard/Planejamento/Comparativo/Histórico além da rotulagem mínima — mitigado pelo escopo fechado desta abertura (seção 5, Fora de Escopo) e pela regra explícita de não ensinar essas telas sobre `InstallmentPlan`.
- Risco técnico: baixo — a arquitetura já filtra por `periodId` em todas as camadas relevantes (ver seção "Invariantes financeiras" abaixo), então a expectativa é de testes que comprovam um comportamento já correto, não uma correção.

## 15. Pendências Esperadas

- Nenhuma pendência técnica conhecida antes de executar. A situação de Movimentações (indicador de parcela) foi investigada nesta abertura e está registrada como um possível ajuste de rotulagem do próprio Bloco 06 (ver seção dedicada abaixo) — não uma dívida do Bloco 05.

## 16. Feedback Obrigatório

Feedback gerado via `ddae-engine feedback create --block bloco_06_dashboard_planejamento_comparativo_e_historico --session session_12_parcelamentos_e_compromissos_futuros` **após a execução completa** — não criado nesta rodada de abertura (apenas planejamento).

## 17. Commit Semântico Sugerido

```
test(installments): comprovar reflexo correto de parcelas em dashboard, planejamento, comparativo e historico
```

---

## 18. Telas Identificadas para Validação

`DashboardPage`, `PlanningPage`, `ComparisonPage`, `HistoryPage` — e, por decorrência direta do achado da seção 20 abaixo, também `FinancialEntriesPage` (Movimentações), já que o planejamento original do Bloco 05 previa um indicador ali.

## 19. Invariante Financeira (regra principal deste bloco)

`InstallmentPlan` agrupa; `FinancialEntry` é o lançamento financeiro real. Confirmado por inspeção de código (não suposição) que **toda** camada de cálculo das quatro telas já opera exclusivamente sobre `FinancialEntry` filtrada por `periodId`, sem nenhuma referência a `InstallmentPlan`:

- `packages/domain/src/summaries/monthly-summary.ts:51` — `calculateMonthlySummary(periodId, entries)`: `entries.filter((entry) => entry.periodId === periodId)`.
- `packages/domain/src/summaries/compare-periods.ts:66` — `nonCancelledExpenseCategoryTotals`: mesmo filtro por `periodId`, chamado duas vezes (mês base e mês comparado) por `compareMonthlyPeriods`.
- `apps/web/src/view-models/dashboard-view-model.ts` — indicadores/lista de próximas pendências filtram por `entry.periodId === currentPeriodId`.
- `apps/web/src/view-models/history-view-model.ts:149,159` — `buildStatusCounts`/`buildEntryRows` filtram por `entry.periodId === periodId`.
- `apps/web/src/view-models/planning-view-model.ts:253,286` — `buildEntryRows`/`buildPlanningRealSummary` filtram por `entry.periodId === periodId`.

Como cada parcela gerada pelo Bloco 04 é uma `FinancialEntry` com `periodId` próprio (resolvido/criado sob demanda por `resolvePeriod`, uma competência real por parcela), ela é somada **exatamente uma vez**, na competência correta — nunca no plano inteiro, nunca em mais de um mês. Nenhuma das quatro telas precisa (nem deve) saber o que é um `InstallmentPlan`.

## 20. Situação Encontrada em Movimentações

Investigado antes de assumir pendência (grep em `components/financial-entries/*.tsx` e `financial-entries-view-model.ts`): **nenhuma ocorrência** de `installmentNumber`/`installmentPlanId` em nenhum componente ou view-model de Movimentações. Uma parcela aparece hoje na tabela como uma `FinancialEntry` comum, indistinguível de um lançamento avulso — não há nenhum "3/10" nem equivalente. O planejamento original do Bloco 05 (`04_planning/plano_execucao.md`, etapa 5) previa esse indicador; o Bloco 05 implementado não o adicionou (focou em criação/listagem/detalhe na nova área de Parcelamentos). **Registrado aqui como candidato a ajuste mínimo de rotulagem deste Bloco 06** (não uma dívida do Bloco 05, e não implementado nesta abertura).

## 21. Estratégias Planejadas por Tela

**Dashboard:** testar com fixtures que incluam uma parcela (`installmentPlanId`/`installmentNumber` preenchidos) na competência atual e outra na competência seguinte — confirmar indicadores (`realizedExpense`/`projectedBalance`) e "Pendências próximas" contam só a parcela do mês corrente (Caso A/B).

**Planejamento:** testar que uma parcela `planned` aparece em `plannedEntries`/no total previsto da categoria real (`buildEntryRows`/`buildPlanningViewModel`), nunca como realizado antes de sua própria transição de status (Caso C); confirmar ausência de soma duplicada comparando total da categoria com/sem a parcela.

**Comparativo:** testar duas parcelas do mesmo plano em meses consecutivos (`compareMonthlyPeriods`) — cada mês reporta só sua própria parcela; total do plano nunca aparece em nenhum dos dois meses (Caso D).

**Histórico:** testar que cada competência lista só a `FinancialEntry` daquele mês (`buildEntryRows`/`buildStatusCounts`) — plano nunca reconstruído como um lançamento único; filtros de status existentes continuam funcionando sobre a parcela como qualquer outro lançamento (Caso E).

**Movimentações:** confirmar Caso F (parcela `realized` segue a mesma semântica/ações de qualquer `FinancialEntry` realizada — nenhuma ação nova) e Caso G (lançamento avulso, sem `installmentPlanId`, continua produzindo os mesmos indicadores em todas as telas, sem regressão); implementar e testar o ajuste de rotulagem da seção 20, se confirmado necessário.

## 22. Casos de Teste Planejados

A (Dashboard, mês atual), B (Dashboard, mês futuro/rollover), C (Planejamento, previsto vs. realizado), D (Comparativo, mês a mês), E (Histórico, por competência), F (realização de parcela), G (avulso sem regressão) — detalhados na seção 12 do prompt do bloco.

## 23. Possíveis Ajustes de Rotulagem (identificados, não implementados)

- Indicador "N/Total" (ex.: "3/10") em Movimentações para uma parcela — candidato principal (seção 20).
- Texto de "Pendências próximas"/histórico poderia opcionalmente mencionar que um item é uma parcela — avaliar só se o teste do Caso B/E revelar ambiguidade real, não por preferência estética.

Nenhuma implementação decidida nesta abertura — decisão fica para a execução do bloco, após os testes A–G confirmarem (ou não) a necessidade.

---

## 24. Executado — Rotulagem de Parcela em Movimentações

Confirmada a hipótese da seção 20/23: implementado o indicador "Parcela N/Total" como ajuste mínimo, exclusivamente visual.

- `apps/web/src/view-models/financial-entries-view-model.ts`: adicionado `installmentLabel: string | null` a `FinancialEntryRowViewModel`, calculado por uma função privada que recebe o `entry` e um `installmentCountsByPlanId?: ReadonlyMap<number, number>` opcional (tipo exportado como `InstallmentCountsByPlanId`). Regras: `null` se `installmentPlanId`/`installmentNumber` forem `null` (avulso); `Parcela N/Total` se o mapa tiver o total do plano; `Parcela N` (sem barra) se o mapa não tiver esse plano — nunca inventa, nunca conta parcelas irmãs, nunca lê a descrição.
- `apps/web/src/components/financial-entries/FinancialEntryList.tsx`: recebe `installmentCountsByPlanId` opcional, repassa a `buildFinancialEntryRow`, e renderiza o rótulo dentro do mesmo `<td>` de descrição (`<span className="fh-entry-list__description">`), preservando o layout responsivo mobile existente (cada `<td>` continua sendo um único filho flex).
- `apps/web/src/components/financial-entries/FinancialEntryList.css`: duas regras novas, `.fh-entry-list__description` (flex/wrap) e `.fh-entry-list__installment-label` (cor secundária, `white-space: nowrap`) — o texto sempre contém a palavra "Parcela", nunca depende só de cor.
- `apps/web/src/pages/FinancialEntriesPage.tsx`: constrói o mapa `installmentCountsByPlanId` a partir do hook **já existente e page-scoped** `useInstallmentPlans()` (do Bloco 05), via `useMemo` — **`FinanceProvider` global não foi tocado**, nenhuma mudança de arquitetura ampla.
- Nenhum campo `installmentTotal` foi criado, persistido, inferido da descrição ou calculado por contagem de parcelas irmãs — o total vem sempre e só de `InstallmentPlan.installmentCount`, já existente desde o Bloco 04/05.

Testes cobrindo o ajuste:
- `financial-entries-view-model.test.ts` — describe "rotulagem de parcela": avulso → `null`; total conhecido → "Parcela 3/10"; total desconhecido (mapa ausente ou plano não encontrado) → "Parcela 3"; confirma que o rótulo não depende da descrição textual.
- `FinancialEntryList.test.tsx` — describe "rótulo de parcela": renderiza "Parcela 3/10" com mapa; renderiza "Parcela 3" sem mapa; nenhum indicador em lançamento avulso.
- `FinancialEntriesPage.test.tsx` — describe "independência entre parcelas de um mesmo plano": realizar a parcela 2/3 (via `RealizeEntryDialog`, fluxo real de UI) não altera status, valor previsto, nem o botão "Realizar" das parcelas irmãs 1/3 e 3/3 — nenhuma lógica de redistribuição existe ou foi criada.

## 25. Executado — Resultado da Suíte e Validações

Contagem de testes (antes → depois deste bloco):
- API: 667 → 667 (sem alteração — nenhuma mudança de backend foi necessária).
- Web: 420 → 438 (+18 testes: +3 Dashboard, +2 Planejamento, +2 Comparativo, +3 Histórico, +4 `financial-entries-view-model.test.ts`, +3 `FinancialEntryList.test.tsx`, +1 `FinancialEntriesPage.test.tsx`).
- Domain: 214 → 214 (sem alteração — nenhuma regra de domínio nova foi necessária; a hipótese arquitetural da seção 19 já cobria todos os casos A–G).
- Total: 1301 → 1319.

Todas as validações obrigatórias da seção 10 passaram limpas (ver checklist acima). `git diff --check` sem conflitos; nenhum arquivo `.env.local`/segredo/token/cookie/certificado tocado; nenhuma migration criada; nenhum acesso ao Aiven; nenhum dado financeiro real usado em teste (todas as fixtures são locais/in-memory, com IDs de plano/competência fictícios como `999`, `777`).

## 26. Executado — Correção Pós-Validação Visual: Separação Em Andamento / Concluídos

Durante a validação visual humana da apresentação aprovada na seção 24 (rótulo "Parcela N/Total"), foi identificada uma necessidade funcional adicional na tela **Movimentações → Parcelamentos**: parcelamentos já totalmente concluídos continuavam aparecendo misturados com os ainda em andamento, dificultando saber o que ainda precisa ser pago. Esta seção documenta a correção aplicada **antes do commit do Bloco 06** — não uma reabertura do planejamento original, e sim uma extensão decorrente da validação visual (mesmo padrão da seção 24).

**Decisão de produto registrada:** "parcelamentos totalmente realizados saem da visão padrão (Em andamento), mas permanecem consultáveis em Concluídos/Todos — nunca excluídos, nunca perdem histórico." Exclusão global de `InstallmentPlan` continua fora do MVP (decisão já tomada na abertura da Sessão 12) — não foi implementada, nem botão "Excluir parcelamento", nem endpoint `DELETE`, nem cascade.

**Regra de conclusão (100% derivada, nunca persistida):** `isCompleted = realizedCount === plan.installmentCount`, adicionado a `InstallmentPlanProgress` em `installment-plan-view-model.ts` (`buildInstallmentPlanProgress`). Nenhum campo `status` foi adicionado a `installment_plans`, nenhuma migration, nenhum acesso ao schema. Uma parcela ausente (excluída, por exemplo) nunca é tratada como equivalente a realizada — `realizedCount` só conta `status === 'realized'` entre as `FinancialEntry` efetivamente carregadas, então um plano com menos entries do que `installmentCount` nunca aparece concluído.

**Helper centralizador:** `filterInstallmentPlansByStatus(plans, entries, filter)` em `installment-plan-view-model.ts` — única função que decide "Em andamento" (`!isCompleted`) vs. "Concluídos" (`isCompleted`) vs. "Todos" (sem filtro); usada uma única vez em `InstallmentPlansPage.tsx`, evitando duplicar a regra em componentes.

**UI:** novo componente `InstallmentPlanStatusFilterTabs.tsx` (+ CSS) — três botões (`role="group"`, `aria-pressed`), sem depender só de cor (fundo + borda mudam juntos, texto sempre visível). Filtro padrão ao entrar na página: "Em andamento". `InstallmentPlanList.tsx` ganhou um badge textual "Concluído" (reaproveitando `fh-badge[data-tone='realized']`, já existente) ao lado do progresso, visível sempre que `isCompleted`. Nenhum botão "Finalizar parcelamento" foi criado — a conclusão é sempre automática, decorrente da própria parcela final sendo realizada por meio do fluxo normal em Movimentações.

**Atualização automática:** como `isCompleted`/o filtro são recalculados a cada renderização a partir de `state.entries` (`FinanceProvider`, já compartilhado entre Movimentações e Parcelamentos), nenhuma sincronização adicional foi necessária — nenhum polling, nenhum refresh manual, nenhuma alteração de arquitetura. Confirmado por teste comportamental (transição 9/10 → 10/10 via dispatch real de `REALIZE`).

**Estado vazio por filtro:** "Nenhum parcelamento em andamento." / "Nenhum parcelamento concluído." — CTA "Novo parcelamento" aparece no estado vazio de "Em andamento" (e no estado totalmente vazio, como já era), mas não é duplicado dentro de "Concluídos".

**Nenhuma alteração de backend** — resolvido inteiramente no frontend, reaproveitando `InstallmentPlan`/`FinancialEntry`/`buildInstallmentPlanProgress`, já disponíveis.

**Testes:** `installment-plan-view-model.test.ts` +10 (0/10, 9/10, 10/10, entry de outro plano, parcela ausente, os três filtros, transição 9/10→10/10). `InstallmentPlansPage.test.tsx` +7 (filtro padrão, plano concluído oculto de "Em andamento", estados vazios por filtro sem CTA duplicado, transição automática ao realizar a última parcela, acessibilidade via `aria-pressed`, detalhe de plano concluído continua acessível a partir de "Concluídos").

**Resultado da suíte após a correção:** API 667 (inalterado), Domain 214 (inalterado), Web 438 → 455 (+17). Total: 1319 → 1336. Todas as validações da seção 10 repetidas e limpas; `ddae-engine audit` confirmado sem novas pendências P1/P2.

## 27. Executado — Correção Pós-Validação Visual: Realizar Parcela a partir do Detalhe do Parcelamento

Segunda correção identificada na mesma rodada de validação visual, também antes do commit. Cenário real do usuário: sistema exibindo agosto de 2026 em Movimentações; parcelamento "Placa de vídeo" (4x R$ 112,50) com primeira competência em setembro de 2026. A ausência da parcela 1/4 em Movimentações (agosto) estava **correta** — cada parcela pertence à sua própria competência, nunca à `firstReferenceMonth` do plano nem à competência atualmente exibida (invariante da seção 19, reconfirmada). A lacuna real era outra: o detalhe do parcelamento (`InstallmentPlanDetail`) era somente leitura — exibia as parcelas e seus vencimentos, mas não oferecia nenhuma ação para o usuário informar que uma parcela foi paga.

**Decisão de produto:** "Marcar como pago" no detalhe do parcelamento realiza a MESMA `FinancialEntry` já existente (mesmo `id`/`installmentPlanId`/`installmentNumber`) — nunca cria um lançamento novo, nunca duplica dado financeiro. Ao chegar à competência da parcela em Movimentações, ela aparece exatamente com o mesmo status "Realizado" — são duas interfaces sobre o mesmo registro, não uma sincronização manual entre dois registros.

**Inspeção prévia (antes de qualquer código) confirmou que zero alteração de backend seria necessária:**
- `RealizeEntryDialog.tsx` já é inteiramente agnóstico de página — recebe só `entry: FinancialEntry`/`onClose`, despacha `{type:'REALIZE', id: entry.id, ...}` via `useReadyFinance()`.
- `FinanceProvider.tsx`: o `dispatch` do caso `REALIZE` chama `realizeEntry(config, action.id, ...)` — uma chamada por **id da parcela**, sem qualquer referência a `state.currentPeriodId`.
- `apps/api/.../entries.ts` (`POST /entries/:entryId/realize`) → `RealizeFinancialEntryService.execute(entryId, ...)`: resolve `period = await deps.periods.findById(entry.periodId)` — a competência **da própria parcela**, nunca uma "competência atual" global. Isso já garantia, sem nenhuma mudança, que realizar uma parcela de setembro com a tela em agosto funciona exatamente como realizar uma de agosto.
- `GET /entries` (sem `periodId`) retorna todas as movimentações do household — por isso `state.entries` já contém parcelas de qualquer competência, e é a fonte usada por `buildInstallmentPlanProgress`/`filterInstallmentPlansByStatus` (Bloco 06, seção 26) para o progresso e os filtros da lista.

**Implementação (mínima, reaproveitando o fluxo existente, zero backend):**
- `installment-plan-view-model.ts`: `canRealize: boolean` adicionado a `InstallmentRowViewModel`, com a **mesma regra exata** de `financial-entries-view-model.ts` (`status === 'planned' || status === 'pending'`) — nenhuma transição paralela reinventada.
- `InstallmentPlanDetail.tsx`: nova prop `onRealize(entry: FinancialEntry)`; cada parcela com `canRealize` ganha um botão "Marcar como pago" (`aria-label` específico, ex. "Marcar parcela 1 de 4 como paga"); parcela já `realized` não exibe o botão — apenas o badge de status já existente.
- `InstallmentPlansPage.tsx`: estado `realizingEntry`; `onRealize` abre o `RealizeEntryDialog` **sem modificação alguma** nesse componente; ao fechar (sucesso ou cancelamento), o detalhe é atualizado — via `fetchedDetail.retry()` para a fonte "selected", ou transição para "selected" no caso "recém-criado" (que não tinha mecanismo próprio de refetch).

**Nenhuma alteração de backend, schema, migration ou `InstallmentPlan`** — confirmado pela inspeção prévia, não apenas pela ausência de necessidade percebida.

**Testes:** `installment-plan-view-model.test.ts` +1 (`canRealize` replica a regra de Movimentações). `InstallmentPlansPage.test.tsx` +6: (1) mesma `FinancialEntry` realizada, sem duplicação, progresso "0 de 4"→"1 de 4"; (2) parcela de competência diferente (setembro) realizada com sucesso mesmo com a página exibindo julho; (3) última parcela (3/4→4/4) move o plano automaticamente para "Concluídos"; (4) parcela já realizada não exibe "Marcar como pago"; (5) erro (competência fechada) mantém o diálogo aberto, mostra mensagem sanitizada, não incrementa progresso; (6) `aria-label` específico por parcela.

**Resultado da suíte após esta correção:** API 667 (inalterado), Domain 214 (inalterado), Web 455 → 462 (+7). Total: 1336 → 1343. Todas as validações da seção 10 repetidas e limpas.
