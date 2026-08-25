# Bloco 04 — Servicos, API e persistencia atomica de parcelamentos

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-25

## 1. Objetivo

Implementar a persistência atômica de uma compra parcelada (RS-01) — `InstallmentPlan` + N `FinancialEntry` + eventuais `MonthlyPeriod` novas — e expor essa operação via API HTTP (criação e leitura), sem deixar nenhum estado parcial em caso de falha.

## 2. Contexto

Bloco 01 (planejamento) e Bloco 02 (domínio puro: `createInstallmentPlan`, `generateInstallments`) definiram as regras; Bloco 03 preparou schema/migration/repositórios (`InstallmentPlanRepository`, `insertId` nativo) e fechou por completo a dívida técnica de geração de id em `FinancialEntryRepository`/`MonthlyPeriodRepository`/`CategoryBudgetRepository` (DT-15/DT-18) — pré-requisito explícito para este bloco poder criar N parcelas em sequência com segurança. A migration `0004` já está aplicada em `finanhouse_dev`. RS-01 (`Docs/01_product/requisitos_funcionais.md`) permanecia a única lacuna: nenhum caminho de aplicação ainda gravava um `InstallmentPlan` de verdade.

## 3. Problema que Este Bloco Resolve

Uma compra parcelada é uma única operação lógica (o plano e todas as suas parcelas nascem juntos). Sem uma fronteira transacional real, uma falha no meio da criação de 10 parcelas deixaria o banco com um plano "órfão" e um número incorreto de parcelas — dado financeiro incoerente, sem forma de saber quais parcelas realmente existem.

## 4. Escopo

- Extensão do domínio: `FinancialEntry` ganha `installmentPlanId`/`installmentNumber` (`number | null`, nunca opcional); `createFinancialEntry` aceita os dois campos opcionalmente (default `null`).
- Novo erro de domínio `InstallmentPlanNotFoundError`; `InvalidInstallmentPlanError`/`InstallmentPlanNotFoundError` conectados ao `error-handler.ts` (422/404).
- `FinancialEntryRepository.findByInstallmentPlan(householdId, installmentPlanId)` — nas duas implementações.
- `InstallmentTransactionRunner`/`InstallmentTransactionContext` (porta nova) — unidade de trabalho para a operação atômica.
- `DrizzleInstallmentTransactionRunner` (usa `db.transaction()` nativo) e `InMemoryInstallmentTransactionRunner` (snapshot/restore real, sem reverter contadores de id).
- `CreateInstallmentPurchaseService` (orquestra tudo dentro da transação), `ListInstallmentPlansService`, `GetInstallmentPlanDetailService`.
- Rotas HTTP: `POST/GET .../installment-plans`, `GET .../installment-plans/:installmentPlanId`.
- DTOs (`InstallmentPlanDto`, extensão de `FinancialEntryDto`) e schema de validação do corpo do POST.
- Wiring de DI (`DrizzleRepositories`, `HttpAppRepositories`, `server.ts`, `build-test-app.ts`).
- Ajuste estrutural mínimo no frontend (`FinancialEntryDto`/`financialEntryFromDto` do lado do cliente) para acompanhar a extensão do tipo de domínio compartilhado — sem nenhuma tela nova.
- Testes de atomicidade (sucesso e 6 cenários de falha com rollback total), divisão de valores, datas, household scoping, compatibilidade com lançamento avulso, e HTTP.

## 5. Fora de Escopo

- Qualquer interface de usuário para criar/visualizar parcelamentos (Bloco 05).
- Edição estrutural do plano (totalAmount/installmentCount/dueDay/categoryId) e exclusão global — plano permanece imutável (decisão do Bloco 01, reafirmada).
- Aplicação de qualquer migration nova, acesso ao Aiven, seed/bootstrap.
- Correção adicional de DT-15 — já encerrada no Bloco 03.

## 6. Arquivos e Pastas Envolvidos

