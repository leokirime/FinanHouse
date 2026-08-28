# Prompt — Bloco 06: Dashboard, Planejamento, Comparativo e Histórico

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_06_dashboard_planejamento_comparativo_e_historico.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Comprovar por teste — não por código novo — que Dashboard, Planejamento, Comparativo e Histórico já refletem corretamente as parcelas de um `InstallmentPlan` (cada uma uma `FinancialEntry` real), e ajustar rotulagem pontual apenas onde os testes revelarem necessidade real.

## 3. Escopo

- Testes novos nos 4 view-models/páginas + Movimentações, cobrindo os casos A–G (seção 12 abaixo).
- Ajuste mínimo de rotulagem em Movimentações (indicador de parcela, ex. "3/10") — só se confirmado necessário pelos testes; candidato já identificado na abertura do bloco (nenhuma ocorrência de `installmentNumber`/`installmentPlanId` em nenhum componente de Movimentações hoje).

## 4. Fora de Escopo

- Qualquer nova regra de cálculo, novo indicador, novo componente visual além da rotulagem mínima em Movimentações.
- Ensinar Dashboard/Planejamento/Comparativo/Histórico sobre `InstallmentPlan` — essas telas continuam operando exclusivamente sobre `FinancialEntry`.
- Editar/excluir/renegociar plano, recorrência genérica, notificações, calendário doméstico.
- Migration, Aiven, seed/bootstrap, Bloco 07.

## 5. Arquivos Permitidos

- `apps/web/src/pages/{DashboardPage,PlanningPage,ComparisonPage,HistoryPage,FinancialEntriesPage}.tsx` (leitura; alteração só se necessário)
- `apps/web/src/hooks/use-dashboard-view-model.ts`, `use-period-budgets.ts`
- `apps/web/src/view-models/{dashboard,planning,comparison,history,financial-entries}-view-model.ts`
- `apps/web/src/components/financial-entries/FinancialEntryList.tsx`, `FinancialEntryStatusBadge.tsx` (só para o ajuste de rotulagem, se confirmado)
- Testes correspondentes a cada arquivo acima
- Feedback do Bloco 06 (só ao final)

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Não aplicável — bloco de validação de leitura financeira já autenticada/escopada por household, nenhuma rota nova.

## 8. Restrições de Performance

Nenhuma nova consulta de rede — as quatro telas já leem de `state.entries` (`FinanceProvider`). Se o ajuste de rotulagem precisar de dado adicional, deve vir de campos já presentes em `FinancialEntry` (`installmentPlanId`/`installmentNumber`), nunca uma nova chamada.

## 9. Restrições de Design System

Se o ajuste de rotulagem em Movimentações for necessário: reaproveitar `fh-badge`/tokens existentes — nenhum componente visual novo.

## 10. Tarefas

1. Escrever os testes dos casos A–G (seção 11) contra o estado/fixtures existentes, sem alterar código de produção primeiro.
2. Rodar a suíte — confirmar se os casos passam sem alteração (hipótese do plano de execução).
3. Implementar o ajuste mínimo de rotulagem em Movimentações, com teste, apenas se os testes do passo 1 revelarem necessidade real.
4. Rodar a suíte completa e as validações obrigatórias.
5. Preencher feedback só depois de tudo validado.

## 11. Critérios de Aceite

- [x] Caso A — Dashboard contabiliza só a parcela da competência atual (não o total do plano).
- [x] Caso B — parcela de competência futura não entra no mês atual; entra ao navegar para o mês dela.
- [x] Caso C — parcela `planned` entra no previsto/projetado da categoria real, nunca como realizado antes de sua própria transição de status.
- [x] Caso D — Comparativo: cada mês carrega só sua própria parcela, nunca o total do plano em mais de um mês.
- [x] Caso E — Histórico: cada competência lista só sua própria parcela.
- [x] Caso F — parcela realizada segue a mesma semântica de qualquer `FinancialEntry` realizada.
- [x] Caso G — lançamento avulso continua produzindo os mesmos indicadores, sem regressão.
- [x] Situação de Movimentações resolvida (indicador "Parcela N/Total" adicionado e testado — ver seção 17).
- [x] Nenhuma segunda fonte de verdade financeira baseada em `InstallmentPlan`.
- [x] Suíte completa sem regressão (ver seção 17).

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test`
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine audit`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_06_dashboard_planejamento_comparativo_e_historico --session session_12_parcelamentos_e_compromissos_futuros
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
test(installments): comprovar reflexo correto de parcelas em dashboard, planejamento, comparativo e historico
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.

