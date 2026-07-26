# Feedback — Bloco 10: Histórico mensal somente leitura com estado em memória

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-26

## 1. Resumo Executivo

O Bloco 10 implementou a área funcional `/historico`, usando a mesma fonte de estado em memória do dashboard, de Movimentações, do Comparativo e do Planejamento (`FinanceDemoProvider`). Diferente de todas as áreas anteriores, o Histórico é **estritamente consultivo**: nenhum componente despacha ações no reducer — apenas lê `state.periods`/`state.entries`/`state.categories`.

A página lista competências da mais recente para a mais antiga, com filtros por ano e por status da competência (`open`/`review`/`closed`); ao selecionar uma competência, mostra o resumo financeiro (receita/despesa/saldo realizados, fechamento projetado — via `calculateMonthlySummary`, sem nenhuma fórmula reimplementada) e a contagem de movimentações por status; as movimentações da competência podem ser filtradas por status e são listadas somente leitura, sem nenhum botão de editar/realizar/cancelar/excluir.

47 testes novos, todos automatizados (Vitest + Testing Library), somando 438 testes aprovados no monorepo (mínimo exigido: 40 novos — entregue com folga). Status final: bloco concluído conforme escopo funcional, com ressalva P3 de refinamento visual já esperada no backlog de design. Nenhuma P2 nova foi aberta; a pendência TLS segue controlada pelos Blocos 03/04. Decisão técnica registrada (`Docs/02_architecture/decisoes_tecnicas.md`, DT-06 — corrigida antes do merge). **Integrado à `main` em 2026-07-26 (commit `fd026da`)**, a partir dos commits `de6e58f` (funcional) e `b2e032c` (correção documental DT-06) na branch `feat/session-11-bloco-10-historico-memory`, preservada no remoto. Esta é a última área funcional planejada para esta rodada (Movimentações, Comparativo, Planejamento, Histórico); nenhum bloco novo foi criado depois deste.

## 2. Objetivo do Bloco

Implementar uma área de Histórico mensal somente leitura, permitindo consultar competências e movimentações anteriores por meio da fonte compartilhada de estado temporário, sem banco de dados ou persistência permanente.

## 3. Escopo Implementado

- Rota `/historico` adicionada ao React Router 8.3.0; item "Histórico" habilitado na `Sidebar` (resta apenas "Configurações" desabilitada).
- View-model puro (`history-view-model.ts`) recebe competências, movimentações, categorias, competência selecionada e filtros por argumento.
- Lista de competências (`PeriodHistoryList`) da mais recente para a mais antiga, com seleção acessível por teclado (`<button aria-current="true">`).
- Filtros (`HistoryFilters`): ano, status da competência, status da movimentação — nunca alteram `state`, só a leitura/exibição; "Limpar filtros" desabilitado nos valores padrão.
- Resumo financeiro (`HistoricalPeriodSummary`): receita/despesa/saldo realizados e fechamento projetado, via `calculateMonthlySummary`.
- Contagem por status (`HistoricalStatusBreakdown`): `planned`/`pending`/`realized`/`cancelled`.
- Movimentações da competência (`HistoricalEntries`): tabela responsiva somente leitura, sem nenhuma ação.
- Estado vazio (`HistoryEmptyState`): nenhuma competência cadastrada; filtros de competência sem resultado; filtro de movimentação sem resultado (mensagem inline, não tela cheia).
- Sincronização testada: criar/realizar/cancelar movimentações em Movimentações atualiza o Histórico na mesma sessão; criar um limite em Planejamento **não** altera os valores históricos de movimentações (comprovado por teste dedicado).

## 4. Arquivos Criados

