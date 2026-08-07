# Feedback — Bloco 20: Exclusão de lançamentos e simplificação do header

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-08-06

## 1. Resumo Executivo

O Bloco 20 substituiu a ação "Cancelar lançamento" por uma exclusão real e permanente ("Excluir lançamento"), com confirmação obrigatória em diálogo (nunca `window.confirm`), e removeu o botão "Nova movimentação" (redundante com a Sidebar) do `DashboardHeader`.

A regra de elegibilidade passou por uma correção funcional durante a revisão, antes de qualquer commit: a primeira versão fazia "Excluir" herdar exatamente as mesmas precondições de "Cancelar" (só `planned`/`pending`). O usuário apontou que isso impedia excluir um lançamento `realized` por engano sem antes estornar — uma restrição sem justificativa real, já que a única proteção que importa é a competência estar aberta. A regra final: **competência `open` + status `planned`, `pending` ou `realized` → pode excluir; competência `closed`/`review` → nunca; status `cancelled` → nunca (reativação continua sendo o único caminho de volta)**. `cancelled`, `cancelFinancialEntry`, a rota `/cancel` e a reativação continuam intactos e funcionais — apenas o caminho de UI que iniciava um novo cancelamento foi removido.

**1098 testes automatizados passam** (API 571, web 366, domínio 161), build/lint/typecheck/`verify:runtime`/`ddae-engine validate`/`ddae-engine audit` sem erros. Nenhum dado financeiro real foi alterado. **O proprietário do projeto executou a validação manual no navegador (login, header, Sidebar, ação "Excluir", diálogo de confirmação, exclusão real com atualização imediata da interface) e aprovou o resultado**, autorizando explicitamente o encerramento do Bloco 20: commit, push da branch, merge em `main`, push de `main` e limpeza da branch de feature.

## 2. Objetivo do Bloco

Substituir "Cancelar lançamento" por exclusão real e permanente ("Excluir lançamento"), com confirmação obrigatória, e remover o botão redundante "Nova movimentação" do `DashboardHeader`. Elegibilidade final (após correção pós-revisão): competência aberta é a única exigência de contexto; entre os status, todos exceto `cancelled` são elegíveis.

## 3. Escopo Implementado

Implementado integralmente, incluindo a correção de regra solicitada na revisão:

- Regra de domínio `assertFinancialEntryDeletable`: competência precisa estar `open` (mesma regra de `cancelFinancialEntry`); status elegíveis `planned`/`pending`/`realized`; só `cancelled` é rejeitado.
- `FinancialEntryRepository.remove(id, householdId)` — Drizzle (`DELETE ... WHERE id = ? AND household_id = ?`) e memória — nunca soft delete.
- `DeleteFinancialEntryService` + rota `DELETE /api/v1/households/:householdId/entries/:entryId`.
- `DeleteEntryDialog` (novo) substituindo `CancelEntryDialog` (removido) na interface; botão "Excluir" no lugar de "Cancelar" nas linhas de lançamento — agora também para `realized`.
- Nova ação `DELETE_ENTRY` no estado financeiro (`FinanceProvider` real e reducer de teste), seguindo o mesmo padrão de recarga da lista após mutação — sem reload de página, sem dado simulado.
- Remoção do botão "Nova movimentação" do `DashboardHeader`.
- Testes de backend (domínio, serviço, repositório via `FakeDrizzleDb`, rota HTTP) e frontend (reducer de teste, sincronização com dashboard/comparativo/planejamento/histórico, página) — incluindo os 5 cenários explícitos pedidos na correção (exclusão de `realized` em competência aberta; desaparecimento do estado; recálculo de totais; bloqueio em competência fechada; isolamento por household).
- Atualização de `requisitos_funcionais.md`, `contrato_api_http.md`, `contrato_frontend_backend.md`, `decisoes_tecnicas.md` (DT-16, incluindo o registro da revisão).

## 4. Arquivos Criados

- `apps/web/src/components/financial-entries/DeleteEntryDialog.tsx`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_20_exclusao_de_lancamentos_e_simplificacao_do_header.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/06_prompts/prompt_bloco_20_exclusao_de_lancamentos_e_simplificacao_do_header.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_20_exclusao_de_lancamentos_e_simplificacao_do_header.md` (este arquivo)

## 5. Arquivos Alterados

**Domínio:**
- `packages/domain/src/financial-entry/financial-entry-rules.ts` (+ test) — `assertFinancialEntryDeletable` ajustada na correção pós-revisão para aceitar `realized`.

**Backend:**
- `apps/api/src/application/ports/financial-entry-repository.ts`
- `apps/api/src/application/services/financial-entry-services.ts` (+ test)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-financial-entry-repository.ts` (+ test)
- `apps/api/src/infrastructure/repositories/memory/in-memory-financial-entry-repository.ts`
- `apps/api/src/http/routes/entries.ts` (+ test)

