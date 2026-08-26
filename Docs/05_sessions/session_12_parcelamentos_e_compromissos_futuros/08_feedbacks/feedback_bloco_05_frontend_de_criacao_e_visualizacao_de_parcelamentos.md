# Feedback — Bloco 05: Frontend de criação e visualização de parcelamentos

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-25

## 1. Resumo Executivo

Implementada a interface real de criação, listagem e detalhe de parcelamentos, consumindo exclusivamente a API do Bloco 04 — nenhum dado fictício em nenhuma tela. Arquitetura: dois hooks page-scoped (`useInstallmentPlans`/`useInstallmentPlanDetail`), seguindo o precedente de `usePeriodBudgets` (carga/mutação própria, independente do `FinanceProvider` global) — zero alteração ao reducer global, zero risco de ripple em Dashboard/Comparativo/Planejamento/Histórico. Nova rota `/movimentacoes/parcelamentos`, alcançada por uma sub-navegação em abas dentro da área "Movimentações" existente.

**Rodada de correção (revisão do proprietário, mesma data):** três pendências identificadas na revisão foram fechadas antes de qualquer autorização de teste visual/versionamento. (1) Inconsistência funcional real: o formulário exigia que o usuário digitasse o valor com ponto ("3000.00"), contrariando o requisito aprovado de entrada em formato pt-BR ("3000,00") — corrigido com um novo helper `parseMoneyPtBr` (`apps/web/src/utils/format-money-pt-br.ts`), testado com vírgula decimal, ponto de milhar, ausência de decimais e rejeição de formatos não pt-BR (incluindo o antigo formato com ponto, agora corretamente rejeitado). (2) A P3 de documentação de contratos foi fechada: os 3 endpoints de parcelamentos (`GET list`/`GET detail`/`POST`) foram documentados em `Docs/03_contracts/contrato_api_http.md` e `contrato_frontend_backend.md`, de acordo com a implementação real. (3) A P4 de ausência de `axe-core` foi revisada e reclassificada como decisão consciente (não pendência ativa) — nenhuma dependência nova foi introduzida; na mesma revisão, uma inconsistência real e menor de acessibilidade foi encontrada (erro geral do formulário sem `aria-describedby` associado ao `<form>`, ao contrário do padrão já usado em `FinancialEntryForm`) e corrigida.

Suíte completa sem regressão: API 667 (inalterado — nenhum arquivo de backend tocado), Domain 214 (inalterado), Web 420 (+54 sobre o baseline pré-Bloco-05) — total 1301. RS-01 permanece resolvida (backend, Bloco 04). Nenhuma migration nova, nenhum acesso ao Aiven, nenhum commit/push/merge nesta rodada — aguardando teste manual e aprovação do proprietário. P1/P2/P3/P4 ativos: todos zero.

## 2. Objetivo do Bloco

Dar ao usuário uma interface real (criação + listagem + detalhe) para as compras parceladas já persistidas atomicamente pelo Bloco 04, sem nenhum dado fictício, para permitir teste visual antes de qualquer autorização de versionamento — com entrada monetária em formato brasileiro, como definido no requisito aprovado.

## 3. Escopo Implementado

Escopo original + a correção solicitada na revisão:

- Extensão da camada de API do frontend com os 3 endpoints de parcelamentos (`GET list`, `GET detail`, `POST`).
- `useInstallmentPlans` (lista + criação) e `useInstallmentPlanDetail` (detalhe por id) — hooks page-scoped, independentes do `FinanceProvider`.
- View-model puro (`installment-plan-view-model.ts`): progresso derivado, prévia de divisão (via `splitMoney` real do domínio), formatação de competência, conversão `<input type="month">` ↔ competência do domínio.
- Componentes: `InstallmentPlanList`, `InstallmentPlanDetail`, `InstallmentPlanEmptyState`, `InstallmentPlanForm`, `FinancialAreaTabs`.
- Nova rota `/movimentacoes/parcelamentos` + página `InstallmentPlansPage`.
- **Correção:** `parseMoneyPtBr` (`apps/web/src/utils/format-money-pt-br.ts`) — entrada monetária pt-BR no formulário de parcelamentos, escopo deliberadamente limitado a este formulário (ver seção 10).
- **Correção:** os 3 endpoints documentados em `Docs/03_contracts/`.
- **Correção:** `aria-describedby` do erro geral do formulário associado ao `<form>`.
- 54 testes de comportamento novos no total (hooks, view-model, helper monetário, integração de página) — nenhum teste de snapshot visual.