- `apps/web/src/view-models/history-view-model.ts`, `apps/web/src/view-models/history-view-model.test.ts`
- `apps/web/src/pages/HistoryPage.tsx`, `apps/web/src/pages/HistoryPage.css`, `apps/web/src/pages/HistoryPage.test.tsx`
- `apps/web/src/components/history/{HistoryFilters,PeriodHistoryList,HistoricalPeriodSummary,HistoricalStatusBreakdown,HistoricalEntries,HistoryEmptyState}.tsx`
- `apps/web/src/components/history/History.css`
- `apps/web/src/state/finance-demo-history-sync.test.ts`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_10_historico_mensal_somente_leitura_com_estado_em_memoria.md`

## 5. Arquivos Alterados

- `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/components/layout/Sidebar.test.tsx`
- `apps/web/src/components/layout/RootLayout.tsx`
- `Docs/01_product/requisitos_funcionais.md` (RF-06/RF-07 atualizados, RF-08 novo)
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-06 nova — corrigida antes do merge, ausente na entrega funcional original)
- `Docs/02_architecture/estado_temporario_frontend.md` (seção 9 nova — Histórico; renumeração das seções finais)
- `Docs/07_design_system/componentes_ui.md` (inventário do Bloco 10)
- `apps/web/README.md` (rota, estrutura, status do Bloco 09 integrado)
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_10_historico_mensal_somente_leitura_com_estado_em_memoria.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/06_prompts/prompt_bloco_10_historico_mensal_somente_leitura_com_estado_em_memoria.md`

## 6. Arquivos Removidos

- Nenhum.

## 7. Comandos Executados

```
git fetch origin && git switch feat/session-11-bloco-09-planejamento-memory && git pull --ff-only origin feat/session-11-bloco-09-planejamento-memory
npm ci && npm run clean && npm run build && npm run verify:runtime && npm run lint && npm run typecheck && npm run test
npx ddae-engine validate && npx ddae-engine audit && npm audit --omit=dev && npm ls react-router react-router-dom
git switch main && git pull --ff-only origin main
git merge --no-ff feat/session-11-bloco-09-planejamento-memory -m "merge: integrar planejamento mensal em memória"   (04da9c1..e107716, sem conflitos)
npm run build && npm run verify:runtime && npm run lint && npm run typecheck && npm run test
npx ddae-engine validate && npx ddae-engine audit && npm audit --omit=dev
git push origin main
git switch -c feat/session-11-bloco-10-historico-memory
npx ddae-engine block create "Histórico mensal somente leitura com estado em memória" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_10_historico_mensal_somente_leitura_com_estado_em_memoria --session session_11_fundacao_do_finanhouse
npx tsc -b   (apps/web, repetido a cada módulo novo)
npx vitest run <arquivo>   (apps/web, repetido a cada arquivo novo/alterado)
npx oxlint   (apps/web)
npx ddae-engine feedback create --block bloco_10_historico_mensal_somente_leitura_com_estado_em_memoria --session session_11_fundacao_do_finanhouse
npm ci && npm run clean && npm run build && npm run verify:runtime && npm run lint && npm run typecheck && npm run test
npx ddae-engine validate && npx ddae-engine audit && npm audit --omit=dev && npm audit
npm ls react-router react-router-dom
```

**Rodada de encerramento — correção documental (DT-06 ausente) e integração:**

```
git fetch origin && git switch feat/session-11-bloco-10-historico-memory && git pull --ff-only origin feat/session-11-bloco-10-historico-memory
[revisão] Docs/02_architecture/decisoes_tecnicas.md não continha decisão para o Histórico — confirmado que DT-06 estava ausente
[Edit] Docs/02_architecture/decisoes_tecnicas.md   (nova entrada DT-06 — Histórico mensal somente leitura em memória)
npx ddae-engine validate && npx ddae-engine audit
git add Docs/02_architecture/decisoes_tecnicas.md
git commit -m "docs(architecture): registrar histórico somente leitura"
git push origin feat/session-11-bloco-10-historico-memory   (de6e58f..b2e032c)
npm ci && npm run clean && npm run build && npm run verify:runtime && npm run lint && npm run typecheck && npm run test
npx ddae-engine validate && npx ddae-engine audit && npm audit --omit=dev && npm audit && npm ls react-router react-router-dom
git switch main && git pull --ff-only origin main
git merge-base --is-ancestor b2e032c main   (exit 1 — ainda não integrado)
git merge --no-ff feat/session-11-bloco-10-historico-memory -m "merge: integrar histórico mensal em memória"   (e107716..fd026da, sem conflitos)
npm run build && npm run verify:runtime && npm run lint && npm run typecheck && npm run test
npx ddae-engine validate && npx ddae-engine audit && npm audit --omit=dev && npm audit && npm ls react-router react-router-dom
[Edit] Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md, feedback_bloco_10_historico_mensal_somente_leitura_com_estado_em_memoria.md   (registro da integração)
npx ddae-engine validate && npx ddae-engine audit
git push origin main
```

