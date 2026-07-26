# Prompt — Bloco 07: Movimentações funcionais com estado em memória

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_07_movimentacoes_funcionais_com_estado_em_memoria.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Transformar a área de Movimentações em uma funcionalidade navegável e interativa, permitindo criar, editar e alterar estados de receitas e despesas durante a sessão do navegador, sem banco de dados ou persistência permanente.

## 3. Escopo

Rotas reais (`/`, `/movimentacoes`); estado financeiro compartilhado em memória; view-model do dashboard recebendo dados por argumento; página de Movimentações (listagem, filtros, busca); formulário de criação/edição; transições de status via domínio; diálogos de realização/cancelamento; atualização automática do dashboard; testes; documentação.

## 4. Fora de Escopo

MySQL; Drizzle em runtime; migration; seed; API HTTP real; `localStorage`; `IndexedDB`; cookies de persistência; service worker; autenticação; upload de arquivos; recorrências; parcelamentos; orçamento por categoria; redesign do dashboard; deploy.

## 5. Arquivos Permitidos

- `apps/web/src/state/**`, `apps/web/src/hooks/**`
- `apps/web/src/pages/FinancialEntriesPage.tsx`, `apps/web/src/components/financial-entries/**`
- `apps/web/src/components/layout/{AppShell,Sidebar}.tsx`, `apps/web/src/view-models/dashboard-view-model.ts`
- `apps/web/src/App.tsx`, `apps/web/src/main.tsx`, `apps/web/package.json`
- `Docs/02_architecture/estado_temporario_frontend.md`, `Docs/01_product/requisitos_funcionais.md`, `Docs/07_design_system/componentes_ui.md`, `apps/web/README.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/{05_blocks,06_prompts,08_feedbacks}/*bloco_07*`
- Não tocar em `apps/api/src/db/**`, `database/migrations/**`, `apps/api/.env.local`

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Apenas dados fictícios. Nenhuma autenticação implementada (fora de escopo). Nenhum acesso a `.env.local` ou credenciais.

## 8. Restrições de Performance

Estado em memória via `useReducer`/Context — sem I/O. Única dependência nova: `react-router` (migrada de `react-router-dom@7.18.1` para `react-router@8.3.0` antes da integração à `main` — ver DT-03).

## 9. Restrições de Design System

Reaproveitar tokens/componentes do Bloco 06 — nenhum novo token de cor. Novos componentes registrados em `Docs/07_design_system/componentes_ui.md`.

## 10. Tarefas

1. Instalar `react-router@8.3.0` e configurar rotas `/` e `/movimentacoes`.
2. Criar estado compartilhado (`state/`) com reducer para criação, edição e transições.
3. Adaptar `dashboard-view-model.ts` para receber dados por argumento.
4. Atualizar `Sidebar` para navegação real.
5. Criar `FinancialEntriesPage` (listagem, filtros, busca) e componentes de `financial-entries/`.
6. Implementar formulário de criação/edição e diálogos de realização/cancelamento, usando `@finanhouse/domain`.
7. Garantir atualização automática do dashboard após qualquer mudança de estado.
8. Testes, documentação e feedback oficial.

## 11. Critérios de Aceite

- [ ] Navegação real com `aria-current="page"` na rota ativa
- [ ] Dashboard e Movimentações compartilham a mesma fonte de estado
- [ ] Transições de status usam funções nomeadas de `@finanhouse/domain`, sem regra duplicada no frontend
- [ ] Estado reinicia para as fixtures ao recarregar, com aviso visível de "modo demonstrativo"
- [ ] Nenhum uso de `localStorage`/`IndexedDB`/`mysql2`/`drizzle-orm`/`.env*`
- [ ] Pelo menos 38 testes novos, todos passando

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `npm ci`
- [ ] `npm run clean`
- [ ] `npm run build`
- [ ] `npm run verify:runtime`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm audit --omit=dev` / `npm audit`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_07_movimentacoes_funcionais_com_estado_em_memoria --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4. A pendência TLS continua controlada pelo Bloco 04; o refinamento visual continua no backlog do Bloco 06 — não duplicar nenhum dos dois como P2 aqui.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(web): implementar movimentações com estado em memória
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
