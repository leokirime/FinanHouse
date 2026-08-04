# Bloco 18 — Persistência real de limites mensais por categoria

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-08-04

## 1. Objetivo

Persistir de verdade (Aiven MySQL, `finanhouse_dev`) os limites mensais por categoria (`CategoryBudget`), completando o Planejamento que o Bloco 17 deixou funcional apenas para contas previstas (`financial_entries`), sem limites configuráveis.

## 2. Contexto

DT-12 (Bloco 17) documentou explicitamente que "limite por categoria (orçamento) segue sem persistência" como risco aceito daquele bloco, e RF-07 (`Docs/01_product/requisitos_funcionais.md`) regrediu de "implementado em memória" (Bloco 09) para "pendente" quando o corte para a API real removeu o estado em memória sem repor tabela/endpoint. O domínio (`CategoryBudget`, regras de negócio, cálculos de consumo) já existe desde o Bloco 09 e não precisa ser recriado — só precisa de uma camada de persistência real.

## 3. Problema que Este Bloco Resolve

A Planejamento mostra contas previstas reais, mas não permite definir um teto mensal por categoria nem visualizar consumo contra um limite real — a única fonte é a soma de movimentações, sem nenhum controle orçamentário configurável pelo usuário.

## 4. Escopo

- Tabela `category_budgets` (migration `0002_category_budgets.sql`, gerada via `drizzle-kit generate`, revisada e **aplicada a `finanhouse_dev` em 2026-08-04**, com autorização explícita do proprietário).
- Porta `CategoryBudgetRepository` + `DrizzleCategoryBudgetRepository` (mesmo padrão de `MonthlyPeriodRepository`: "nunca upsert", `nextId` via `information_schema`) + `InMemoryCategoryBudgetRepository` (testes).
- Serviços de aplicação (`ListCategoryBudgetsService`, `PutCategoryBudgetService` idempotente, `DeleteCategoryBudgetService`), reaproveitando as regras de domínio já existentes (`createCategoryBudget`/`updateCategoryBudget`/`assertBudgetCategoryUsable`/`assertPeriodAllowsBudgetChanges`) sem duplicá-las.
- Endpoints HTTP `GET`/`PUT`/`DELETE .../periods/:referenceMonth/budgets(/:categoryId)?`, seguindo as convenções já estabelecidas (DTO com dinheiro como string, `additionalProperties: false`, isolamento por household, 409 `DOMAIN_CONFLICT` para categoria/período de outro household — nunca 404).
- Script de auditoria dedicado (`db-audit-category-budgets.ts`) — diferente de `db-audit-schema.ts`/`db-audit-responsible-member-integrity.ts`, que assumem banco vazio pós-migration; aqui o banco já tem os dados do bootstrap do Bloco 17.
- Integração no frontend: hook dedicado `usePeriodBudgets` (fora de `FinanceProvider` — só a Planejamento usa limites), `BudgetFormDialog`/`CategoryBudgetList`/`BudgetSummaryCards` reais, sem nenhum fallback em memória.
- Documentação: DT-13, `contrato_api_http.md`, `contrato_frontend_backend.md`, `contrato_banco_dados.md`, RF-06/RF-07, READMEs.

## 5. Fora de Escopo

- Autenticação real — permanece pendente (RF-05).
- Aplicação da migration sem autorização explícita — este bloco entrega a migration gerada/revisada/testada, mas a aplicação real fica condicionada ao checkpoint.
- Qualquer alteração em `financial_entries`/movimentações — limite e movimentação continuam conceitos independentes.
- Recorrência de limites entre competências (copiar limite do mês anterior) — não pedido, fora de escopo.

## 6. Arquivos e Pastas Envolvidos

