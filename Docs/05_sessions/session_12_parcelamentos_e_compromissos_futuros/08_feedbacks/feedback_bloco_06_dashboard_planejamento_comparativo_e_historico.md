# Feedback — Bloco 06: Dashboard, Planejamento, Comparativo e Histórico

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-28

## 1. Resumo Executivo

O bloco confirmou, por teste — não por implementação —, que Dashboard, Planejamento, Comparativo e Histórico já refletem corretamente as parcelas de um `InstallmentPlan`, porque cada parcela já é uma `FinancialEntry` real com seu próprio `periodId` (criada atomicamente desde o Bloco 04). Os sete casos exigidos (A–G) foram escritos como testes novos nos quatro arquivos de view-model e todos passaram na primeira execução, sem qualquer alteração de código de produção nas camadas de cálculo. A única lacuna real encontrada foi em Movimentações: uma parcela aparecia na lista indistinguível de um lançamento avulso. Foi implementado o ajuste mínimo — rótulo "Parcela N/Total" (com fallback gracioso para "Parcela N" quando o total não está disponível) — reaproveitando o hook `useInstallmentPlans()` já existente e page-scoped do Bloco 05, sem tocar o `FinanceProvider` global nem criar qualquer campo `installmentTotal`. Um teste de independência entre parcelas irmãs comprova que realizar uma parcela não afeta as demais.

Durante a validação visual humana dessa apresentação, foi identificada uma segunda necessidade: parcelamentos já totalmente concluídos apareciam misturados com os ainda em andamento na tela de Parcelamentos. Foi aplicada uma correção adicional, **antes do commit**: um filtro "Em andamento / Concluídos / Todos", com "concluído" derivado (`realizedCount === installmentCount`, nunca persistido, nunca um status novo no schema) e centralizado em `filterInstallmentPlansByStatus`. Nenhuma exclusão de plano/parcela foi implementada — decisão já tomada como fora do MVP na Sessão 12 — e nenhum botão "Finalizar" manual foi criado; a conclusão é sempre automática, derivada da última parcela sendo realizada pelo fluxo normal de Movimentações.

Uma terceira necessidade surgiu do mesmo ciclo de validação visual: com um parcelamento cuja primeira competência é futura (ex.: setembro, com a tela em agosto), o usuário não tinha como marcar aquela parcela como paga sem esperar navegar até a competência correta em Movimentações. Investigação confirmou que a ausência da parcela em agosto era comportamento correto (cada parcela pertence à sua própria competência) — a lacuna real era o detalhe do parcelamento ser somente leitura. Foi adicionado um botão "Marcar como pago" por parcela realizável, reaproveitando o `RealizeEntryDialog` já existente sem modificá-lo, e confirmado por inspeção que todo o fluxo de realização (frontend e backend) já opera pela competência da própria parcela, nunca pela competência atualmente exibida — zero alteração de backend.

Suíte completa sem regressão ao final das três rodadas: API 667 (inalterado), Domain 214 (inalterado), Web 420 → 462 (+42 testes no total). Bloco tecnicamente concluído, aguardando nova validação visual do usuário antes da autorização de commit — sem commit/push/merge realizado.

## 2. Objetivo do Bloco

Comprovar por teste — não por código novo — que Dashboard, Planejamento, Comparativo e Histórico já refletem corretamente as parcelas de um `InstallmentPlan` (cada uma uma `FinancialEntry` real desde o Bloco 03/04), e ajustar rotulagem pontual em Movimentações apenas onde a inspeção/testes revelassem necessidade real.

## 3. Escopo Implementado

Igual ao planejado, sem divergência:

- Testes novos cobrindo os Casos A–G nas quatro páginas de cálculo, usando fixtures locais/in-memory (nenhuma alteração na fixture compartilhada `finance-test-fixtures.ts`).
- Confirmação por leitura de código de que `InstallmentPlan` nunca entra em nenhuma camada de cálculo (view-models e funções de domínio de resumo).
- Ajuste mínimo de rotulagem em Movimentações ("Parcela N/Total"), com testes na camada de view-model, de componente e de página.
- Correção pós-validação visual (1ª): separação "Em andamento / Concluídos / Todos" em Parcelamentos, com conclusão 100% derivada (nunca persistida) e filtro centralizado em um único helper de view-model.
- Correção pós-validação visual (2ª): ação "Marcar como pago" no detalhe do parcelamento, reaproveitando o `RealizeEntryDialog` já existente de Movimentações sem modificá-lo — realiza a mesma `FinancialEntry`, independente da competência atualmente exibida na página.
- Documentação do bloco/prompt atualizada com evidência de execução (das três rodadas); feedback preenchido ao final.