## 8. Testes Realizados

47 testes novos, todos automatizados (Vitest + Testing Library), somados aos 391 já existentes = **438 no total** (mínimo exigido no prompt: 40 novos — entregue com folga):

- `apps/web/src/view-models/history-view-model.test.ts` (20): ordenação de competências e anos disponíveis; estado vazio sem competências; seleção padrão da mais recente; seleção de outra competência; filtro por ano; filtro por status de competência; filtro por status de movimentação; limpar filtros; estado vazio quando filtros de competência não encontram nada; mensagem de vazio quando filtro de movimentação não encontra nada; receita realizada bate com `calculateMonthlySummary`; contagem por status; `cancelled` fora do saldo realizado/projetado; ausência de `NaN`/`Infinity`; dinheiro em `bigint`; datas em pt-BR; movimentações ordenadas; nome de categoria legível; resumo textual acessível.
- `apps/web/src/pages/HistoryPage.test.tsx` (18): renderização e modo demonstrativo; ordenação; seleção padrão; seleção de outra competência; filtro por ano/status de competência/status de movimentação; limpar filtros; estado vazio sem competências; estado vazio com filtros sem resultado; indicadores financeiros visíveis; contagem por status visível; listagem de movimentações; ausência de qualquer ação de editar/excluir/cancelar/realizar; ausência de `NaN`/`Infinity`; datas em pt-BR; navegação por teclado; `data-label` responsivo.
- `apps/web/src/state/finance-demo-history-sync.test.ts` (6): atualização após criar/realizar/cancelar movimentação; limite de Planejamento não altera valores históricos; mesma fonte de estado; reset ao remontar o provider.
- `apps/web/src/App.test.tsx` (+1, agora 14): navegação para `/historico` com `aria-current` e título.
- `apps/web/src/components/layout/Sidebar.test.tsx` (+2, agora 11): "Histórico" como link real habilitado; `aria-current="page"` acompanha a rota ativa.

## 9. Validações Executadas

- `npm ci` — OK; 4 moderadas dev conhecidas no resumo do npm.
- `npm run clean` — OK; removeu `packages/domain/dist`, `apps/api/dist`, `apps/web/dist`.
- `npm run build` — OK.
- `npm run verify:runtime` — OK; "Nenhum servidor iniciado, nenhuma conexão de banco, nenhuma leitura de .env.local."
- `npm run lint` — OK, sem erros ou avisos.
- `npm run typecheck` — OK.
- `npm run test` — OK, **438/438** (34 api + 251 web + 153 domain).
- `npx ddae-engine validate` — OK, 0 warnings, 0 errors.
- `npx ddae-engine audit` — OK, 9 warnings conhecidos (7 quality gates pendentes + P2 Blocos 03/04) após o feedback deste bloco ser criado, 0 errors — nenhuma P2 nova.
- `npm audit --omit=dev` — OK, 0 vulnerabilidades de produção.
- `npm audit` — 4 vulnerabilidades moderadas (cadeia dev `drizzle-kit`/`@esbuild-kit`/`esbuild`, já conhecidas desde o Bloco 03); 0 altas.
- `npm ls react-router react-router-dom` — `react-router@8.3.0` presente; `react-router-dom` ausente.

## 10. Decisões Técnicas

- **DT-06 registrada em `Docs/02_architecture/decisoes_tecnicas.md`** (adicionada em correção pré-merge, commit `b2e032c`, depois de identificado que o arquivo constava no escopo original mas não havia sido alterado): Histórico mensal somente leitura em memória — fonte compartilhada do `FinanceDemoProvider`, estritamente consultivo, sem criação/edição/exclusão/fechamento/reabertura pela rota `/historico`, reaproveitando `calculateMonthlySummary`, filtros apenas no estado de apresentação, sem persistência nesta etapa.
- **Histórico nunca despacha ações** — decisão de design central do bloco: nenhum componente de `components/history/` importa `dispatch`; a ausência de qualquer botão de mutação é testada explicitamente em `HistoryPage.test.tsx`.
- **Filtros e competência selecionada vivem como estado local da página** (`useState`), nunca escritos em `FinanceDemoState` — evita que estado de UI de uma área somente leitura vaze para o estado financeiro compartilhado.

