# Bloco 20 — Exclusão de lançamentos e simplificação do header

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-08-06

## 1. Objetivo

Substituir a ação "Cancelar lançamento" por uma exclusão real e permanente ("Excluir lançamento"), com confirmação obrigatória, e remover o botão redundante "Nova movimentação" do `DashboardHeader`.

## 2. Contexto

Bloco 19 concluiu a autenticação real e as sessões domésticas (merge `f7b924c` em `main`). O usuário validou o app manualmente e pediu dois ajustes funcionais pequenos, isolados da preparação de deploy Vercel (próximo bloco, fora de escopo aqui): a ação "Cancelar" nunca removia de fato o lançamento (apenas mudava o status), o que não correspondia à expectativa de uso; e o botão "Nova movimentação" do header duplicava a navegação já oferecida pela Sidebar ("Movimentações").

## 3. Problema que Este Bloco Resolve

1. Usuário não tinha como remover permanentemente um lançamento incorreto/duplicado — só "cancelar" (mudar status, mantendo o registro).
2. O header exibia um CTA desabilitado ("Nova movimentação") sem função, redundante com a Sidebar, ocupando espaço ao lado do botão "Sair".

## 4. Escopo

- Nova regra de domínio `assertFinancialEntryDeletable`: competência aberta (mesma regra de `cancelFinancialEntry`); status `planned`, `pending` **ou `realized`** — só `cancelled` fica de fora. **Ajustada em revisão, antes do commit:** a versão inicial herdava também o conjunto de status do cancelamento (só `planned`/`pending`); o usuário apontou que isso impedia excluir um lançamento `realized` por engano sem um estorno prévio desnecessário, então a elegibilidade foi ampliada — ver DT-16.
- Porta `FinancialEntryRepository.remove(id, householdId)` + implementações Drizzle (`DELETE ... WHERE id = ? AND household_id = ?`) e em memória — nunca soft delete.
- `DeleteFinancialEntryService` (aplicação) + rota `DELETE /api/v1/households/:householdId/entries/:entryId` (autenticada, household exclusivamente da sessão/URL, 404 para inexistente/outro household, 409 `DOMAIN_CONFLICT` para competência fechada ou status não elegível).
- Frontend: ação "Excluir" no lugar de "Cancelar" nas linhas de lançamento; diálogo de confirmação (`DeleteEntryDialog`, adaptado de `CancelEntryDialog`); nova ação `DELETE_ENTRY` no estado financeiro, recarregando a lista após sucesso (mesmo padrão de todas as outras mutações — sem reload de página, sem dado simulado).
- Remoção do botão "Nova movimentação" do `DashboardHeader` (CSS e testes correspondentes).
- Testes de backend (rota HTTP, serviço, domínio) e frontend (dialog/página, sincronização com Dashboard/Comparativo/Planejamento/Histórico).
- Atualização de documentação afetada (requisitos funcionais, contrato HTTP, contrato frontend-backend, decisões técnicas).

## 5. Fora de Escopo

- Deploy/preparação para Vercel (bloco seguinte, "Preparação de produção e deploy Vercel").
- Remoção do status histórico `cancelled` do domínio/schema, ou de qualquer migration destrutiva — `cancelFinancialEntry`, `ReopenFinancialEntryService` e a rota `/cancel` continuam existindo e funcionais; apenas o caminho de UI que **inicia** um cancelamento foi removido.
- Alteração de credenciais, seed, bootstrap.
- Exclusão de qualquer lançamento financeiro real (validação usa apenas fixtures/dados sintéticos).

## 6. Arquivos e Pastas Envolvidos