## 4. Arquivos Criados

- `apps/web/src/components/installments/InstallmentPlanStatusFilterTabs.tsx` — três botões de filtro ("Em andamento"/"Concluídos"/"Todos"), `role="group"`, `aria-pressed`.
- `apps/web/src/components/installments/InstallmentPlanStatusFilterTabs.css` — estilo do filtro, no mesmo padrão de `fh-area-tabs`.
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/08_feedbacks/feedback_bloco_06_dashboard_planejamento_comparativo_e_historico.md` (este arquivo, via `ddae-engine feedback create`).

## 5. Arquivos Alterados

Testes (Casos A–G, sem alteração de produção):
- `apps/web/src/view-models/dashboard-view-model.test.ts` — +3 testes (Casos A, B, G).
- `apps/web/src/view-models/planning-view-model.test.ts` — +2 testes (Caso C e Caso F).
- `apps/web/src/view-models/comparison-view-model.test.ts` — +2 testes (Caso D).
- `apps/web/src/view-models/history-view-model.test.ts` — +3 testes (Caso E).

Rotulagem de parcela em Movimentações (produção + testes):
- `apps/web/src/view-models/financial-entries-view-model.ts` — adicionado `installmentLabel: string | null` a `FinancialEntryRowViewModel`, função privada de cálculo do rótulo, tipo exportado `InstallmentCountsByPlanId`; `buildFinancialEntryRow` ganhou terceiro parâmetro opcional.
- `apps/web/src/view-models/financial-entries-view-model.test.ts` — +4 testes (avulso sem rótulo, total conhecido, total desconhecido/fallback, rótulo não depende da descrição).
- `apps/web/src/components/financial-entries/FinancialEntryList.tsx` — nova prop opcional `installmentCountsByPlanId`, repassada a `buildFinancialEntryRow`; célula de descrição agrupa texto + rótulo em um `<span>` para preservar o layout responsivo mobile.
- `apps/web/src/components/financial-entries/FinancialEntryList.css` — duas regras novas (`.fh-entry-list__description`, `.fh-entry-list__installment-label`).
- `apps/web/src/components/financial-entries/FinancialEntryList.test.tsx` — +3 testes (rótulo com total, rótulo sem total, ausência de rótulo em avulso).
- `apps/web/src/pages/FinancialEntriesPage.tsx` — usa `useInstallmentPlans()` (hook já existente do Bloco 05) para construir o mapa `installmentCountsByPlanId` via `useMemo`, passado a `FinancialEntryList`.
- `apps/web/src/pages/FinancialEntriesPage.test.tsx` — +1 teste (independência entre parcelas irmãs de um mesmo plano ao realizar uma delas).

Separação Em andamento / Concluídos em Parcelamentos (correção pós-validação visual, produção + testes):
- `apps/web/src/view-models/installment-plan-view-model.ts` — `isCompleted: boolean` adicionado a `InstallmentPlanProgress` (`realizedCount === plan.installmentCount`); novo tipo `InstallmentPlanStatusFilter`, constantes `DEFAULT_INSTALLMENT_PLAN_STATUS_FILTER`/`INSTALLMENT_PLAN_STATUS_FILTER_LABELS`, e helper `filterInstallmentPlansByStatus(plans, entries, filter)`.
- `apps/web/src/view-models/installment-plan-view-model.test.ts` — +10 testes (`isCompleted` em 0/10, 9/10, 10/10, com só 2 de 3 realizadas, ignorando entry de outro plano, parcela ausente nunca conta como realizada; `filterInstallmentPlansByStatus` para os três filtros e a transição 9/10→10/10).
- `apps/web/src/pages/InstallmentPlansPage.tsx` — estado `statusFilter` (padrão "Em andamento"), `visiblePlans` derivado via `useMemo`/`filterInstallmentPlansByStatus`, renderização do novo `InstallmentPlanStatusFilterTabs`, estados vazios específicos por filtro (sem duplicar o CTA em "Concluídos").
- `apps/web/src/pages/InstallmentPlansPage.test.tsx` — +7 testes (filtro padrão, plano concluído oculto de "Em andamento" e visível em "Concluídos"/"Todos", estados vazios por filtro, transição automática 9/10→10/10 via `REALIZE` real, acessibilidade via `aria-pressed`, detalhe de plano concluído continua acessível).
- `apps/web/src/components/installments/InstallmentPlanList.tsx` — badge textual "Concluído" (`data-tone="realized"`, reaproveitando `fh-badge` já existente) ao lado do progresso, quando `row.progress.isCompleted`.
- `apps/web/src/components/installments/InstallmentPlanList.css` — regra `.fh-installment-list__progress` (flex/wrap) para acomodar os dois badges sem quebrar o layout mobile existente.

Realizar parcela pelo detalhe do parcelamento (correção pós-validação visual, produção + testes):
- `apps/web/src/view-models/installment-plan-view-model.ts` — `canRealize: boolean` adicionado a `InstallmentRowViewModel`, mesma regra de `financial-entries-view-model.ts` (`status === 'planned' || status === 'pending'`).
- `apps/web/src/view-models/installment-plan-view-model.test.ts` — +1 teste (`canRealize` true para planned/pending, false para realized).
- `apps/web/src/components/installments/InstallmentPlanDetail.tsx` — nova prop `onRealize(entry)`; botão "Marcar como pago" (com `aria-label` específico por parcela) em cada linha com `canRealize`; nenhuma alteração em parcela já `realized`.
- `apps/web/src/pages/InstallmentPlansPage.tsx` — estado `realizingEntry`; renderiza `RealizeEntryDialog` (componente já existente, importado sem nenhuma alteração) quando uma parcela é selecionada para pagamento; ao fechar o diálogo, atualiza o detalhe via `fetchedDetail.retry()` (fonte "selected") ou transição para "selected" (fonte "recém-criada", que não tinha refetch próprio).
- `apps/web/src/pages/InstallmentPlansPage.test.tsx` — +6 testes (sem duplicação de lançamento; competência da parcela diferente da exibida na página; última parcela conclui o plano automaticamente; parcela já realizada não exibe o botão; erro de competência fechada mantém o diálogo aberto sem incrementar progresso; `aria-label` específico por parcela).

Documentação:
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_06_dashboard_planejamento_comparativo_e_historico.md` — critérios de aceite marcados, seções 24–27 (evidência de execução das três rodadas) adicionadas.
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/06_prompts/prompt_bloco_06_dashboard_planejamento_comparativo_e_historico.md` — critérios/validações marcados, seções 17–19 (evidência) adicionadas.

## 6. Arquivos Removidos

- Nenhum.

## 7. Comandos Executados

```
npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run typecheck:api-scripts
npm run test
npx drizzle-kit check   (em apps/api)
npx ddae-engine validate
npx ddae-engine audit
npx vitest run <arquivos de teste individuais, durante o desenvolvimento>
```

## 8. Testes Realizados

Todos automatizados (vitest), nenhum manual/UI real nesta rodada (sem Aiven, sem dado real):

- **Caso A/B/G** (`dashboard-view-model.test.ts`, 12 testes no arquivo, 3 novos): parcela da competência atual conta uma vez só; parcela de competência futura não aparece no mês atual e aparece ao navegar para o mês dela; avulso continua produzindo os mesmos indicadores.
- **Caso C/F** (`planning-view-model.test.ts`, 16 testes no arquivo, 2 novos): parcela `planned` entra no previsto da categoria real sem nunca ser tratada como realizada antes da própria transição de status; parcela `realized` segue a mesma semântica de qualquer `FinancialEntry` realizada.
- **Caso D** (`comparison-view-model.test.ts`, 20 testes no arquivo, 2 novos): duas parcelas do mesmo plano em meses consecutivos — cada mês reporta só a própria, nunca o total do plano, sem duplicação ao combinar os dois meses.
- **Caso E** (`history-view-model.test.ts`, 23 testes no arquivo, 3 novos): cada competência lista só sua própria parcela; o plano nunca é reconstruído como lançamento único; filtro de status existente continua funcionando normalmente sobre uma parcela.
- **Rotulagem de Movimentações** (`financial-entries-view-model.test.ts`, 13 testes no arquivo, 4 novos): avulso sem rótulo; "Parcela N/Total" com o total conhecido; fallback para "Parcela N" sem o total (mapa ausente ou plano não encontrado); confirmação de que o rótulo nunca é inferido da descrição.
- **Renderização do rótulo** (`FinancialEntryList.test.tsx`, 5 testes no arquivo, 3 novos): rótulo renderizado corretamente com e sem o mapa de totais; nenhum indicador em avulso.
- **Independência entre parcelas irmãs** (`FinancialEntriesPage.test.tsx`, 16 testes no arquivo, 1 novo): fluxo real de UI (abrir diálogo de realização, confirmar) realizando a parcela 2/3 de um plano fictício — as parcelas irmãs 1/3 e 3/3 permanecem "Planejado", com seu botão "Realizar" intacto, comprovando que não existe nenhuma lógica de redistribuição.
- **`isCompleted`/filtro de status** (`installment-plan-view-model.test.ts`, 26 testes no arquivo, 10 novos): 0/10, 9/10 e 10/10 realizadas; 2 de 3 realizadas; entry de outro `installmentPlanId` ignorada; parcela ausente (ex.: excluída) nunca tratada como equivalente a realizada; os três filtros (`active`/`completed`/`all`); transição 9/10→10/10 sem persistir status.
- **Separação Em andamento/Concluídos na página** (`InstallmentPlansPage.test.tsx`, 26 testes no arquivo antes da 3ª rodada, 7 novos nesta seção): filtro padrão "Em andamento" ao entrar; plano concluído (10/10) oculto de "Em andamento" e visível em "Concluídos"/"Todos" com badge "Concluído"; estado vazio "Nenhum parcelamento em andamento."/"Nenhum parcelamento concluído." sem duplicar o CTA em "Concluídos"; **transição comportamental real** — um harness de teste dispara `dispatch({ type: 'REALIZE', ... })` no `FinanceProvider` compartilhado, realizando a última parcela (9/10→10/10) e confirmando que o plano desaparece de "Em andamento" e passa a "Concluídos" na renderização seguinte, sem nenhum polling/refresh manual; acessibilidade via `aria-pressed`; selecionar um plano concluído a partir de "Concluídos" continua abrindo o detalhe completo (histórico preservado).
- **`canRealize` no detalhe do parcelamento** (`installment-plan-view-model.test.ts`, 27 testes no arquivo, 1 novo): `true` para `planned`/`pending`, `false` para `realized` — mesma regra de Movimentações, nunca uma transição paralela.
- **Realizar parcela pelo detalhe** (`InstallmentPlansPage.test.tsx`, 32 testes no arquivo, 6 novos): clicar "Marcar como pago" e confirmar realiza a MESMA `FinancialEntry` (mesmo `id`/`installmentPlanId`/`installmentNumber`, sem nova linha no detalhe), com o progresso da lista atualizando "0 de 4"→"1 de 4"; uma parcela com `periodId` de setembro é realizada com sucesso mesmo com a página exibindo julho (`currentPeriodId` inalterado); realizar a última parcela pendente (3/4→4/4) move automaticamente o plano para "Concluídos"; uma parcela já `realized` nunca exibe o botão (nenhum pagamento duplicado possível pela UI); tentar realizar uma parcela de competência fechada mantém o diálogo aberto, mostra a mensagem sanitizada existente ("Não é possível... em uma competência fechada.") e não incrementa o progresso; o botão tem `aria-label` específico por parcela (ex. "Marcar parcela 1 de 2 como paga").

Todos os testes acima passaram na primeira execução após escritos (sem nenhuma iteração de correção nas camadas de cálculo/derivação) — exceto os acertos triviais de import/fixture/timing descritos na seção 12.

## 9. Validações Executadas

- `npm run build` — OK (build:domain, tsc do `api`, `tsc -b && vite build` do `web`, sem erros).
- `npm run verify:runtime` — OK ("SUCESSO — @finanhouse/domain e o serviço de aplicação compilado funcionam via import padrão do Node").
- `npm run lint` — OK (oxlint em `api`, `web`, `@finanhouse/domain`, sem avisos/erros).
- `npm run typecheck` — OK (`tsc --noEmit`/`tsc -b` em todos os workspaces).
- `npm run typecheck:api-scripts` — OK.
- `npm run test` — OK, repetido após cada correção pós-validação visual: **API 667/667**, **Web 462/462** (420 + 42 novos entre as três rodadas), **Domain 214/214**. Nenhuma suíte encolheu em nenhuma das três execuções.
- `npx drizzle-kit check` (em `apps/api`) — "Everything's fine" — nenhuma migration pendente, nenhuma alteração de schema (confirmado nas três rodadas, já que nenhuma delas tocou o backend).
- `npx ddae-engine validate` — Status OK, 0 warnings, 0 errors (confirmado nas três rodadas).
- `npx ddae-engine audit` — Status OK, 0 errors, 0 pendências P1/P2, 8 warnings estruturais já conhecidos (o aviso "Bloco 06 sem feedback correspondente" desapareceu assim que este arquivo de feedback foi criado, na primeira rodada, e segue ausente após as correções seguintes).

Revisão de segurança: `git status`/`git diff --stat`/`git diff --name-only` mostram apenas arquivos de teste, os arquivos de produção listados nas seções 4–5 e os documentos DDAE — nenhum `.env.local`, credencial, cookie, certificado, log, screenshot ou artefato de build. `git diff --check` sem conflitos de whitespace. Nenhum dado financeiro real usado em nenhum teste (todos os IDs de plano/competência são fictícios, ex. `999`, `777`, `9800`, `1010`, `SEPTEMBER_PERIOD_ID = 900`). Nenhum acesso ao Aiven em nenhuma das três rodadas.

## 10. Decisões Técnicas

- **Reaproveitar `useInstallmentPlans()` em vez de estender o `FinanceProvider` global**: o hook já existia, page-scoped, desde o Bloco 05 (construído para a página de Parcelamentos). Construir o mapa `Map<planId, installmentCount>` diretamente em `FinancialEntriesPage.tsx` evita qualquer alteração de arquitetura ampla, exatamente como exigido — se essa reutilização não fosse simples, a decisão correta seria parar e reportar, não implementar de qualquer forma.
- **Fallback gracioso "Parcela N" sem o total**: em vez de omitir o rótulo inteiro quando o plano correspondente não está no mapa (ex.: falha de rede pontual no carregamento dos planos), o rótulo degrada para apenas o número da parcela — nunca inventa nem infere o total por nenhum outro meio.
- **Agrupar texto + rótulo em um único `<span>` na célula de descrição**: necessário para não quebrar o mecanismo de responsividade mobile existente, que trata cada `<td>` como um único filho flex ao empilhar a tabela em telas estreitas.
- **"Concluído" como campo derivado, nunca persistido**: decisão explícita do usuário durante a validação visual, para não reabrir a exclusão global de `InstallmentPlan` (fora do MVP desde a abertura da Sessão 12) nem criar uma segunda fonte de verdade sobre o estado do plano. `isCompleted` é recalculado a cada renderização a partir de `state.entries`, já compartilhado entre Movimentações e Parcelamentos via `FinanceProvider` — nenhuma sincronização adicional foi necessária.
- **Filtrar os `InstallmentPlan` brutos (não as linhas já construídas) em `InstallmentPlansPage.tsx`**: evita alterar o contrato de `InstallmentPlanList` (que continua recebendo `plans`/`categories`/`entries` como antes); a regra de conclusão continua centralizada em `buildInstallmentPlanProgress`/`filterInstallmentPlansByStatus`, chamada a partir de um único ponto na página — sem duplicação da regra em vários componentes.
- **Nenhum botão "Finalizar" manual**: decisão explícita do usuário — decidir o destino de parcelas ainda não terminais (planned/pending) ao "finalizar" manualmente criaria uma nova regra financeira fora do escopo deste bloco. A conclusão é sempre consequência automática da última parcela sendo realizada pelo fluxo normal.
- **Reaproveitar `RealizeEntryDialog` sem nenhuma modificação**: o componente já era inteiramente agnóstico de página (recebe só `entry`/`onClose`, despacha via `useReadyFinance()`) — importá-lo diretamente em `InstallmentPlansPage.tsx` evita duplicar formulário/validação monetária/chamada à API/mensagens de erro, satisfazendo a exigência de reaproveitar o mecanismo existente em vez de criar um segundo concorrente.
- **Atualizar o detalhe via `retry()`/transição de fonte, em vez de basear a lista de parcelas do detalhe em `state.entries`**: embora `state.entries` já contenha todas as competências (o `GET /entries` sem `periodId` retorna o household inteiro), o detalhe do parcelamento tem sua própria fonte (`useInstallmentPlanDetail`, `GET .../installment-plans/:id`) desde o Bloco 05. Reaproveitar essa fonte com um `retry()` após o fechamento do diálogo é a mudança mínima — trocar a fonte de dados do detalhe inteiro por `state.entries` seria uma alteração de arquitetura maior do que o necessário para esta correção.

Nenhuma decisão acima é cara de reverter; nenhuma foi registrada em `Docs/04_governance/registro_decisoes.md` por não introduzir dependência nova nem alterar contrato/arquitetura. A decisão de produto ("concluído sai da visão padrão mas nunca perde histórico") está registrada na seção 26 do bloco; a decisão ("marcar como pago realiza a mesma FinancialEntry, nunca cria lançamento novo") está registrada na seção 27.

## 11. Problemas Encontrados

- Confirmado por `grep` (antes de qualquer código): zero ocorrência de `installmentPlanId`/`installmentNumber` em `financial-entries-view-model.ts` ou em qualquer componente de Movimentações — a lacuna já estava prevista na abertura do bloco (seção 20 do bloco) e foi resolvida como planejado.
- Nenhum outro problema ou comportamento inesperado encontrado nas quatro telas de cálculo — a hipótese arquitetural do bloco (seção 19) se confirmou integralmente.
- Identificado durante a validação visual humana (não por teste automatizado): parcelamentos concluídos e em andamento apareciam misturados na tela de Parcelamentos, sem separação — resolvido pela correção da seção 26 do bloco, antes do commit.
- Identificado na mesma validação visual: o detalhe do parcelamento não oferecia nenhuma ação para realizar uma parcela — confirmado que a ausência da parcela em Movimentações (agosto, com a primeira competência do plano em setembro) era comportamento correto, não um bug de geração. Resolvido pela correção da seção 27 do bloco.

## 12. Correções Aplicadas Durante o Bloco

- Três testes novos em `financial-entries-view-model.test.ts` referenciavam `FIXTURE_HOUSEHOLD_ID` sem importá-lo — corrigido adicionando o import junto com `parseMoney`/`FinancialEntry`. Erro trivial de digitação de teste, sem impacto em código de produção.
- O primeiro rascunho do teste de independência entre parcelas irmãs usava `periodId: 1`, que corresponde a uma competência fechada nas fixtures de teste — a tentativa de realizar a parcela era corretamente rejeitada pela regra de negócio existente (competência fechada), mas por um motivo alheio ao que o teste pretendia comprovar. Corrigido trocando para `FIXTURE_CURRENT_PERIOD_ID` (competência aberta), isolando o teste ao comportamento de fato sob verificação (independência entre parcelas).
- Correção funcional pós-validação visual (não um retrabalho por erro, e sim um requisito identificado só ao ver a tela real): implementada a separação Em andamento/Concluídos descrita na seção 26 do bloco, com os 17 testes novos listados na seção 8.
- Ao escrever os testes de "Marcar como pago", alguns cenários herdaram o `installmentCount: 10` padrão do DTO de fixture (`PLAN_DTO`) mesmo fornecendo só 1, 2 ou 4 parcelas reais — o que produzia rótulos/labels de progresso incorretos (ex.: "0 de 10" em vez de "0 de 4"). Corrigido sobrescrevendo `installmentCount` explicitamente em cada teste para bater com o número real de parcelas simuladas. Erro de fixture de teste, sem impacto em código de produção.
- O teste de acessibilidade do botão "Marcar como pago" verificava o botão logo após o clique que abre o detalhe, sem aguardar a resolução do `GET` assíncrono do detalhe — corrigido envolvendo a asserção em `waitFor`, mesmo padrão já usado em todos os outros testes desta página.
- Correção funcional pós-validação visual (2ª, não um retrabalho por erro): implementada a ação "Marcar como pago" no detalhe do parcelamento, descrita na seção 27 do bloco, com os 7 testes novos listados na seção 8.

## 13. Pendências

### P1 — Crítica

_Nenhuma._

### P2 — Importante

_Nenhuma._

### P3 — Melhoria Recomendada

_Nenhuma nova. O item de rotulagem previsto desde o planejamento do Bloco 05 foi resolvido neste bloco, não permanece como pendência._

### P4 — Opcional

_O rótulo de parcela foi adicionado apenas em Movimentações (`FinancialEntryList.tsx`), conforme escopo. Se no futuro fizer sentido produto exibir o mesmo indicador em "Pendências próximas" do Dashboard ou nas linhas do Histórico, isso pode ser avaliado como um bloco/ajuste separado — não foi solicitado nem implementado aqui, para não expandir escopo._

_Exclusão global de `InstallmentPlan` e encerramento antecipado/renegociação de um plano com parcelas ainda pendentes continuam fora do MVP (decisão já tomada na Sessão 12, reafirmada nesta correção) — candidatos a um bloco/decisão de produto futuro, não implementados nem parcialmente esboçados aqui._

_Antecipação de parcelas (realizar uma parcela futura alterando sua própria competência/`periodId`/`realizationDate` para uma antecipação real de pagamento, refletindo em Dashboard/Planejamento/Comparativo/Histórico) permanece evolução futura — hoje "Marcar como pago" realiza a parcela na sua própria competência original, nunca antecipa nem move `periodId`. Não implementado, não esboçado nesta rodada._

_Confirmação visual manual do botão "Marcar como pago" em uma parcela de competência futura (ex.: setembro, com o sistema em agosto) — coberta por teste automatizado e por inspeção de código (seção 27 do bloco), mas ainda não observada manualmente pelo usuário porque essa competência ainda não estava em uso real. Será repetida quando a competência correspondente entrar em uso. Registrada aqui apenas como observação de validação manual futura — não é uma pendência P1/P2 e não bloqueia a aprovação do bloco._

## 14. Riscos Restantes

Nenhum risco técnico identificado. A arquitetura de filtragem por `periodId` em todas as camadas de cálculo (seção 19 do bloco) é a garantia estrutural de que uma parcela nunca poderá ser contabilizada em mais de uma competência ou duplicada com o total do plano — não depende de disciplina de código futura, é uma propriedade do modelo de dados (cada parcela é uma `FinancialEntry` com um `periodId` próprio, atribuído na criação atômica do Bloco 04).

## 15. Evidências

Contagem de testes por arquivo (após as três rodadas):
- `dashboard-view-model.test.ts`: 12 (9 + 3)
- `planning-view-model.test.ts`: 16 (14 + 2)
- `comparison-view-model.test.ts`: 20 (18 + 2)
- `history-view-model.test.ts`: 23 (20 + 3)
- `financial-entries-view-model.test.ts`: 13 (9 + 4)
- `FinancialEntryList.test.tsx`: 5 (2 + 3)
- `FinancialEntriesPage.test.tsx`: 16 (15 + 1)
- `installment-plan-view-model.test.ts`: 27 (16 + 10 + 1)
- `InstallmentPlansPage.test.tsx`: 32 (19 + 7 + 6)

Totais por workspace:
- API: 667/667 passando (inalterado nas três rodadas).
- Web: 462/462 passando (420 + 42 novos no total: 18 da primeira rodada + 17 da 2ª correção + 7 da 3ª correção).
- Domain: 214/214 passando (inalterado).
- Total do monorepo: 1343 (1301 + 42).

`npx drizzle-kit check`: `Everything's fine 🐶🔥`.
`npx ddae-engine validate`: `Status: OK / Warnings: 0 / Errors: 0`.
`npx ddae-engine audit`: `Status: OK / Errors: 0 / Pendências P1/P2: Nenhuma pendência P1/P2 encontrada.` (8 warnings estruturais já conhecidos, ver seção 9).

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

