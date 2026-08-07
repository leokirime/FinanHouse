# Prompt — Bloco 20: Exclusão de lançamentos e simplificação do header

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_20_exclusao_de_lancamentos_e_simplificacao_do_header.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Substituir a ação "Cancelar lançamento" por exclusão real e permanente ("Excluir lançamento"), com confirmação obrigatória, e remover o botão redundante "Nova movimentação" do `DashboardHeader`.

## 3. Escopo

- Regra de domínio de elegibilidade para exclusão (mesmas precondições do cancelamento).
- `remove(id, householdId)` na porta e nos repositórios (Drizzle + memória) — nunca soft delete.
- Serviço de aplicação + rota `DELETE /api/v1/households/:householdId/entries/:entryId`.
- Diálogo de confirmação no frontend (reaproveitando `EntryDialog`/`useMutationDialog`), ação "Excluir" no lugar de "Cancelar", atualização do estado sem reload de página.
- Remoção do CTA "Nova movimentação" do header.
- Testes de backend e frontend cobrindo os cenários do bloco.
- Documentação afetada (RF, contrato HTTP, contrato frontend-backend, DT se aplicável).

## 4. Fora de Escopo

- Deploy/preparação Vercel.
- Remoção do status histórico `cancelled`, de `cancelFinancialEntry`, da rota `/cancel` ou de `ReopenFinancialEntryService` — permanecem funcionais.
- Migration destrutiva, seed, bootstrap, alteração de credenciais.
- Exclusão de qualquer lançamento financeiro real.

## 5. Arquivos Permitidos

- `packages/domain/src/financial-entry/**`
- `apps/api/src/application/ports/financial-entry-repository.ts`
- `apps/api/src/application/services/financial-entry-services.ts` (+ test)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-financial-entry-repository.ts`
- `apps/api/src/infrastructure/repositories/memory/in-memory-financial-entry-repository.ts`
- `apps/api/src/http/routes/entries.ts` (+ test)
- `apps/web/src/api/financial-api.ts`
- `apps/web/src/state/**` (finance-types, FinanceProvider, test-support)
- `apps/web/src/view-models/financial-entries-view-model.ts` (+ test)
- `apps/web/src/components/financial-entries/**`
- `apps/web/src/pages/FinancialEntriesPage.tsx` (+ test)
- `apps/web/src/components/layout/DashboardHeader.tsx`, `.css` (+ test)
- `Docs/01_product/requisitos_funcionais.md`, `Docs/03_contracts/contrato_api_http.md`, `Docs/03_contracts/contrato_frontend_backend.md`, `Docs/02_architecture/decisoes_tecnicas.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_20_*.md`, `06_prompts/prompt_bloco_20_*.md`, `08_feedbacks/feedback_bloco_20_*.md`

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Não faça merge na `main` sem nova autorização explícita.
- Não use `window.confirm` — reaproveite o padrão de diálogo já existente no projeto.
- Não implemente soft delete.
- Não altere infraestrutura de produção neste bloco.

## 7. Restrições de Segurança

Household nunca aceito do corpo da requisição — sempre derivado da sessão/URL (mesmo padrão desde o Bloco 19, DT-14). A exclusão nunca pode afetar um registro de outro household, mesmo em colisão de `id` (checagem na rota + `WHERE household_id = ?` no repositório). Autenticação obrigatória na rota `DELETE`.

## 8. Restrições de Performance

Não aplicável — operação pontual (`DELETE` por chave primária + household), mesmo custo das demais mutações já existentes.

## 9. Restrições de Design System

Reutilizar `EntryDialog`, `useMutationDialog` e a classe `fh-entry-form__primary--danger` já existentes. Nenhum padrão visual novo deve ser introduzido para a confirmação de exclusão.

## 10. Tarefas

1. Implementar `assertFinancialEntryDeletable` no domínio + testes.
2. Implementar `remove(id, householdId)` na porta e nos dois repositórios.
3. Implementar `DeleteFinancialEntryService` + rota `DELETE .../entries/:entryId` + testes HTTP.
4. Remover o CTA "Nova movimentação" do `DashboardHeader` + testes.
5. Implementar `deleteEntry` na API do frontend + ação `DELETE_ENTRY` no `FinanceProvider`/reducer de teste.
6. Criar `DeleteEntryDialog`, substituir "Cancelar" por "Excluir" na UI, remover `CancelEntryDialog`.
7. Adicionar testes de sincronização (dashboard/comparativo/planejamento/histórico) e de página.
8. Atualizar documentação afetada.
9. Rodar validações completas e reportar.

## 11. Critérios de Aceite

- [x] "Excluir" substitui "Cancelar" como ação oferecida para lançamentos `planned`/`pending`.
- [x] Exclusão exige confirmação explícita, nunca `window.confirm`.
- [x] Exclusão remove o registro do banco permanentemente, respeitando household e competência.
- [x] Estado do frontend atualiza sem reload de página; todas as telas derivadas refletem a exclusão.
- [x] `cancelled`, `cancelFinancialEntry` e a rota `/cancel` continuam intactos.
- [x] CTA "Nova movimentação" removido do header; Sidebar e `/movimentacoes` preservadas.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `ddae-engine audit`
- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_20_exclusao_de_lancamentos_e_simplificacao_do_header --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Ver `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_20_exclusao_de_lancamentos_e_simplificacao_do_header.md` para o status final.

## 15. Commit Semântico Sugerido

```
feat(entries): substituir cancelamento por exclusão real e remover CTA redundante do header
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
