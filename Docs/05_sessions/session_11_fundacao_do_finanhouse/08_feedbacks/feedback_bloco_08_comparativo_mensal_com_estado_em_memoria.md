# Feedback — Bloco 08: Comparativo mensal com estado em memória

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-26

## 1. Resumo Executivo

O Bloco 08 implementou a área funcional `/comparativo` usando a mesma fonte de estado em memória do dashboard e de Movimentações (`FinanceDemoProvider`). A página permite selecionar duas competências diferentes, mostra indicadores comparativos, categorias de despesa, despesas novas/encerradas, previsto versus realizado e uma visualização SVG/CSS leve, sem banco, API HTTP, persistência permanente ou biblioteca de gráficos.

O domínio parcial iniciado antes desta execução foi preservado: `compare-expense-details.ts` continuou exportando funções puras para normalização segura de descrições, comparação de categorias e identificação de despesas novas/descontinuadas. Os 22 testes desse módulo seguem aprovados. A implementação adicionou 32 testes novos no frontend, totalizando 54 testes novos no Bloco 08 e 298 testes aprovados no monorepo.

Status final: bloco concluído conforme escopo funcional, com ressalva P3 de refinamento visual já esperada no backlog de design. Nenhuma P2 nova foi aberta neste bloco; a pendência TLS segue controlada pelos Blocos 03/04.

Encerramento da branch: commit funcional final `0238d50` (`feat(web): implementar comparativo mensal em memória`) publicado em `origin/feat/session-11-bloco-08-comparativo-memory`. Antes da integração, a branch permanecia limpa e sincronizada com o remoto.

## 2. Objetivo do Bloco

Implementar uma área funcional para comparar duas competências financeiras, utilizando a mesma fonte de estado temporário do dashboard e de Movimentações, sem banco de dados ou persistência permanente.

## 3. Escopo Implementado

- Rota `/comparativo` adicionada ao React Router 8.3.0.
- Sidebar habilitada para "Visão geral", "Movimentações" e "Comparativo"; "Planejamento", "Histórico" e "Configurações" permanecem desabilitados.
- `RootLayout` atualiza o título da área para "Comparativo".
- View-model puro (`comparison-view-model.ts`) recebe períodos, movimentações, categorias e IDs selecionados por argumento.
- Seletores base/comparado com ordenação mais recente → mais antiga, rótulos pt-BR, seleção inicial atual/anterior, bloqueio de período igual e revalidação quando o estado muda.
- Indicadores de receitas realizadas, despesas realizadas, saldo realizado, fechamento projetado, receitas previstas e despesas previstas.
- Variação absoluta e percentual com `null`/texto "Sem base comparável" quando a base é zero; ausência de `NaN`/`Infinity`.
- Comparação por categoria apenas para despesas, com direção textual e destaques de maior aumento/redução.
- Despesas novas e encerradas usando chave tipo + categoria + descrição normalizada, preservando a descrição original na UI.
- Previsto versus realizado por período usando as regras de domínio: `cancelled` fora dos totais, `planned`/`pending` na projeção, `realized` com `actualAmount`.
- Gráfico SVG/CSS com título, legenda, resumo textual e descrição acessível.
- Sincronização com Movimentações testada para criar, realizar, cancelar e remontar/resetar o provider.

## 4. Arquivos Criados

- `apps/web/src/view-models/comparison-view-model.ts`
- `apps/web/src/view-models/comparison-view-model.test.ts`
- `apps/web/src/pages/ComparisonPage.tsx`
- `apps/web/src/pages/ComparisonPage.css`
- `apps/web/src/pages/ComparisonPage.test.tsx`
- `apps/web/src/components/comparison/PeriodComparisonSelector.tsx`
- `apps/web/src/components/comparison/ComparisonSummaryCard.tsx`
- `apps/web/src/components/comparison/CategoryComparison.tsx`
- `apps/web/src/components/comparison/NewAndEndedExpenses.tsx`
- `apps/web/src/components/comparison/PlannedVsRealized.tsx`
- `apps/web/src/components/comparison/ComparisonChart.tsx`
- `apps/web/src/components/comparison/ComparisonEmptyState.tsx`
- `apps/web/src/components/comparison/Comparison.css`
- `apps/web/src/state/finance-demo-comparison-sync.test.ts`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_08_comparativo_mensal_com_estado_em_memoria.md`

## 5. Arquivos Alterados

- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/Sidebar.test.tsx`
- `apps/web/src/components/layout/RootLayout.tsx`
- `packages/domain/src/summaries/compare-periods.ts`
- `packages/domain/src/summaries/compare-expense-details.ts`
- `packages/domain/src/summaries/compare-expense-details.test.ts`
- `packages/domain/src/index.ts`
- `Docs/01_product/requisitos_funcionais.md`
- `Docs/02_architecture/estado_temporario_frontend.md`
- `Docs/02_architecture/decisoes_tecnicas.md`
- `Docs/07_design_system/componentes_ui.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_08_comparativo_mensal_com_estado_em_memoria.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`
- `apps/web/README.md`

## 6. Arquivos Removidos

- Nenhum.

## 7. Comandos Executados

