# Bloco 05 — Frontend de criação e visualização de parcelamentos

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-25

## 1. Objetivo

Dar ao usuário uma interface real (criação + listagem + detalhe) para as compras parceladas que o Bloco 04 já persiste atomicamente, sem nenhum dado fictício — tudo consumido da API real.

## 2. Contexto

Bloco 04 (integrado em `main`, `9ad29e5`) implementou `CreateInstallmentPurchaseService`/`POST`/`GET list`/`GET detail` de parcelamentos, mas nenhuma tela consumia esses endpoints — o proprietário do projeto não conseguia testar visualmente a funcionalidade. RS-01 (`Docs/01_product/requisitos_funcionais.md`, RF-10) permanece resolvida no backend; este bloco fecha a lacuna de frontend antes de qualquer commit/push ser autorizado, para permitir teste manual prévio.

## 3. Problema que Este Bloco Resolve

A funcionalidade de parcelamentos existe apenas como API — sem UI, o proprietário do projeto não tem como validar visualmente o comportamento antes de aprovar o versionamento.

## 4. Escopo

- Extensão da camada de API do frontend (`financial-api.ts`/`.types.ts`/`.mappers.ts`) com os 3 endpoints de parcelamentos (`GET list`, `GET detail`, `POST`).
- Dois hooks page-scoped novos (`useInstallmentPlans`, `useInstallmentPlanDetail`), independentes do `FinanceProvider` global.
- View-model puro (`installment-plan-view-model.ts`) — progresso derivado, prévia de divisão, formatação de competência.
- Componentes: lista, detalhe (parcelas), estado vazio, formulário de criação.
- Nova rota `/movimentacoes/parcelamentos`, alcançada por uma sub-navegação em abas dentro da área "Movimentações" (`FinancialAreaTabs`).
- Testes de comportamento (não snapshot) cobrindo estado vazio, formulário, validações, submissão, listagem, detalhe.

## 5. Fora de Escopo

- Editar/excluir/renegociar o plano inteiro — continua estruturalmente imutável (Bloco 01).
- Calendário geral da casa, notificações, dashboard futuro de parcelamentos.
- Qualquer acesso real ao Aiven, migration nova, seed/bootstrap, escrita automatizada.
- Bloco 06.

## 6. Arquivos e Pastas Envolvidos

- `apps/web/src/api/financial-api.types.ts`, `financial-api.mappers.ts`, `financial-api.ts` (extensão — 3 endpoints de parcelamentos).
- `apps/web/src/hooks/use-installment-plans.ts` (novo), `use-installment-plan-detail.ts` (novo).
- `apps/web/src/view-models/installment-plan-view-model.ts` (novo).
- `apps/web/src/components/installments/*` (novo — `InstallmentPlanList`, `InstallmentPlanDetail`, `InstallmentPlanForm`, `InstallmentPlanEmptyState`, CSS).
- `apps/web/src/components/financial-entries/FinancialAreaTabs.tsx` (novo).
- `apps/web/src/pages/InstallmentPlansPage.tsx` (novo), `FinancialEntriesPage.tsx` (integra a sub-navegação).
- `apps/web/src/App.tsx` (rota `movimentacoes/parcelamentos`), `components/layout/RootLayout.tsx` (título de cabeçalho da rota).
- `apps/web/src/utils/format-money-pt-br.ts` (extensão — `parseMoneyPtBr`, correção de entrada monetária).
- `Docs/03_contracts/contrato_api_http.md`, `contrato_frontend_backend.md` (correção — documentação dos 3 endpoints de parcelamentos).
- Testes correspondentes a cada arquivo acima.

## 7. Dependências

- Bloco 04 integrado em `main` (`9ad29e51509bed9065e435c160720b66132d4e1c`) — API de parcelamentos pronta e testada.
- Precedente arquitetural de `usePeriodBudgets` (hook page-scoped, independente do `FinanceProvider`) — reutilizado como modelo, não redesenhado.

## 8. Plano de Implementação

1. Inspecionar a arquitetura real do frontend (roteamento, navegação, formulários, API client, `FinanceProvider`, design system) antes de desenhar qualquer componente novo.
2. Estender `financial-api.types.ts`/`.mappers.ts`/`.ts` com os 3 contratos de parcelamentos.
3. Criar `useInstallmentPlans` (lista + criação) e `useInstallmentPlanDetail` (detalhe por id) — mesmo padrão de `usePeriodBudgets`, sem tocar no `FinanceProvider` global.
4. Criar o view-model puro (progresso, prévia, formatação de competência).
5. Criar os componentes de lista/detalhe/estado vazio/formulário, reaproveitando classes CSS e primitivas já existentes (`fh-card`, `fh-entry-form`, `EntryDialog`, `FinancialEntryStatusBadge`).
6. Criar a página, a sub-navegação em abas e a rota.
7. Escrever os testes de comportamento.
8. Rodar a suíte completa e corrigir qualquer quebra estrutural remanescente.
9. Preencher bloco/prompt; criar feedback só depois de tudo validado.