**Frontend:**
- `apps/web/src/api/financial-api.ts`
- `apps/web/src/state/finance-types.ts`
- `apps/web/src/state/FinanceProvider.tsx`
- `apps/web/src/state/test-support/finance-test-reducer.ts` (+ test)
- `apps/web/src/state/test-support/finance-dashboard-sync.test.ts`
- `apps/web/src/state/test-support/finance-comparison-sync.test.ts`
- `apps/web/src/state/test-support/finance-history-sync.test.ts`
- `apps/web/src/state/test-support/finance-planning-sync.test.ts`
- `apps/web/src/view-models/financial-entries-view-model.ts` (+ test) — `canDelete` reescrito de `planned|pending` para `status !== 'cancelled'` na correção pós-revisão.
- `apps/web/src/components/financial-entries/FinancialEntryActions.tsx`
- `apps/web/src/components/financial-entries/FinancialEntryActions.css`
- `apps/web/src/components/financial-entries/FinancialEntryList.tsx` (+ test)
- `apps/web/src/pages/FinancialEntriesPage.tsx` (+ test)
- `apps/web/src/components/layout/DashboardHeader.tsx` (+ test)
- `apps/web/src/components/layout/DashboardHeader.css`

**Documentação:**
- `Docs/01_product/requisitos_funcionais.md`
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-16, com a seção "Revisão dentro do mesmo bloco")
- `Docs/03_contracts/contrato_api_http.md`
- `Docs/03_contracts/contrato_frontend_backend.md`

## 6. Arquivos Removidos

- `apps/web/src/components/financial-entries/CancelEntryDialog.tsx` — sem uso remanescente após a troca por `DeleteEntryDialog.tsx`; nenhum teste dedicado existia para remover em conjunto.

## 7. Comandos Executados

```
npx ddae-engine block create "Exclusão de lançamentos e simplificação do header" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_20_exclusao_de_lancamentos_e_simplificacao_do_header --session session_11_fundacao_do_finanhouse
npx ddae-engine feedback create --block bloco_20_exclusao_de_lancamentos_e_simplificacao_do_header --session session_11_fundacao_do_finanhouse

git checkout main
git pull --ff-only origin main
git checkout -b feat/session-11-bloco-20-exclusao-lancamentos

npm run build:domain
npm run typecheck
npm run lint
npm run typecheck:api-scripts
npm run build
npm run verify:runtime
npm run test
npx ddae-engine validate
npx ddae-engine audit

# Após a correção de regra pedida na revisão:
npm.cmd run build
npm.cmd run verify:runtime
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run typecheck:api-scripts
npm.cmd run test
npx.cmd ddae-engine validate
npx.cmd ddae-engine audit
```

## 8. Testes Realizados

**Automatizados (todos passando):**
- Domínio: `assertFinancialEntryDeletable` — **8 casos** (planned/pending/realized permitidos em competência aberta; cancelled rejeitado com `InvalidStatusTransitionError`; competência fechada rejeitada mesmo para `realized`; competência fechada rejeitada para status comum; competência em revisão rejeitada; competência aberta permitida).
- Serviço de aplicação: `DeleteFinancialEntryService` — **7 casos** (exclui planned; exclui pending; exclui realized em competência aberta; rejeita cancelled sem remover; rejeita competência fechada sem remover; rejeita realized em competência fechada sem remover; nunca remove household divergente).
- Repositório Drizzle (`FakeDrizzleDb`): `remove()` — 3 casos (remove do household correto; nunca remove de outro household com mesmo id; propaga `PersistenceError` sanitizado em falha de conexão).
- Rota HTTP `DELETE .../entries/:entryId` — **11 casos** (204 planned; 204 pending; 204 realized em competência aberta; 404 inexistente; 404 outro household — inclusive para uma movimentação `realized`; 401 sem sessão sem remover; 409 `DOMAIN_CONFLICT` competência fechada; 409 `DOMAIN_CONFLICT` realized em competência fechada; 409 `DOMAIN_CONFLICT` status cancelled; 503 sanitizado em falha de conexão do repositório).
- Frontend — reducer de teste (`financeTestReducer`): `DELETE_ENTRY` — 6 casos (exclui planned; exclui pending; exclui realized em competência aberta; rejeita realized em competência fechada sem remover; rejeita cancelled sem remover).
- Frontend — sincronização de estado: dashboard, comparativo, histórico e planejamento, cada um com **dois** testes dedicados — um confirmando que a exclusão remove a movimentação (não apenas muda status, como o cancelamento) e atualiza os totais/distribuições derivados, e um segundo específico excluindo uma movimentação `realized` e confirmando o recálculo dos totais/indicadores realizados.
- Frontend — `FinancialEntriesPage`: 10 casos (botão "Cancelar" não existe mais; "Excluir" aparece para planned/pending; "Excluir" também aparece e funciona para uma movimentação `realized`; "Excluir" não aparece para `cancelled` — que mantém "Reativar"; clicar em Excluir abre confirmação sem excluir; "Voltar" fecha sem excluir; Escape fecha sem excluir; confirmar remove da lista e fecha o diálogo; exclusão rejeitada por competência fechada mantém a movimentação planned e mostra o erro; exclusão de uma movimentação `realized` em competência fechada continua bloqueada).
- Frontend — `DashboardHeader`: botão "Nova movimentação" confirmado ausente; "Sair" continua presente e funcional.
- Frontend — `Sidebar`: suíte existente (14 testes) roda sem alteração, confirmando "Movimentações" preservada.