**Aprovado pelo usuário em 2026-08-28.** A aprovação se apoia em: validação visual das telas de Dashboard/Planejamento/Comparativo/Histórico/Parcelamentos; validação visual da rotulagem "Parcela N/Total"; validação visual da separação "Em andamento / Concluídos / Todos"; validação automatizada completa (1343 testes) do fluxo de integração Parcelamentos ↔ Lançamentos, incluindo o caso de competência diferente da exibida; e a suíte completa verde sem regressão em nenhum workspace.

**Ressalva registrada com precisão (não bloqueante):** a confirmação visual manual específica do botão "Marcar como pago" em uma parcela de competência futura (setembro, com o sistema em agosto) ficou adiada — o usuário ainda não chegou a essa competência no uso real do sistema. O cenário está coberto por teste automatizado (seção 8, "parcela de competência diferente da atualmente exibida") e por inspeção de código confirmando que o fluxo de realização opera pela competência da própria parcela, nunca pela competência exibida (seção 27 do bloco). **Validação automatizada concluída; a confirmação manual cross-period será repetida posteriormente**, quando a competência de setembro estiver em uso real — isto não é uma pendência P1/P2 e não bloqueia o fechamento deste bloco.

**Antecipação de parcelamento:** registrada apenas como evolução futura (não implementada, não esboçada). Ver seção 13, P4.

