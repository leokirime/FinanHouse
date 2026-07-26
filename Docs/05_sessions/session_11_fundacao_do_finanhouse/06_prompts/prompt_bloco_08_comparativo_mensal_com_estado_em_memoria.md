# Prompt — Bloco 08: Comparativo mensal com estado em memória

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_08_comparativo_mensal_com_estado_em_memoria.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Implementar uma área funcional para comparar duas competências financeiras, utilizando a mesma fonte de estado temporário do dashboard e de Movimentações, sem banco de dados ou persistência permanente.

## 3. Escopo

Rota `/comparativo`; navegação real na `Sidebar` ("Comparativo" habilitado); seleção de duas competências (base + comparada); indicadores comparativos (receita/despesa/saldo realizados, fechamento projetado, receita/despesa esperadas) com variação absoluta e percentual; comparação por categoria de despesa; detecção de despesas novas/descontinuadas; planejado vs. realizado por período; visualização leve SVG/CSS; testes; documentação.

## 4. Fora de Escopo

MySQL; API HTTP real; Drizzle em runtime; migrations; seeds; `localStorage`; `IndexedDB`; autenticação; recorrências; parcelamentos; Planejamento completo; Histórico completo; redesign geral; biblioteca de gráficos pesada.

## 5. Arquivos Permitidos

- `apps/web/src/components/comparison/**`
- `apps/web/src/pages/ComparisonPage.tsx`
- `apps/web/src/view-models/comparison-view-model.ts`
- `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/App.tsx`
- `packages/domain/src/**` (apenas regra pura nova, com testes, se estritamente necessária)
- `Docs/01_product/requisitos_funcionais.md`, `Docs/02_architecture/estado_temporario_frontend.md`, `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/07_design_system/componentes_ui.md`, `apps/web/README.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/{05_blocks,06_prompts,08_feedbacks}/*bloco_08*`
- Não tocar em `apps/api/src/db/**`, `database/migrations/**`, `apps/api/.env.local`

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Consumir exclusivamente o `FinanceDemoProvider` já existente — nenhuma leitura direta de fixtures, nenhum segundo provider financeiro, nenhum total duplicado.
- Reaproveitar exclusivamente funções de `@finanhouse/domain` para qualquer cálculo financeiro — nenhuma fórmula reimplementada em JSX.

## 7. Restrições de Segurança

Apenas dados fictícios (mesmo estado em memória do Bloco 07). Nenhuma autenticação implementada (fora de escopo). Nenhum acesso a `.env.local` ou credenciais. Nenhuma conexão com o banco.

## 8. Restrições de Performance

Cálculos comparativos derivados em memória a partir do estado já existente — sem I/O novo, sem biblioteca de gráficos adicional.

## 9. Restrições de Design System

Reaproveitar tokens/componentes já existentes — nenhum novo token de cor. Aumento de despesa nunca comunicado só por cor. Novos componentes registrados em `Docs/07_design_system/componentes_ui.md`.

## 10. Tarefas

1. Criar `view-models/comparison-view-model.ts` (funções puras, dados por argumento).
2. Adicionar ao `packages/domain` qualquer regra pura ainda inexistente, com testes próprios.
3. Criar `pages/ComparisonPage.tsx` consumindo `useFinanceDemo()`.
4. Criar os componentes de `components/comparison/` (seletor de período, indicadores, categorias, novas/descontinuadas, planejado vs. realizado, gráfico leve, estado vazio).
5. Adicionar rota `/comparativo` e habilitar "Comparativo" na `Sidebar`.
6. Escrever os 40 testes obrigatórios.
7. Documentação e feedback oficial.

## 11. Critérios de Aceite

- [ ] Rota `/comparativo` navegável com `aria-current="page"` na rota ativa
- [ ] Mesma fonte de estado do dashboard/Movimentações — nenhum dado paralelo
- [ ] Seleção de período nunca repete o mesmo período; ordenação mais recente → mais antiga; estado vazio com menos de duas competências
- [ ] Indicadores/comparações usam funções de `@finanhouse/domain`, sem regra duplicada no frontend
- [ ] Nenhum `NaN`/`Infinity`/percentual inventado, incluindo período anterior zerado
- [ ] `cancelled` fora dos totais; `planned`/`pending` na projeção; `realized` usa `actualAmount`
- [ ] Chave de comparação de despesas novas/descontinuadas documentada (categoria + descrição normalizada + tipo)
- [ ] Gráfico leve com resumo textual, alternativa acessível, responsivo, `prefers-reduced-motion`
- [ ] Nenhum uso de `localStorage`/`IndexedDB`/`mysql2`/`drizzle-orm`/`.env*`
- [ ] Pelo menos 40 testes novos, todos passando

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
ddae-engine feedback create --block bloco_08_comparativo_mensal_com_estado_em_memoria --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4. A pendência TLS continua controlada pelo Bloco 04; o refinamento visual continua no backlog próprio — não duplicar nenhum dos dois como P2 aqui.

## 14. Validação Final

Preencha `Docs/05_sessions/session_11_fundacao_do_finanhouse/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(web): implementar comparativo mensal em memória
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.

## 17. Regra de Não Merge Automático

**Este bloco nunca é mesclado à `main`.** Ao final, apenas `git push origin feat/session-11-bloco-08-comparativo-memory` — sem `git switch main`, sem `git merge`, sem `git push origin main`.