## 4. Arquivos Criados

- `apps/web/src/hooks/use-installment-plans.ts`, `use-installment-plans.test.ts`
- `apps/web/src/hooks/use-installment-plan-detail.ts`, `use-installment-plan-detail.test.ts`
- `apps/web/src/view-models/installment-plan-view-model.ts`, `installment-plan-view-model.test.ts`
- `apps/web/src/components/installments/InstallmentPlanList.tsx`, `InstallmentPlanList.css`
- `apps/web/src/components/installments/InstallmentPlanDetail.tsx`, `InstallmentPlanDetail.css`
- `apps/web/src/components/installments/InstallmentPlanForm.tsx`, `InstallmentPlanForm.css`
- `apps/web/src/components/installments/InstallmentPlanEmptyState.tsx`
- `apps/web/src/components/financial-entries/FinancialAreaTabs.tsx`, `FinancialAreaTabs.css`
- `apps/web/src/pages/InstallmentPlansPage.tsx`, `InstallmentPlansPage.test.tsx`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_05_frontend_de_criacao_e_visualizacao_de_parcelamentos.md`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/06_prompts/prompt_bloco_05_frontend_de_criacao_e_visualizacao_de_parcelamentos.md`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/08_feedbacks/feedback_bloco_05_frontend_de_criacao_e_visualizacao_de_parcelamentos.md` (este arquivo)

## 5. Arquivos Alterados

- `apps/web/src/api/financial-api.types.ts` — `InstallmentPlanDto`, `InstallmentPurchaseDto`, `CreateInstallmentPurchaseRequest`.
- `apps/web/src/api/financial-api.mappers.ts` — `installmentPlanFromDto`.
- `apps/web/src/api/financial-api.ts` — `listInstallmentPlans`, `getInstallmentPlanDetail`, `createInstallmentPurchase`.
- `apps/web/src/pages/FinancialEntriesPage.tsx` — integra `FinancialAreaTabs`.
- `apps/web/src/App.tsx` — rota `movimentacoes/parcelamentos`.
- `apps/web/src/components/layout/RootLayout.tsx` — título de cabeçalho da nova rota.
- `apps/web/src/utils/format-money-pt-br.ts`, `format-money-pt-br.test.ts` — **correção:** `parseMoneyPtBr`.
- `apps/web/src/components/installments/InstallmentPlanForm.tsx` — **correção:** usa `parseMoneyPtBr` (não mais `parseMoney` direto), placeholder/mensagem de erro em pt-BR, `aria-describedby` do erro geral associado ao `<form>`.
- `apps/web/src/pages/InstallmentPlansPage.test.tsx` — **correção:** testes de entrada em vírgula, rejeição de formatos não pt-BR, associação de acessibilidade do erro geral.
- `Docs/03_contracts/contrato_api_http.md`, `contrato_frontend_backend.md` — **correção:** os 3 endpoints de parcelamentos documentados.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run typecheck:api-scripts
npm run test   # todos os workspaces
npx drizzle-kit check
npx ddae-engine validate
npx ddae-engine audit
```

## 8. Testes Realizados