## 11. Problemas Encontrados

- Um teste inicial de `HistoryPage.test.tsx` (`getByText` para datas em pt-BR) falhou por encontrar múltiplas ocorrências do mesmo padrão de data (esperado, já que várias movimentações de julho caem em datas próximas) — corrigido para `getAllByText` com verificação de tamanho, mesma classe de ajuste já feita em `PlanningPage.test.tsx` no Bloco 09.
- Nenhum outro problema não previsto foi encontrado — o bloco reaproveitou integralmente os padrões (view-model, CSS por feature, tabela responsiva com `data-label`, tons `data-tone` já definidos globalmente) estabelecidos pelos Blocos 06–09.

## 12. Correções Aplicadas Durante o Bloco

- Ajuste de `getByText` para `getAllByText` em um teste de datas de `HistoryPage.test.tsx`.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._ TLS/persistência real continuam controladas pelos Blocos 03/04 e não foram duplicadas aqui.

### P3 — Melhoria Recomendada

- Refinamento visual do Histórico permanece no backlog de design, junto dos refinamentos visuais já registrados para Dashboard/Movimentações/Comparativo/Planejamento.
- Vulnerabilidades moderadas de desenvolvimento na cadeia `drizzle-kit`/`esbuild` seguem conhecidas; produção continua com 0 vulnerabilidades.

### P4 — Opcional

- Quando a API real existir, substituir o provider demonstrativo mantendo a interface consumida pelos view-models (incluindo `history-view-model.ts`, que permanece somente leitura).
- "Configurações" continua como navegação futura desabilitada.

## 14. Riscos Restantes

- A página ainda opera somente sobre fixtures sintéticas em memória; não há persistência entre recarregamentos.
- A experiência visual cumpre o uso funcional, mas ainda não representa aceite visual final.
- Esta era a última área funcional planejada para esta rodada — próximos blocos (se houver) dependem de nova decisão explícita do proprietário.

## 15. Evidências

```
$ npm run test
api: Test Files 6 passed (6) · Tests 34 passed (34)
web: Test Files 31 passed (31) · Tests 251 passed (251)
domain: Test Files 8 passed (8) · Tests 153 passed (153)
Total: 438/438

$ npx ddae-engine validate
Status: OK · Warnings: 0 · Errors: 0

$ npx ddae-engine audit
Status: OK · Warnings: 9 (7 gates + P2 Bloco 03 + P2 Bloco 04) · Errors: 0

$ npm audit --omit=dev
found 0 vulnerabilities

$ npm audit
4 moderate severity vulnerabilities (esbuild/@esbuild-kit/drizzle-kit, cadeia de desenvolvimento, já P3 desde o Bloco 03)

$ npm ls react-router react-router-dom
web -> react-router@8.3.0   (react-router-dom ausente)

$ npm run verify:runtime
[verify:runtime] SUCESSO — @finanhouse/domain e o serviço de aplicação compilado funcionam via import padrão do Node, sem depender de arquivos .ts em runtime.

$ git merge-base --is-ancestor b2e032c main ; echo $?
1   (não integrado antes desta rodada)

$ git merge --no-ff feat/session-11-bloco-10-historico-memory
e107716..fd026da, sem conflitos

$ npm run test (main, pós-merge)
Total: 438/438 — resultado idêntico ao da branch
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Nenhum bloco novo foi criado depois deste, por instrução explícita do proprietário. As quatro áreas funcionais planejadas para esta rodada (Movimentações, Comparativo, Planejamento, Histórico) estão concluídas. Próximos passos sugeridos, a critério do proprietário: sessão dedicada de refinamento visual (Dashboard/Movimentações/Comparativo/Planejamento/Histórico), ou avanço da persistência real (API + MySQL), ainda bloqueada pela pendência de TLS (Bloco 04).

## 18. Commit Semântico Sugerido

```
feat(web): implementar histórico mensal em memória
```

Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário.