## 17. Próximo Bloco Recomendado

Bloco 07 — smoke-test transacional e encerramento da Sessão 12 (conforme já previsto em `04_planning/plano_execucao.md`).

## 18. Commit Semântico Sugerido

```
test(installments): comprovar reflexo correto de parcelas em dashboard, planejamento, comparativo e historico

feat(entries): rotular parcelas em movimentacoes com "Parcela N/Total"

feat(installments): separar parcelamentos em andamento e concluidos na listagem

feat(installments): permitir realizar parcela a partir do detalhe do parcelamento
```

_Aprovado e autorizado explicitamente pelo usuário em 2026-08-28 (ver seção 16) — commit, push da feature e merge `--no-ff` na `main` executados nesta rodada._

## 19. Adendo — Hotfix Visual Pós-Integração (2026-08-28)

**Não é uma reabertura do Bloco 06** — o bloco permanece encerrado e integrado na `main` (`906ae49f2c90fe3c5a03c96ef5ae1cc9c9c8bdd5`). Este adendo apenas documenta um ajuste visual aplicado depois da integração, em branch e worktree isolados (`fix/installments-payment-button-layout`, `C:\Users\leoki\HouseManager-PaymentButton-Fix`).

**Errata de validação:** na rodada anterior, o usuário havia relatado que o botão "Marcar como pago" não parecia estar disponível no detalhe de uma parcela de competência futura. Após atualizar a página, o usuário confirmou que o botão **estava presente e funcional o tempo todo** — a observação anterior refletia uma página desatualizada no navegador, não uma lacuna real. A integração Parcelamentos ↔ Lançamentos descrita na seção 27 está correta e não precisou de nenhuma correção funcional.