- `apps/api/src/db/schema/category-budgets.ts`, `schema/index.ts`, `db/types.ts` (novo/alterado)
- `database/migrations/0002_category_budgets.sql`, `meta/_journal.json`, `meta/0002_snapshot.json` (novo)
- `apps/api/src/application/ports/category-budget-repository.ts`, `ports/index.ts` (novo/alterado)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-category-budget-repository.ts`, `mappers/category-budget-mapper.ts`, `create-drizzle-repositories.ts`, `index.ts`, `test-support/fake-drizzle-db.ts` (novo/alterado)
- `apps/api/src/infrastructure/repositories/memory/in-memory-category-budget-repository.ts`, `index.ts` (novo/alterado)
- `apps/api/src/application/services/category-budget-services.ts`, `services/index.ts` (novo/alterado)
- `apps/api/src/http/routes/category-budgets.ts`, `schemas/category-budget-schemas.ts`, `schemas/common.ts`, `mappers/category-budget-dto.ts`, `app.ts`, `test-support/build-test-app.ts` (novo/alterado)
- `apps/api/src/db/category-budgets-audit.ts`, `apps/api/scripts/db-audit-category-budgets.ts`, `apps/api/scripts/db-smoke-category-budgets.ts`, `apps/api/package.json`, `package.json` (raiz), `scripts/connection-safety.test.ts` (novo/alterado)
- `apps/web/src/api/financial-api.types.ts`, `financial-api.mappers.ts`, `financial-api.ts`, `api-client.ts` (alterado)
- `apps/web/src/hooks/use-period-budgets.ts` (novo)
- `apps/web/src/components/planning/BudgetFormDialog.tsx`, `BudgetProgress.tsx`, `BudgetSummaryCards.tsx`, `CategoryBudgetList.tsx` (novo); `CategoryDistributionList.tsx` (removido)
- `apps/web/src/pages/PlanningPage.tsx` (reescrito)
- Testes correspondentes em cada camada (ver seção 10)
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-13), `Docs/03_contracts/contrato_api_http.md`, `contrato_frontend_backend.md`, `contrato_banco_dados.md`, `Docs/01_product/requisitos_funcionais.md`
- `README.md`, `apps/web/README.md`, `apps/api/README.md`, README/bloco/prompt/feedback da sessão

## 7. Dependências

DT-12 (Bloco 17) — frontend já integrado à API real, sem modo demonstrativo. `CategoryBudget` e suas regras de domínio (Bloco 09) — reaproveitadas sem alteração.

## 8. Plano de Implementação

1. Confirmar estado inicial (git, branch `feat/session-11-bloco-18-category-budgets-real`, bloco/prompt DDAE).
2. Inspecionar domínio `CategoryBudget`, `PlanningPage`, `FinanceProvider`, API/schema/migrations/repositórios existentes (padrões de `financial_entries`/`monthly_periods` a reaproveitar).
3. Modelar `category_budgets` e gerar a migration `0002` (sem aplicar).
4. Registrar DT-13.
5. Implementar porta + repositórios (Drizzle e em memória) de `CategoryBudget`.
6. Implementar serviços de aplicação (`List`/`Put`/`Delete`).
7. Implementar rotas HTTP de budgets, atualizar `contrato_api_http.md`, escrever testes de cada camada.
8. Criar o script de auditoria dedicado (`db-audit-category-budgets.ts`).
9. Integrar o frontend: cliente HTTP, hook `usePeriodBudgets`, componentes reais da Planejamento.
10. Escrever testes de frontend (mapper, hook com StrictMode/cancelamento/mutações, `PlanningPage`, `App.test.tsx`).
11. Rodar validações completas sem aplicar a migration (build, lint, typecheck, testes, `drizzle-kit check`, `ddae-engine validate`/`audit`, `npm audit`, `db:check`/`db:audit:category-budgets -- --phase=before` somente leitura).
12. Atualizar documentação (contratos, READMEs, RF, decisões técnicas).
13. Preencher o conteúdo real deste bloco e do prompt correspondente.
14. Apresentar checkpoint e aguardar a frase de autorização exata para aplicar a migration.

## 9. Critérios de Aceite

- [x] Tabela `category_budgets` modelada com FKs compostas para `monthly_periods`/`categories` (isolamento por household, mesmo padrão de `financial_entries`, DT-09) e índice único `(household_id, period_id, category_id)`.
- [x] Migration `0002_category_budgets.sql` gerada, revisada (`drizzle-kit check`) e **aplicada a `finanhouse_dev` em 2026-08-04** com autorização explícita do proprietário (`AUTORIZO MIGRATION CATEGORY_BUDGETS FINANHOUSE_DEV`).
- [x] Auditoria pós-migration (`db-audit-category-budgets.ts --phase=after`) e smoke-test transacional dedicado (`db-smoke-category-budgets.ts`) aprovados, com rollback intencional e zero dado residual.
- [x] Repositório Drizzle segue o padrão "nunca upsert" (existência + ownership verificados antes de `INSERT`/`UPDATE`).
- [x] Endpoints HTTP idempotentes (`PUT`), isolados por household (409 `DOMAIN_CONFLICT` para categoria/período de outro household, nunca 404), com DTOs consistentes com o restante da API.
- [x] Frontend nunca mantém limite só em memória — toda leitura/escrita passa pela API real via `usePeriodBudgets`.
- [x] `usePeriodBudgets` StrictMode-safe (execução local + `AbortController` por efeito, sem `ref` compartilhado entre execuções) e livre da race de fechamento de diálogo já corrigida no Bloco 17 (`mutationVersion` em vez de dependências primitivas).
- [x] Suíte de testes ampliada sem reduzir a base anterior de 765 testes (chegou a 834: 391 API + 290 web + 153 domínio).
- [x] Documentação (contratos, READMEs, RF-06/RF-07, DT-13) atualizada refletindo com precisão o que está implementado versus o que depende da migration aplicada.

## 10. Validações Obrigatórias

- [x] `npm run build` — corrigido um import relativo com extensão `.ts` incorreta (`category-budgets-audit.test.ts`) que quebrava `tsc -p tsconfig.json` (convenção do projeto exige `.js` em imports relativos, resolução `NodeNext`).
- [x] `npm run verify:runtime`
- [x] `npm run lint` (oxlint, todos os workspaces)
- [x] `npm run typecheck` / `npm run typecheck:api-scripts`
- [x] `npm run test` (monorepo completo) — 834 testes: 391 `apps/api`, 290 `apps/web`, 153 `packages/domain`
- [x] `npx drizzle-kit check` (`apps/api`) — "Everything's fine"
- [x] `npx ddae-engine validate` — OK, 0 erros
- [x] `npx ddae-engine audit` — OK, 0 erros, warnings esperados (quality gates pendentes, bloco sem feedback ainda)
- [x] `npm audit --omit=dev` (0 vulnerabilidades) / `npm audit` (4 moderadas, pré-existentes, dev-only em `drizzle-kit`/`esbuild`, não corrigidas por instrução explícita)
- [x] `npm run db:check` e `npm run db:audit:category-budgets -- --phase=before` (somente leitura, pré-autorização) — confirmaram `finanhouse_dev` com as 6 tabelas estruturais, `category_budgets` ausente, 2 migrations registradas
- [x] Autorização recebida (`AUTORIZO MIGRATION CATEGORY_BUDGETS FINANHOUSE_DEV`); `CONFIRM_DATABASE_MIGRATION=true npm run db:migrate` aplicou `0002_category_budgets.sql` a `finanhouse_dev` em 2026-08-04
- [x] `npm run db:audit:category-budgets -- --phase=after` — sétima tabela criada vazia, três migrations registradas, contagens das seis tabelas estruturais preservadas
- [x] `CONFIRM_CATEGORY_BUDGETS_SMOKE=true npm run db:smoke:category-budgets` (script novo, dedicado — os smoke-tests do Bloco 14/16 exigem tabelas vazias e não se aplicam pós-bootstrap) — repositório e rotas HTTP exercitados dentro de uma transação com `ROLLBACK` intencional, zero dado residual

## 11. Segurança

Nenhuma mudança no modelo de autenticação/autorização (permanece o de DT-11/DT-12). Isolamento por household reforçado no banco via FKs compostas (mesmo padrão de `financial_entries`, DT-09) e na API via verificação de `householdId` em toda rota. Nenhum dado sensível novo — `limitAmount` é um valor monetário do próprio household, sujeito às mesmas regras de sanitização de erro já existentes (`persistence-errors.ts`, DT-10). Script de auditoria nunca imprime dado financeiro/pessoal, apenas nomes de tabela e contagens.

## 12. Performance

Não aplicável — mesmo padrão de carga local, dataset pessoal pequeno, das rotas já existentes. `usePeriodBudgets` é escopado à página (não entra em `FinanceProvider`), evitando uma chamada de rede extra em páginas que não usam limites.

## 13. Design System / UX

Reaproveita integralmente os tokens/componentes existentes (`fh-card`, `fh-badge`, `EntryDialog`). `BudgetProgress` recuperado do histórico do Bloco 09 apenas como referência visual (conteúdo idêntico, sem nenhuma ligação com o antigo estado em memória). Nenhum componente novo de design system introduzido.

## 14. Riscos

- Até a migration ser aplicada, os endpoints de budgets retornam erro de banco (tabela inexistente) se acessados contra `finanhouse_dev` — mitigado por não fazer merge/deploy antes da autorização e aplicação.
- `nextId()` via `information_schema.TABLES` mantém a mesma dívida técnica de concorrência já documentada em DT-10 (não é uma regressão deste bloco).
- Frontend sem autenticação real: qualquer membro do household pode alterar limites de qualquer categoria — mesmo risco aceito já existente para movimentações (DT-12).

## 15. Pendências Esperadas

- P3 — Autenticação real: próximo passo natural do roadmap (RF-05), não pendência deste bloco.
- P4 — Recorrência de limites entre competências (copiar do mês anterior) não implementada — não solicitada.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_18_persistencia_real_de_limites_mensais_por_categoria --session session_11_fundacao_do_finanhouse` — ver `08_feedbacks/feedback_bloco_18_persistencia_real_de_limites_mensais_por_categoria.md`.

## 17. Commit Semântico Sugerido

```
feat(api,web): persistir limites mensais por categoria (category_budgets)
```
