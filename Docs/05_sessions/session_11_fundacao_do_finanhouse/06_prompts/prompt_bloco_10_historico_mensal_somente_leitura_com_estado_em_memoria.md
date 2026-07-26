# Prompt — Bloco 10: Histórico mensal somente leitura com estado em memória

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_10_historico_mensal_somente_leitura_com_estado_em_memoria.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Implementar uma área de Histórico mensal somente leitura, permitindo consultar competências e movimentações anteriores por meio da fonte compartilhada de estado temporário, sem banco de dados ou persistência permanente.

## 3. Escopo

Rota `/historico`; navegação real na `Sidebar` ("Histórico" habilitado); lista cronológica de competências com filtro por ano e status; seleção de uma competência; resumo financeiro (receitas/despesas/saldo realizados, fechamento projetado); contagem por status de movimentação; movimentações filtráveis por status; estado vazio; acessibilidade; responsividade; testes; documentação.

## 4. Fora de Escopo

Criar/editar/realizar/cancelar/excluir movimentações; fechar/reabrir competências; excluir dados; alterar planejamento; API HTTP real; MySQL; migrations; seeds; autenticação; exportação de arquivo; gráficos pesados; redesign geral.

## 5. Arquivos Permitidos

- `apps/web/src/view-models/history-view-model.ts`
- `apps/web/src/pages/HistoryPage.tsx`, `apps/web/src/pages/HistoryPage.css`
- `apps/web/src/components/history/**`
- `apps/web/src/components/layout/{Sidebar,RootLayout}.tsx`, `apps/web/src/App.tsx`
- `apps/web/src/state/finance-demo-history-sync.test.ts`
- `Docs/01_product/requisitos_funcionais.md`, `Docs/02_architecture/estado_temporario_frontend.md`, `Docs/07_design_system/componentes_ui.md`, `apps/web/README.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/{05_blocks,06_prompts,08_feedbacks}/*bloco_10*`
- Não tocar em `apps/api/src/db/**`, `database/migrations/**`, `apps/api/.env.local`

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Consumir exclusivamente o `FinanceDemoProvider` já existente — nenhuma leitura direta de fixtures, nenhum segundo provider financeiro.
- O Histórico é estritamente consultivo: nenhum componente despacha ações no reducer.

## 7. Restrições de Segurança

Apenas dados fictícios (mesmo estado em memória dos Blocos 07–09). Nenhuma autenticação implementada (fora de escopo). Nenhum acesso a `.env.local` ou credenciais. Nenhuma conexão com o banco.

## 8. Restrições de Performance

Cálculos derivados em memória a partir do estado já existente — sem I/O novo, sem biblioteca nova.

## 9. Restrições de Design System

Reaproveitar tokens/componentes já existentes, incluindo os tons `data-tone` já definidos para status de competência (`HeroBrand.css`) e de movimentação (`RecentEntries.css`) — nenhum novo token de cor. Status nunca comunicado só por cor. Novos componentes registrados em `Docs/07_design_system/componentes_ui.md`.

## 10. Tarefas

1. Criar `view-models/history-view-model.ts` (funções puras, dados por argumento, reaproveitando `calculateMonthlySummary`).
2. Criar `pages/HistoryPage.tsx` consumindo `useFinanceDemo()`, sem `dispatch`.
3. Criar os componentes de `components/history/` (filtros, lista de competências, resumo, contagem por status, movimentações, estado vazio).
4. Adicionar rota `/historico` e habilitar "Histórico" na `Sidebar`.
5. Escrever os testes obrigatórios.
6. Documentação e feedback oficial.

## 11. Critérios de Aceite

- [x] Rota `/historico` navegável com `aria-current="page"` na rota ativa
- [x] Mesma fonte de estado das demais áreas — nenhum dado paralelo, nenhum `dispatch`
- [x] Competências da mais recente para a mais antiga, com filtro por ano/status
- [x] Movimentações filtráveis por status, ordenadas da mais recente para a mais antiga
- [x] `cancelled` fora dos totais realizados/projetados
- [x] Nenhum `NaN`/`Infinity`
- [x] Nenhuma ação de mutação em nenhum componente
- [x] Nenhum uso de `localStorage`/`IndexedDB`/`mysql2`/`drizzle-orm`/`.env*`
- [x] Pelo menos 40 testes novos, todos passando

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `ddae-engine audit`
- [x] `npm ci`
- [x] `npm run clean`
- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm audit --omit=dev` / `npm audit`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_10_historico_mensal_somente_leitura_com_estado_em_memoria --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4. A pendência TLS continua controlada pelo Bloco 04; o refinamento visual continua no backlog próprio — não duplicar nenhum dos dois como P2 aqui.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(web): implementar histórico mensal em memória
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.

## 17. Regra de Não Merge Automático

**Este bloco nunca é mesclado à `main`.** Ao final, apenas `git push origin feat/session-11-bloco-10-historico-memory` — sem `git switch main`, sem `git merge`, sem `git push origin main`. Nenhum bloco novo deve ser criado depois deste nesta rodada.