- `packages/domain/src/financial-entry/financial-entry-rules.ts` (+ test)
- `apps/api/src/application/ports/financial-entry-repository.ts`
- `apps/api/src/application/services/financial-entry-services.ts` (+ test)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-financial-entry-repository.ts`
- `apps/api/src/infrastructure/repositories/memory/in-memory-financial-entry-repository.ts`
- `apps/api/src/http/routes/entries.ts` (+ test)
- `apps/web/src/api/financial-api.ts`
- `apps/web/src/state/finance-types.ts`, `apps/web/src/state/FinanceProvider.tsx`
- `apps/web/src/state/test-support/finance-test-reducer.ts` (+ testes de sincronização em `finance-*-sync.test.ts`, `finance-test-reducer.test.ts`)
- `apps/web/src/view-models/financial-entries-view-model.ts` (+ test)
- `apps/web/src/components/financial-entries/DeleteEntryDialog.tsx` (novo, substitui `CancelEntryDialog.tsx`, removido)
- `apps/web/src/components/financial-entries/FinancialEntryActions.tsx`, `FinancialEntryList.tsx` (+ test)
- `apps/web/src/pages/FinancialEntriesPage.tsx` (+ test)
- `apps/web/src/components/layout/DashboardHeader.tsx`, `DashboardHeader.css` (+ test)
- `Docs/01_product/requisitos_funcionais.md`, `Docs/03_contracts/contrato_api_http.md`, `Docs/03_contracts/contrato_frontend_backend.md`, `Docs/02_architecture/decisoes_tecnicas.md`

## 7. Dependências

- Bloco 19 concluído e mergeado em `main` (autenticação real, sessão vinculada ao household) — a rota `DELETE` depende do mesmo gate de sessão das demais rotas `/households/:householdId/...`.

## 8. Plano de Implementação

1. Regra de domínio `assertFinancialEntryDeletable` (mesmas precondições de `cancelFinancialEntry`).
2. Porta + repositórios (`remove(id, householdId)`, Drizzle e memória).
3. Serviço de aplicação `DeleteFinancialEntryService` + rota `DELETE .../entries/:entryId`.
4. Testes HTTP da rota (sucesso, 404 inexistente, 404 outro household, 401 sem sessão, 409 competência fechada, 409 status não elegível, 503 erro sanitizado).
5. Remoção do botão "Nova movimentação" do `DashboardHeader`.
6. `deleteEntry` na API do frontend + ação `DELETE_ENTRY` no `FinanceProvider` e no reducer de teste.
7. `DeleteEntryDialog` (adaptado de `CancelEntryDialog`) + troca do botão "Cancelar" por "Excluir" em `FinancialEntryActions`/`FinancialEntryList`/`FinancialEntriesPage`.
8. Remoção de `CancelEntryDialog.tsx` (sem uso remanescente).
9. Testes de sincronização (dashboard/comparativo/planejamento/histórico) e de página (abrir/fechar diálogo, Escape, confirmar, erro mantém o lançamento).
10. Validações completas + documentação.

## 9. Critérios de Aceite

- [x] "Cancelar" não aparece mais como ação disponível; "Excluir" aparece no lugar para `planned`/`pending`/`realized`.
- [x] Excluir exige confirmação explícita (diálogo, nunca `window.confirm`), com Escape/foco/aria corretos e proteção contra duplo envio.
- [x] Exclusão confirmada remove o lançamento do banco (`DELETE ... WHERE id = ? AND household_id = ?`) e da lista imediatamente, sem reload de página.
- [x] Dashboard, Comparativo, Planejamento e Histórico refletem a exclusão, inclusive de uma movimentação `realized` (mesma fonte de estado, recarregada após a mutação).
- [x] Exclusão respeita a regra de competência (aberta) para qualquer status elegível, incluindo `realized`; `cancelled` nunca é excluído diretamente.
- [x] Exclusão nunca afeta lançamento de outro household (404 na rota; `WHERE household_id = ?` no repositório) — inclusive para uma movimentação `realized`.
- [x] `cancelled` como status histórico, `cancelFinancialEntry`, `ReopenFinancialEntryService` e a rota `/cancel` continuam funcionais e intactos.
- [x] Botão "Nova movimentação" removido do `DashboardHeader`; "Sair" preservado; Sidebar preserva "Movimentações"; `/movimentacoes` inalterada.
- [x] Nenhum dado financeiro real alterado durante a validação.

## 10. Validações Obrigatórias

- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test` (api 571, web 366, domain 161 — 1098 total, após a correção de regra)
- [x] `npx ddae-engine validate`
- [x] `npx ddae-engine audit`

## 11. Segurança

Household nunca aceito do corpo da requisição — sempre derivado da URL e validado contra a sessão (mesmo padrão das demais rotas desde o Bloco 19, DT-14). `remove()` do repositório Drizzle usa `WHERE id = ? AND household_id = ?` como segunda barreira, independente da checagem já feita na rota (`loadEntryOrNotFound`). Falha de conexão/erro inesperado seguem o `translatePersistenceError`/`error-handler` existentes — nunca vazam detalhe interno.

## 12. Performance

Sem impacto relevante — um `DELETE` simples por chave primária + household, mesmo padrão de custo das demais mutações (que já recarregam a lista completa de lançamentos após qualquer escrita).

## 13. Design System / UX

Reutiliza integralmente a infraestrutura de diálogo existente (`EntryDialog`, `useMutationDialog`) e a classe `fh-entry-form__primary--danger` já usada para ações destrutivas — nenhum padrão visual novo introduzido. Botão "Excluir" na lista usa `--fh-expense` (cor já usada para despesas/estados negativos) como indicação discreta de ação destrutiva, sem exagero visual.

## 14. Riscos

- Usuários acostumados com "Cancelar" podem estranhar a natureza permanente de "Excluir" — mitigado pelo texto explícito do diálogo ("removido permanentemente... não poderá ser recuperado").
- Nenhum risco de migração de dados: nenhuma coluna/enum foi alterada.

## 15. Pendências Esperadas

Nenhuma pendência nova identificada neste bloco.

## 16. Feedback Obrigatório

Gerado e preenchido via `ddae-engine feedback create --block bloco_20_exclusao_de_lancamentos_e_simplificacao_do_header --session session_11_fundacao_do_finanhouse` — ver `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_20_exclusao_de_lancamentos_e_simplificacao_do_header.md`.

## 17. Commit Semântico Sugerido

_Sugestão apenas — nunca executado automaticamente sem confirmação explícita do usuário._

```
feat(entries): substituir cancelamento por exclusão real e remover CTA redundante do header
```