## 9. Critérios de Aceite

- [x] Nenhum dado fictício em nenhuma tela — estado vazio real quando `GET list` devolve `[]`.
- [x] Categoria vem de um select com as categorias reais de despesa do household — nunca `categoryId` digitado.
- [x] Valor digitado em formato pt-BR, convertido via `parseMoney` — nunca `Number` como fonte de verdade financeira.
- [x] Número de parcelas: mínimo 2, sem máximo arbitrário (coerente com a correção do schema HTTP do Bloco 04).
- [x] Primeira competência via `<input type="month">`, convertida para `YYYY-MM-01` antes do envio.
- [x] Prévia de divisão é só visual (usa `splitMoney` real do domínio, mas nunca é enviada ao backend) — resposta da API é a verdade final.
- [x] Submissão bloqueia duplo envio, mostra loading, trata erro sanitizado, atualiza lista e mostra o parcelamento recém-criado com parcelas reais.
- [x] Detalhe mostra parcelas com número/total, valor, vencimento e status — mesmo badge de status já usado em Movimentações.
- [x] Progresso da lista é derivado de `FinancialEntry` relacionadas — nunca um campo persistido separado.
- [x] Nenhuma tela nova na navegação global — parcelamentos alcançado a partir de "Movimentações".
- [x] Lançamento avulso continua funcionando sem alteração de comportamento.
- [x] Nenhum acesso real ao Aiven, nenhuma migration, nenhuma escrita automatizada.

## 10. Validações Obrigatórias

- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test` (todos os workspaces)
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine validate`
- [x] `npx ddae-engine audit`

## 11. Segurança

Nenhum dado sensível novo. `categoryId` sempre de um select com as categorias reais do household (nunca texto livre); `householdId`/`createdByUserId` nunca fazem parte do corpo enviado pelo frontend (mesmo padrão de `createEntry`, Bloco 19/DT-14) — confirmado por teste (`expect(body).not.toHaveProperty('householdId')`/`'createdByUserId'`). Mensagens de erro sempre a versão sanitizada devolvida pela API — nenhum SQL/stack/host/Aiven/token/cookie exibido (confirmado por teste). Sem acesso ao Aiven nesta rodada.

## 12. Performance

Duas chamadas de rede a mais no carregamento da nova rota (`GET list` da própria página, mais `GET detail` só quando um plano é selecionado) — nenhum impacto nas rotas existentes, já que os hooks são page-scoped e não tocam o carregamento global do `FinanceProvider`. Progresso da lista é derivado de `state.entries` já carregado (zero chamadas extra por linha).

## 13. Design System / UX

Reaproveita integralmente os tokens/classes existentes (`fh-card`, `fh-entry-form__*`, `fh-entry-dialog`, `fh-badge`, `FinancialEntryStatusBadge`) — nenhum componente visual novo além dos necessários para tabela/lista de parcelas. Sub-navegação em abas (`FinancialAreaTabs`) segue o mesmo padrão `[aria-current='page']` já usado pela `Sidebar`.

## 14. Riscos

- Duas fontes de detalhe (resultado do `POST` vs. `GET detail`) poderiam divergir em teoria — mitigado por serem ambas respostas reais da mesma API, nunca dado inventado no cliente; documentado explicitamente no componente da página.
- Progresso da lista depende de `state.entries` do `FinanceProvider` global, que só se atualiza em mutações desse provider — para um plano criado nesta mesma sessão, isso é inofensivo porque o denominador (`installmentCount`) sempre vem do próprio plano, nunca da contagem de entries carregadas (ver `buildInstallmentPlanProgress`).

## 15. Pendências Esperadas

_Nenhuma pendência técnica ativa._ Duas correções foram aplicadas ainda durante este bloco, antes de qualquer commit, a partir da revisão do proprietário: (1) o formulário exigia entrada monetária com ponto — corrigido para aceitar formato pt-BR (`parseMoneyPtBr`); (2) os 3 endpoints de parcelamentos não estavam documentados em `Docs/03_contracts/` — documentados de acordo com a implementação real. Detalhes completos em `08_feedbacks/feedback_bloco_05_...md`, seções 10/12/13.

## 16. Feedback Obrigatório

Feedback gerado via `ddae-engine feedback create --block bloco_05_frontend_de_criacao_e_visualizacao_de_parcelamentos --session session_12_parcelamentos_e_compromissos_futuros` após esta validação completa.

## 17. Commit Semântico Sugerido

```
feat(frontend_de_criacao_e_visualizacao_de_parcelamentos): adicionar interface de criacao e visualizacao de parcelamentos
```