- `packages/domain/src/financial-entry/financial-entry.ts`, `financial-entry-rules.ts`, `errors/domain-errors.ts`
- `apps/api/src/application/ports/financial-entry-repository.ts`, `installment-transaction-runner.ts` (novo), `index.ts`
- `apps/api/src/application/services/installment-purchase-services.ts` (novo), `index.ts`
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-financial-entry-repository.ts`, `drizzle-installment-transaction-runner.ts` (novo), `create-drizzle-repositories.ts`, `mappers/financial-entry-mapper.ts`
- `apps/api/src/infrastructure/repositories/memory/in-memory-financial-entry-repository.ts`, `in-memory-monthly-period-repository.ts`, `in-memory-installment-plan-repository.ts`, `in-memory-installment-transaction-runner.ts` (novo), `index.ts`
- `apps/api/src/http/app.ts`, `server.ts`, `routes/installment-plans.ts` (novo), `mappers/financial-entry-dto.ts`, `mappers/installment-plan-dto.ts` (novo), `schemas/installment-plan-schemas.ts` (novo), `schemas/common.ts`, `errors/error-handler.ts`, `test-support/build-test-app.ts`
- `apps/api/scripts/db-smoke-*.ts` (ajuste estrutural de compilação, não executados)
- `apps/web/src/api/financial-api.types.ts`, `financial-api.mappers.ts` (ajuste estrutural mínimo)
- Testes correspondentes a cada arquivo acima

## 7. Dependências

- Bloco 03 integrado (`main` em `ddd475990688a4226bb30696738926982c5040b3`) — schema/migration/repositórios prontos, DT-15/DT-18 resolvida.
- `db.transaction()` já em uso em scripts (`db-bootstrap-household.ts`, `db-smoke-*.ts`) — precedente de que `DrizzleDb` (tipo usado por todos os repositórios) já suporta transação nativamente.

## 8. Plano de Implementação

1. Inspecionar a arquitetura real (domínio, portas, repositórios Drizzle/memória, DI, rotas/schemas/DTOs/erros existentes) antes de desenhar qualquer abstração nova.
2. Estender `FinancialEntry` (domínio) com `installmentPlanId`/`installmentNumber`; ajustar `createFinancialEntry`; corrigir fixtures quebradas (domain + apps/api + apps/web) via `tsc --noEmit` iterativo.
3. Adicionar `InstallmentPlanNotFoundError`; conectar erros de domínio já existentes (`InvalidInstallmentPlanError`) e o novo ao `error-handler.ts`.
4. Adicionar `findByInstallmentPlan` ao `FinancialEntryRepository` (porta + Drizzle + memória).
5. Criar a porta `InstallmentTransactionRunner`/`InstallmentTransactionContext` e as duas implementações (Drizzle real via `db.transaction()`; memória via snapshot/restore).
6. Implementar `CreateInstallmentPurchaseService` reaproveitando `createInstallmentPlan`/`generateInstallments`/`createFinancialEntry`/`openMonthlyPeriod` já existentes — nenhuma regra de domínio duplicada.
7. Implementar `ListInstallmentPlansService`/`GetInstallmentPlanDetailService`.
8. Adicionar DTOs, schema de validação, rotas HTTP; conectar em `app.ts`/`server.ts`/`build-test-app.ts`.
9. Escrever os testes de atomicidade, valores, datas, household e HTTP.
10. Rodar a suíte completa e corrigir qualquer quebra estrutural remanescente (scripts, frontend).
11. Registrar DT-19 (Unit of Work de parcelamento) e atualizar RS-01 na documentação de requisitos.
12. Preencher bloco/prompt; criar feedback só depois de tudo validado.

## 9. Critérios de Aceite

- [x] `InstallmentPlan` + N `FinancialEntry` criados atomicamente — sucesso persiste tudo, qualquer falha em qualquer ponto (plano, parcela 1, intermediária, última, competência, categoria de outro household) não deixa nenhum dado parcial.
- [x] Nenhuma implementação usa `nextId()`/`information_schema`/`MAX(id)` — `create()`/`insertId` nativo preservados (DT-15/DT-18 intactas).
- [x] `createdByUserId` sempre da sessão autenticada, nunca do corpo.
- [x] Plano pertence ao household, não ao `createdByUserId` — qualquer membro do household lê o mesmo parcelamento.
- [x] Categoria de outro household rejeitada antes de qualquer escrita.
- [x] Divisão de valores exata (`splitMoney`) e datas resolvidas pelo domínio (sem soma de dias) persistidas sem alteração.
- [x] Lançamento avulso continua funcionando sem exigir plano — `installmentPlanId`/`installmentNumber` nulos.
- [x] API: `POST`/`GET` (lista e detalhe) — dinheiro sempre como string decimal, nenhum `bigint` cru no JSON.
- [x] Nenhuma migration nova gerada; nenhum acesso ao Aiven; nenhum `db:migrate`/`db:push`/seed/bootstrap executado.
- [x] Suíte completa sem regressão.

## 10. Validações Obrigatórias

- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test` (todos os workspaces)
- [x] `npx drizzle-kit check` (estático, sem conexão a banco)
- [x] `npx ddae-engine validate`
- [x] `npx ddae-engine audit`