**Manual, via checagens programáticas (sem ferramenta de navegador disponível nesta sessão):**
- Servidores locais já em execução (API `127.0.0.1:3000`, frontend `127.0.0.1:5173`) foram reutilizados (hot-reload via `tsx watch`/Vite já refletia o código novo, incluindo a correção de regra).
- `GET /health` → 200 (API viva com o código atualizado).
- `DELETE /api/v1/households/1/entries/999999` sem cookie → 401 (rota protegida pelo mesmo gate de sessão do Bloco 19, confirmado contra o servidor real).
- `GET /` do frontend → 200.
- Nenhum smoke-test transacional contra `finanhouse_dev` foi executado: os scripts existentes (`db-smoke-repositories.ts`, `db-smoke-http.ts`) exigem as seis tabelas vazias como pré-condição, o que não é mais o caso desde que dados reais existem no ambiente (pós-Bloco 19). Nenhum dado financeiro real foi tocado, criado ou excluído por essa checagem.

**Validação manual real, executada pelo proprietário no navegador (aprovada):**
- Botão "Movimentação" confirmado removido do `DashboardHeader`; "Sair" preservado e funcional.
- "Movimentações" confirmado preservado na Sidebar; navegação para `/movimentacoes` funcionando normalmente.
- Ação "Cancelar" confirmada substituída visualmente por "Excluir" nas linhas de lançamento.
- Diálogo de confirmação de exclusão aprovado (título, descrição de permanência, botões "Voltar"/"Excluir lançamento").
- Exclusão de lançamento testada manualmente e aprovada, incluindo a atualização da interface logo após a exclusão (lista, indicadores) sem reload de página.
- Nenhum problema visual ou funcional bloqueante encontrado.
- Aprovação registrada pelo proprietário do projeto nesta conversa, autorizando o encerramento do Bloco 20 (commit, push, merge em `main`).

## 9. Validações Executadas

- [x] `npm run build` — sucesso (domain, api, web).
- [x] `npm run verify:runtime` — sucesso.
- [x] `npm run lint` — sem erros/avisos (oxlint, 3 workspaces).
- [x] `npm run typecheck` — sem erros (domain, api, web).
- [x] `npm run typecheck:api-scripts` — sem erros.
- [x] `npm run test` — **1098 testes passando**: API 571 (56 arquivos), web 366 (38 arquivos), domínio 161 (8 arquivos).
- [x] `npx ddae-engine validate` — Status OK, 0 erros, 0 avisos.
- [x] `npx ddae-engine audit` — Status OK, 0 erros, 8 avisos (todos pré-existentes: 7 quality gates com status "Pendente" e a pendência P2 já registrada no feedback do Bloco 19 — nenhum novo aviso introduzido por este bloco).

Todas as validações foram executadas novamente, do zero, depois da correção de regra — os números acima já refletem o estado final (pós-correção), não o estado intermediário.

## 10. Decisões Técnicas

Registrada em `Docs/02_architecture/decisoes_tecnicas.md` como **DT-16 — Exclusão real de movimentações substitui o cancelamento como ação destrutiva da interface (elegibilidade mais ampla que o cancelamento)**. A entrada documenta explicitamente a revisão pós-implementação: a primeira versão herdava as precondições do cancelamento (`planned`/`pending`); a versão final amplia para `realized` (competência aberta é a única exigência de contexto), mantendo só `cancelled` fora do conjunto elegível, com a justificativa de cada escolha (por que `realized` passou a ser elegível, por que `cancelled` continua não sendo, por que não é soft delete). Nenhum código com a regra antiga chegou a ser commitado.