- **`format-money-pt-br.test.ts`** (15 testes, 9 novos): `parseMoneyPtBr` — "3000,00"→"3000.00", "1000,50"→"1000.50", "99,90"→"99.90", "3.000,00"→"3000.00", "12.345,67"→"12345.67", sem decimais ("3000")→"3000.00", espaços nas bordas; rejeita "abc", "3000.00" (ponto — não é pt-BR), "3,000.00" (formato americano), "3000,0" (1 casa decimal), "3000,000" (3 casas decimais), string vazia; precisão preservada em valores grandes (nunca `Number`/`parseFloat`).
- **`installment-plan-view-model.test.ts`** (16 testes): `INSTALLMENT_COUNT_MIN === 2`; conversão competência ↔ `<input type="month">`; formatação "Agosto de 2026"; prévia via `splitMoney` real; progresso derivado de `FinancialEntry` relacionadas.
- **`use-installment-plans.test.ts`** (6 testes): carregamento/criação reais via API, bloqueio de duplo envio, falha sanitizada.
- **`use-installment-plan-detail.test.ts`** (4 testes): idle/loading/ready/error, recarga ao trocar de id.
- **`InstallmentPlansPage.test.tsx`** (19 testes, 8 novos nesta rodada): além dos 11 originais — 5 casos de rejeição parametrizados (`abc`, `3000.00`, `3,000.00`, `3000,0`, `3000,000`, todos com a mensagem "Informe um valor válido em reais (ex.: 3000,00)."); conversão parametrizada `"1000,50"→"1000.50"` e `"3.000,00"→"3000.00"` no corpo real do `POST`; prévia funcionando com vírgula digitada; placeholder `"0,00"`; associação `aria-describedby` do erro geral do formulário com o `<form>`.

## 9. Validações Executadas

| Validação | Resultado |
|---|---|
| `npm run build` | OK |
| `npm run verify:runtime` | OK |
| `npm run lint` | OK, 0 avisos |
| `npm run typecheck` | OK, 0 erros |
| `npm run typecheck:api-scripts` | OK, 0 erros |
| `npm run test` | OK — API 667 (inalterado), Web 420 (+54 sobre o baseline pré-Bloco-05), Domain 214 (inalterado) — total 1301 |
| `npx drizzle-kit check` | OK ("Everything's fine") |
| `npx ddae-engine validate` | Status OK, 0 erros, 0 avisos |
| `npx ddae-engine audit` | Status OK, 0 erros, 0 P1/P2 |

## 10. Decisões Técnicas

- **Hooks page-scoped em vez de estender `FinanceProvider`.** Mesmo padrão de `usePeriodBudgets` — zero ripple em `FinanceProvider.test.tsx`/`finance-*-sync.test.ts`.
- **Progresso da lista deriva de `state.entries` (global, já carregado)** — denominador sempre de `plan.installmentCount`, nunca "0 de 0" para plano recém-criado.
- **Detalhe do plano recém-criado usa a resposta real do `POST` diretamente; detalhe de um plano pré-existente usa `GET detail` de verdade.** Ambas as fontes são dados reais da API.
- **Prévia do formulário reaproveita `splitMoney` real do domínio** — nunca enviada ao backend; a resposta real da API continua sendo a única fonte de verdade.
- **`parseMoneyPtBr` foi criado, não reutilizado, porque não existia nenhum helper de PARSING monetário pt-BR em `apps/web`** (só `formatMoneyPtBr`, formatação unidirecional cents→texto). Investigação confirmou que os três formulários monetários pré-existentes (`FinancialEntryForm`, `RealizeEntryDialog`, `BudgetFormDialog`) todos chamam `parseMoney` diretamente sobre o texto digitado — ou seja, **todo o resto do app hoje espera ponto, não vírgula**, um padrão que antecede esta sessão. A correção pedida foi aplicada exatamente no escopo indicado (`InstallmentPlanForm`), sem alterar os outros três formulários — estendê-los é uma melhoria de UX legítima, mas é uma mudança de comportamento em telas já em produção, fora do escopo desta correção pontual; documentado explicitamente em `contrato_frontend_backend.md` (seção 4) para não virar uma inconsistência silenciosa.
- **P4 de acessibilidade reclassificada como decisão consciente, não pendência ativa.** Revisão confirmou: labels associados em todos os campos, `EntryDialog` com `aria-modal`/foco inicial/retorno de foco/Escape, `aria-live="polite"` na prévia, `aria-current="page"` na navegação em abas, navegação por teclado nativa (elementos HTML reais, nenhum `div` clicável), tudo coberto por teste comportamental. Nenhuma dependência nova (`axe-core` ou equivalente) foi introduzida só para eliminar um item documental — decisão de não introduzir dependência sem necessidade funcional comprovada, coerente com o resto do projeto. Durante essa mesma revisão, uma inconsistência real (não hipotética) foi encontrada e corrigida: o erro geral do formulário (`installmentPlans.actionError`) tinha `role="alert"` mas não estava associado ao `<form>` via `aria-describedby`, ao contrário de `FinancialEntryForm` — corrigido e testado.