## 17. Executado — Evidência

Todos os casos A–G passaram com **zero alteração de código de produção** nos quatro view-models de cálculo (Dashboard/Planejamento/Comparativo/Histórico) — confirmando a hipótese arquitetural do bloco. Detalhe completo (arquivos, describes, contagens de teste antes/depois) nas seções 24–25 do bloco (`05_blocks/bloco_06_dashboard_planejamento_comparativo_e_historico.md`).

Único código de produção alterado: rotulagem de parcela em Movimentações (`financial-entries-view-model.ts`, `FinancialEntryList.tsx`, `FinancialEntryList.css`, `FinancialEntriesPage.tsx`), reaproveitando o hook `useInstallmentPlans()` já existente (Bloco 05) sem tocar o `FinanceProvider` global. Teste de independência entre parcelas irmãs incluído (`FinancialEntriesPage.test.tsx`).

Resultado da suíte: API 667 (inalterado), Domain 214 (inalterado), Web 420 → 438 (+18). `ddae-engine audit`: 0 erros, 0 pendências P1/P2, 9 warnings nesta execução (os 8 estruturais já conhecidos + "Bloco 06 sem feedback", que some assim que o feedback for criado).

**Nenhum commit, push ou merge foi realizado nesta execução**, conforme a seção 16 e a instrução explícita do usuário.

## 18. Executado — Correção Pós-Validação Visual

Validação visual humana da apresentação de parcelas identificou a necessidade de separar parcelamentos concluídos dos ainda em andamento na tela de Parcelamentos, para evitar confusão sobre o que ainda precisa ser pago. Correção aplicada antes do commit, sem reabrir o planejamento original — extensão registrada na seção 26 do bloco (`05_blocks/bloco_06_dashboard_planejamento_comparativo_e_historico.md`).

Resumo: `isCompleted` derivado (`realizedCount === installmentCount`, nunca persistido), filtro "Em andamento"/"Concluídos"/"Todos" via novo componente `InstallmentPlanStatusFilterTabs`, badge textual "Concluído" reaproveitando `fh-badge[data-tone='realized']`. Nenhuma exclusão de plano/parcela, nenhum botão "Finalizar", nenhum status persistido, nenhuma alteração de backend/migration. Suíte: API 667 (inalterado), Domain 214 (inalterado), Web 438 → 455 (+17). Total 1336.

**Bloco 06 aprovado pelo usuário em 2026-08-28** — ver seção 16 do feedback (`08_feedbacks/feedback_bloco_06_dashboard_planejamento_comparativo_e_historico.md`) para o registro completo da aprovação e da observação de validação manual futura (não bloqueante) sobre o cenário de competência diferente.

## 19. Executado — Correção Pós-Validação Visual: Realizar Parcela pelo Detalhe do Parcelamento

Segunda lacuna identificada na mesma validação visual: o detalhe do parcelamento era somente leitura, sem ação para o usuário marcar uma parcela como paga — mesmo quando ela pertencia a uma competência diferente da exibida em Movimentações (comportamento correto, não um bug de geração). Correção registrada na seção 27 do bloco.

Resumo: "Marcar como pago" no detalhe reaproveita o `RealizeEntryDialog` já existente, sem alterá-lo, realizando a MESMA `FinancialEntry` (nunca um lançamento novo). Confirmado por inspeção que o fluxo de realização (frontend e backend) já opera pela competência da própria parcela, nunca pela competência atualmente exibida — zero alteração de backend/schema/migration. `canRealize` no detalhe replica exatamente a regra já usada em Movimentações. Suíte: API 667 (inalterado), Domain 214 (inalterado), Web 455 → 462 (+7). Total 1343.

**Nenhum commit, push ou merge foi realizado.**
