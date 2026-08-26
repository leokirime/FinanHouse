# Prompt — Bloco 05: Frontend de criação e visualização de parcelamentos

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_05_frontend_de_criacao_e_visualizacao_de_parcelamentos.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Dar ao usuário uma interface real (criação + listagem + detalhe) para as compras parceladas já persistidas atomicamente pelo Bloco 04, sem nenhum dado fictício.

## 3. Escopo

- Extensão da camada de API do frontend com os 3 endpoints de parcelamentos.
- Hooks page-scoped (`useInstallmentPlans`, `useInstallmentPlanDetail`), view-model puro, componentes de lista/detalhe/estado vazio/formulário.
- Nova rota `/movimentacoes/parcelamentos`, alcançada por sub-navegação dentro de "Movimentações".
- Testes de comportamento (empty state, validações, submissão, listagem, detalhe).

## 4. Fora de Escopo

- Editar/excluir/renegociar o plano inteiro.
- Calendário geral da casa, notificações, dashboard futuro.
- Qualquer acesso real ao Aiven, migration nova, seed/bootstrap, escrita automatizada.
- Bloco 06.

## 5. Arquivos Permitidos

- `apps/web/src/api/financial-api.types.ts`, `financial-api.mappers.ts`, `financial-api.ts`
- `apps/web/src/hooks/use-installment-plans.ts`, `use-installment-plan-detail.ts`
- `apps/web/src/view-models/installment-plan-view-model.ts`
- `apps/web/src/components/installments/*`
- `apps/web/src/components/financial-entries/FinancialAreaTabs.tsx`
- `apps/web/src/pages/InstallmentPlansPage.tsx`, `FinancialEntriesPage.tsx`
- `apps/web/src/App.tsx`, `components/layout/RootLayout.tsx`
- Testes correspondentes a cada arquivo acima
- Documentação: bloco/prompt/feedback do Bloco 05

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

`householdId`/`createdByUserId` nunca fazem parte do corpo enviado pelo frontend — vêm da sessão autenticada no backend (mesmo padrão de `createEntry`, Bloco 19/DT-14). Categoria sempre de um select com as categorias reais do household — nunca `categoryId` digitado livremente. Erros sempre a mensagem sanitizada devolvida pela API — nunca SQL/stack/host/Aiven/token/cookie exibido na UI.

## 8. Restrições de Performance

Hooks page-scoped (independentes do `FinanceProvider` global) — nenhuma chamada de rede extra nas rotas existentes (Dashboard/Comparativo/Planejamento/Histórico). Progresso por linha na lista deriva de `state.entries` já carregado — zero chamadas extra por plano listado.

## 9. Restrições de Design System

Reaproveitar integralmente tokens/classes existentes (`fh-card`, `fh-entry-form__*`, `fh-entry-dialog`, `fh-badge`, `FinancialEntryStatusBadge`) — nenhuma nova área principal na navegação global (`Sidebar.tsx` permanece com 5 itens).

## 10. Tarefas

1. Inspecionar a arquitetura real do frontend (roteamento, navegação, formulários, API client, `FinanceProvider`, design system) antes de desenhar qualquer componente novo.
2. Estender a camada de API do frontend com os 3 contratos de parcelamentos.
3. Criar os hooks page-scoped de lista/criação e de detalhe.
4. Criar o view-model puro (progresso, prévia, formatação de competência).
5. Criar os componentes de lista/detalhe/estado vazio/formulário.
6. Criar a página, a sub-navegação em abas e a rota.
7. Escrever os testes de comportamento.
8. Rodar a suíte completa e corrigir qualquer quebra estrutural remanescente.
9. Preencher bloco/prompt; criar feedback só depois de tudo validado.

## 11. Critérios de Aceite

- [x] Nenhum dado fictício em nenhuma tela.
- [x] Categoria/valor/competência/dia sempre convertidos para o contrato real da API, nunca inventados no cliente.
- [x] Número de parcelas: mínimo 2, sem máximo arbitrário.
- [x] Submissão bloqueia duplo envio, trata erro sanitizado, mostra o parcelamento recém-criado com dados reais.
- [x] Nenhuma tela nova na navegação global.
- [x] Suíte completa sem regressão.

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
ddae-engine feedback create --block bloco_05_frontend_de_criacao_e_visualizacao_de_parcelamentos --session session_12_parcelamentos_e_compromissos_futuros
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(frontend_de_criacao_e_visualizacao_de_parcelamentos): adicionar interface de criacao e visualizacao de parcelamentos
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