## 11. Problemas Encontrados

Nenhum bug técnico — a única mudança foi funcional/de produto, identificada pelo usuário na revisão antes da aprovação (a regra "Excluir = mesmas precondições de Cancelar" era tecnicamente correta e bem testada, mas não atendia ao objetivo real do usuário). Um erro de tipo (`Date` em vez de `string` em `closedAt` de um teste, na primeira rodada) foi pego pelo `typecheck` e corrigido antes de qualquer commit.

## 12. Correções Aplicadas Durante o Bloco

- `apps/api/src/http/routes/entries.test.ts`: teste de exclusão em competência fechada usava `closedAt: new Date()`; corrigido para `closedAt: '2026-07-20'` (string, formato do domínio) após `npm run typecheck` acusar `TS2322`.
- **Correção funcional pós-revisão (a pedido do usuário):** `assertFinancialEntryDeletable` deixou de herdar o conjunto de status de `cancelFinancialEntry` (`planned`/`pending`) e passou a aceitar também `realized`, mantendo a exigência de competência `open` e a rejeição de `cancelled`. Refletida em: domínio (`financial-entry-rules.ts`, 8 testes), serviço (`financial-entry-services.ts`, 7 testes), rota HTTP (`entries.ts`, 11 testes), view-model do frontend (`canDelete`, 9 testes), reducer de teste (6 testes), 4 arquivos de sincronização de estado (10 testes) e `FinancialEntriesPage` (10 testes). Documentação atualizada em `requisitos_funcionais.md`, `contrato_api_http.md` e `decisoes_tecnicas.md` (DT-16).

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência nova. (A pendência P2 pré-existente do Bloco 19, registrada em `feedback_bloco_19_autenticacao_real_e_sessao_domestica.md`, é anterior a este bloco e não foi tocada aqui.)_

### P3 — Melhoria Recomendada

_Nenhuma. (A validação visual/funcional completa, que não pôde ser feita por esta sessão por falta de ferramenta de navegador, foi executada manualmente pelo proprietário do projeto e aprovada — ver seção 8.)_

### P4 — Opcional

- `RF-09` (`Docs/01_product/requisitos_funcionais.md`) ainda tem um item de critério de aceite marcado como pendente ("Migration `0003_auth_sessions.sql` aplicada... pendentes de duas autorizações") que parece desatualizado — o Bloco 19 já aplicou ambas as autorizações e foi mergeado em `main`. Não corrigido aqui por ser fora do escopo deste bloco; sinalizado para correção pontual futura.

## 14. Riscos Restantes

Nenhum risco técnico novo. Risco de produto mitigado pelo texto explícito do diálogo de confirmação ("removido permanentemente... não poderá ser recuperado"), agora também cobrindo o caso de um lançamento `realized` sendo excluído — a mensagem não distingue por status, então já comunica a permanência da ação em qualquer caso.

## 15. Evidências

```
Test Files  56 passed (56) — apps/api — Tests 571 passed (571)
Test Files  38 passed (38) — apps/web — Tests 366 passed (366)
Test Files   8 passed (8)  — packages/domain — Tests 161 passed (161)

$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/health
200
$ curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://127.0.0.1:3000/api/v1/households/1/entries/999999
401
$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5173/
200

DDAE Engine Validation Report — Status: OK, Warnings: 0, Errors: 0
DDAE Engine Audit Report — Status: OK, Warnings: 8 (pré-existentes), Errors: 0
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo

Aprovado pelo proprietário do projeto após validação manual real no navegador (login, header sem "Movimentação", Sidebar com "Movimentações", ação "Excluir" com diálogo de confirmação, exclusão efetiva com atualização imediata da interface) — autorização explícita para commit, push e merge em `main` registrada nesta sessão.

## 17. Próximo Bloco Recomendado

"Preparação de produção e deploy Vercel" (frontend na Vercel, domínio público, variáveis de ambiente de produção, ambiente de API compatível com produção, cookies `Secure`, HTTPS, CORS/origin de produção, Aiven remoto) — conforme indicado pelo usuário ao final da instrução deste bloco. Não iniciado nesta sessão.

## 18. Commit Semântico Sugerido

```
feat(entries): substituir cancelamento por exclusão real (inclusive de realized) e remover CTA redundante do header
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