**Correção real identificada:** puramente visual — o botão ficava excessivamente próximo do badge de status, sem alinhamento claro dentro da linha da parcela.

**Ajuste aplicado:**
- `InstallmentPlanDetail.tsx`: nova classe `fh-installment-detail__pay-button` no botão já existente (nenhuma alteração de `onClick`, `aria-label`, `onRealize` ou qualquer lógica).
- `InstallmentPlanDetail.css`: `margin-left: auto` no botão (empurra a ação para o fim da linha, no modo flex-row já existente, sem posicionamento absoluto nem offsets); estilo "ghost" com borda/texto na cor roxa da marca (`--fh-purple-border`/`--fh-purple-strong`), hover com `--fh-purple-soft` — mesmos tokens já usados em `InstallmentPlanStatusFilterTabs.css`; `align-self: flex-end` explícito dentro da media query mobile existente (`max-width: 480px`), onde o item já virava coluna.
- Nenhuma paleta nova, nenhum hardcode de cor — só tokens já existentes.

**Nenhuma alteração de regra de negócio, API, persistência ou arquitetura:** `canRealize`, `RealizeEntryDialog`, o endpoint de realização, `periodId`, `actualAmount`, `realizationDate`, `installmentPlanId`, `installmentNumber`, o progresso e os filtros "Em andamento/Concluídos/Todos" permanecem exatamente como estavam — confirmado por leitura de código antes da alteração e por nenhum teste de lógica ter sido tocado (apenas um teste estrutural novo, sobre a classe CSS/posição do botão, foi adicionado).

**Antecipação de parcelamento continua fora de escopo** — não implementada, não esboçada nesta correção.

**Validação:** suíte completa executada após o ajuste, sem regressão (ver commit do hotfix para os números exatos). `git diff --check` limpo; nenhum segredo, `.env.local`, migration ou acesso ao Aiven.