## 11. Problemas Encontrados

Um problema funcional real, identificado pelo proprietário do projeto na revisão (não pela execução original): o formulário de parcelamentos exigia entrada monetária com ponto ("3000.00"), contrariando o requisito aprovado de entrada em formato pt-BR ("3000,00"). Corrigido nesta rodada (ver seções 3/10). Um problema de acessibilidade real e menor, autodetectado durante a revisão da P4 (ver seção 10), também corrigido.

## 12. Correções Aplicadas Durante o Bloco

- **Formato monetário do formulário de parcelamentos:** `parseMoney(amountText.trim())` direto → `parseMoneyPtBr(amountText.trim())`; placeholder `"0.00"` → `"0,00"`; mensagem de erro "com ponto e duas casas decimais (ex.: 3000.00)" → "em reais (ex.: 3000,00)". Testado com vírgula, ponto de milhar, e rejeição explícita do formato antigo (ponto).
- **Documentação de contratos:** os 3 endpoints de parcelamentos documentados em `Docs/03_contracts/contrato_api_http.md` (seção "Parcelamentos", exemplos de request/response) e `contrato_frontend_backend.md` (tabela de endpoints consumidos + nota sobre a conversão pt-BR).
- **Acessibilidade:** `aria-describedby` do erro geral do formulário associado ao `<form>` (paridade com `FinancialEntryForm`).
- (Da execução original, já corrigidas antes da primeira entrega) Condição de corrida em teste de `use-installment-plans.test.ts`; ambiguidade de `getByRole` com dois botões "Novo parcelamento" no estado vazio.

## 13. Pendências

### P1 — Crítica

_Nenhuma._

### P2 — Importante

_Nenhuma._

### P3 — Melhoria Recomendada

_Nenhuma pendência técnica/documental ativa._ A P3 anterior (contratos de parcelamentos não documentados) foi resolvida nesta rodada — ver seção 12.

_Melhoria futura, não pendência:_ os três formulários monetários pré-existentes (`FinancialEntryForm`, `RealizeEntryDialog`, `BudgetFormDialog`) continuam aceitando entrada com ponto (`parseMoney` direto), não vírgula — uniformizar a entrada pt-BR em todo o app é uma mudança de UX legítima para uma rodada própria, não uma dívida introduzida por este bloco (ver seção 10).

### P4 — Opcional

_Nenhuma pendência técnica ativa._ Ausência de ferramenta automatizada de auditoria de acessibilidade (`axe-core` ou equivalente): revisada e reclassificada como **decisão consciente** — labels, semântica de diálogo, `aria-live`, `aria-current`, foco e navegação por teclado estão implementados e cobertos por teste comportamental; nenhuma dependência nova foi introduzida sem necessidade funcional comprovada. Pode ser avaliada futuramente numa rodada dedicada de acessibilidade, caso o projeto decida adotar auditoria automatizada em toda a base — não é um defeito conhecido deste bloco.

## 14. Riscos Restantes

Nenhum risco ativo novo identificado.

## 15. Evidências

- `npm run test` (raiz): **API 667 passed (667), Web 420 passed (420), Domain 214 passed (214)** — 0 falhas em qualquer workspace.
- `npx ddae-engine audit`: Status OK, 0 erros, 0 P1/P2, "Nenhuma pendência P1/P2 encontrada."
- `git diff --check`: limpo.
- **Aprovação visual do proprietário do projeto (2026-08-25):** fluxo testado manualmente em Movimentações → Parcelamentos — criação, listagem e detalhe aprovados. Um parcelamento pode ter sido criado manualmente pelo proprietário durante esse teste, via a interface, contra a API real (Aiven DEV) — essa eventual escrita não foi feita nem revertida pelo Claude, e não faz parte do escopo de código deste bloco.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

**Aprovado visualmente pelo proprietário do projeto em 2026-08-25.**

## 17. Próximo Bloco Recomendado

Bloco 06 — a definir pelo proprietário do projeto (integração das telas derivadas), após a integração deste bloco em `main`.

## 18. Commit Semântico Sugerido

```
feat(installments): adicionar interface de criacao e visualizacao de parcelamentos
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
