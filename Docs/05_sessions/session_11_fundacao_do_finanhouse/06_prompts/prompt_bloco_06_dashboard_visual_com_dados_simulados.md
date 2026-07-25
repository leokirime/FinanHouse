# Prompt — Bloco 06: Dashboard visual com dados simulados

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_06_dashboard_visual_com_dados_simulados.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Construir a primeira interface visual navegável do Finanhouse, utilizando dados sintéticos e cálculos derivados do pacote de domínio, sem banco de dados, API real ou persistência.

## 3. Escopo

Design tokens; app shell (sidebar, cabeçalho); dashboard de visão geral (status da competência, indicadores, evolução financeira, distribuição por categoria, movimentações recentes, pendências); fixtures sintéticas centralizadas; view-model usando `@finanhouse/domain`; formatação monetária pt-BR segura para `bigint`; responsividade; acessibilidade básica; testes da camada visual.

## 4. Fora de Escopo

MySQL; API real; endpoints financeiros; autenticação; login; formulários completos; CRUD persistente; migration; dados reais; deploy; bibliotecas de gráficos pesadas; implementação completa das demais áreas de navegação.

## 5. Arquivos Permitidos

- `apps/web/src/{styles,data,view-models,utils,components,pages}/**`
- `apps/web/src/App.tsx`, `apps/web/package.json`
- `package.json` (raiz, apenas scripts `dev:web`/build relacionados)
- `Docs/07_design_system/**`, `Docs/02_architecture/arquitetura_visual_dashboard.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/{05_blocks,06_prompts,08_feedbacks}/*bloco_06*`
- Não tocar em `apps/api/src/db/**`, `database/migrations/**`, `apps/api/.env.local`, ou qualquer arquivo das branches dos Blocos 04/05

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Apenas dados fictícios. Nenhum acesso a `.env.local` ou credenciais. Nenhuma autenticação implementada (fora de escopo).

## 8. Restrições de Performance

Sem bibliotecas de gráficos pesadas — apenas SVG/CSS. Sem novas dependências de runtime além de `@finanhouse/domain`.

## 9. Restrições de Design System

Identidade preta/roxa (ver seção 3 do bloco). Tokens centralizados em `apps/web/src/styles/tokens.css` — não espalhar valores hexadecimais arbitrários pelos componentes.

## 10. Tarefas

1. Adicionar `@finanhouse/domain` como dependência de `apps/web`; ajustar build/dev para compilar o domain antes do Vite.
2. Criar design tokens e estilos globais.
3. Criar `format-money-pt-br.ts` (bigint → pt-BR) com testes.
4. Criar fixtures sintéticas e view-model usando `@finanhouse/domain`.
5. Criar componentes de layout, marca e dashboard.
6. Criar `DashboardPage` e integrar no `App`.
7. Testes da camada visual, responsividade e acessibilidade básica.
8. Documentar e gerar o feedback oficial.

## 11. Critérios de Aceite

- [ ] Todos os valores derivam da mesma fixture via `@finanhouse/domain` (sem duplicar fórmulas)
- [ ] Formatação monetária nunca converte `bigint` para `number` para formatar
- [ ] Apenas "Visão geral" é navegação funcional
- [ ] Nenhum dado real do proprietário usado
- [ ] Sem `NaN`/`Infinity` no gráfico de evolução
- [ ] Acessibilidade básica (landmarks, `aria-current`, foco visível)
- [ ] Responsivo em 1440/1024/768/390px
- [ ] `apps/web` consome `@finanhouse/domain` compilado (`dist/`), não `.ts`

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
ddae-engine feedback create --block bloco_06_dashboard_visual_com_dados_simulados --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4. A pendência TLS continua controlada pelo Bloco 04 — não duplicar como P2 neste bloco.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(web): construir dashboard visual com dados simulados
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