```
git status
git branch --show-current
git log -3 --oneline
git diff --stat
git diff --name-only
git check-ignore -v apps/api/.env.local
npm run test --workspace=@finanhouse/domain -- compare-expense-details
npm run typecheck --workspace=web
npm run test --workspace=web
npm run lint --workspace=web
npm run typecheck --workspace=@finanhouse/domain
npx ddae-engine feedback create --block bloco_08_comparativo_mensal_com_estado_em_memoria --session session_11_fundacao_do_finanhouse
npm ci
npm run clean
npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run test
npx ddae-engine validate
npx ddae-engine audit
npm audit --omit=dev
npm audit
npm ls react-router react-router-dom
```

## 8. Testes Realizados

- Domínio: `compare-expense-details.test.ts` preservado com 22 testes aprovados.
- View-model do Comparativo: 18 testes novos cobrindo ordenação, estado vazio, indicadores, base zero, saldo/projeção, categorias, maiores aumentos/reduções, despesas novas/encerradas, normalização, canceladas, previsto vs realizado, gráfico e resumo acessível.
- Página/rota/sidebar/sincronização: 14 testes novos cobrindo `/comparativo`, `aria-current`, seleção padrão, bloqueio de períodos iguais, troca de períodos, renderização, teclado, estado vazio, ausência de `NaN`/`Infinity`, atualização após criar/realizar/cancelar e reset do provider.
- Suíte completa: 298 testes aprovados.

## 9. Validações Executadas

- `npm ci` — OK; 4 moderadas dev conhecidas no resumo do npm.
- `npm run clean` — OK; removeu `packages/domain/dist`, `apps/api/dist`, `apps/web/dist`.
- `npm run build` — OK.
- `npm run verify:runtime` — OK; nenhum servidor iniciado, nenhuma conexão de banco, nenhuma leitura de `.env.local`.
- `npm run lint` — OK, sem erros ou avisos reportados pelo oxlint.
- `npm run typecheck` — OK.
- `npm run test` — OK, 298 testes aprovados.
- `npx ddae-engine validate` — OK, 0 warnings, 0 errors.
- `npx ddae-engine audit` — OK, 9 warnings conhecidos: 7 quality gates pendentes + P2 dos Blocos 03/04; 0 errors.
- `npm audit --omit=dev` — OK, 0 vulnerabilidades de produção.
- `npm audit` — 4 vulnerabilidades moderadas conhecidas na cadeia dev `drizzle-kit`/`@esbuild-kit`/`esbuild`; 0 altas; sem `audit fix`.
- `npm ls react-router react-router-dom` — `react-router@8.3.0` presente; `react-router-dom` ausente.

## 10. Decisões Técnicas

- DT-04 registrada em `Docs/02_architecture/decisoes_tecnicas.md`: Comparativo mensal derivado em view-model puro sobre estado em memória.
- Sem dependência nova e sem biblioteca de gráficos.
- React Router 8.3.0 mantido; `react-router-dom` não foi reinstalado.

## 11. Problemas Encontrados

- Ajustes de teste foram necessários para lidar com texto repetido em cards, gráfico SVG e listas, e para alinhar valores esperados às fixtures reais.
- `npm audit` completo retorna exit code 1 por vulnerabilidades moderadas de desenvolvimento já conhecidas; `npm audit --omit=dev` permanece zerado.

## 12. Correções Aplicadas Durante o Bloco

- Removida uma função auxiliar não usada no view-model após typecheck focado.
- Corrigidas expectativas dos testes de sincronização para os valores reais das fixtures.
- Ajustadas consultas Testing Library para textos repetidos intencionalmente.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._ TLS/persistência real continuam controladas pelos Blocos 03/04 e não foram duplicadas aqui.

### P3 — Melhoria Recomendada

- Refinamento visual do Comparativo permanece no backlog de design, junto dos refinamentos visuais já registrados para Dashboard/Movimentações.
- Vulnerabilidades moderadas de desenvolvimento na cadeia `drizzle-kit`/`esbuild` seguem conhecidas; produção continua com 0 vulnerabilidades.

### P4 — Opcional

- Quando a API real existir, substituir o provider demonstrativo mantendo a interface consumida pelos view-models.
- Planejamento, Histórico e Configurações continuam como navegação futura desabilitada.

## 14. Riscos Restantes

- A página ainda opera somente sobre fixtures sintéticas em memória; não há persistência entre recarregamentos.
- A experiência visual cumpre o uso funcional, mas ainda não representa aceite visual final.
- A futura troca para API deve preservar a interface de dados ou adaptar os view-models sem duplicar fórmulas.

## 15. Evidências

- `npm run build` aprovado.
- `npm run verify:runtime` aprovado e declarou explicitamente: "Nenhum servidor iniciado, nenhuma conexão de banco, nenhuma leitura de .env.local."
- `npm run test` aprovado com 298 testes.
- `npx ddae-engine validate` aprovado com 0 warnings/0 errors.
- `npx ddae-engine audit` aprovado com 0 errors; warnings apenas conhecidos.
- `npm audit --omit=dev` encontrou 0 vulnerabilidades.
- `npm ls react-router react-router-dom` mostrou somente `react-router@8.3.0`.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Bloco 09 — Planejamento ou refinamento visual dedicado, mantendo persistência real bloqueada até resolução da pendência TLS.

## 18. Commit Semântico Sugerido

```
feat(web): implementar comparativo mensal em memória
```

Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário.