## 11. Segurança

`createdByUserId` sempre extraído de `request.authSession.userId` (nunca do corpo, mesmo padrão do Bloco 19/DT-14) — impossível forjar autoria. Categoria/household validados antes de qualquer escrita (nunca confia só na FK composta para dar um erro de negócio claro). Nenhum dado sensível novo. Sem acesso ao Aiven nesta rodada.

## 12. Performance

Cada parcelamento executa uma única transação real com `installmentCount` operações de escrita (mínimo 2, sem máximo imposto pela API — nenhum requisito formal define um teto, ver seção 15) — sem N conexões, sem N transações. Nenhum novo índice necessário (já criados no Bloco 03: `financial_entries_installment_plan_number_unique`).

## 13. Design System / UX

Não aplicável — nenhuma interface criada neste bloco (reservado ao Bloco 05).

## 14. Riscos

- Transação longa (proporcional a `installmentCount`, sem teto imposto pela API) mantém uma conexão do pool ocupada mais tempo que uma escrita simples — aceitável no volume esperado (uso doméstico, não concorrente); reavaliar apenas se o uso real revelar necessidade de um limite de negócio (que deve nascer de um requisito formal, não de um valor de schema arbitrário — correção registrada na seção 15).
- `resolvePeriod` pode criar uma `MonthlyPeriod` futura sem limite de distância — mesma política já usada pelo `PUT` manual de competência; nenhuma restrição nova precisou ser inventada nem violada.

## 15. Pendências Esperadas

- Nenhuma pendência técnica nova identificada. RS-01 passa a **RESOLVIDA** (persistência atômica comprovada por teste com rollback real via `InMemoryInstallmentTransactionRunner`, mais wiring real via `DrizzleInstallmentTransactionRunner`/`db.transaction()`).
- **Correção de 2026-08-25 (revisão pré-merge):** `installment-plan-schemas.ts` chegou a impor `maximum: 60` em `installmentCount` sem nenhum requisito formal aprovado que sustentasse esse valor. Pesquisa em `Docs/01_product/requisitos_funcionais.md` (RF-10), `02_analysis/*` e `decisoes_tecnicas.md` confirmou que a única invariante formal é `installmentCount >= 2` (domínio, `installment-rules.ts`). O limite máximo arbitrário foi removido — API e domínio permanecem coerentes (só mínimo 2). Teste HTTP adicionado provando que 61 parcelas é aceito.

## 16. Feedback Obrigatório

Feedback gerado via `ddae-engine feedback create --block bloco_04_servicos_api_e_persistencia_atomica_de_parcelamentos --session session_12_parcelamentos_e_compromissos_futuros` após esta validação completa.

## 17. Commit Semântico Sugerido

```
feat(servicos_api_e_persistencia_atomica_de_parcelamentos): implementar criacao atomica de InstallmentPlan + N FinancialEntry (RS-01) e API de parcelamentos
```
