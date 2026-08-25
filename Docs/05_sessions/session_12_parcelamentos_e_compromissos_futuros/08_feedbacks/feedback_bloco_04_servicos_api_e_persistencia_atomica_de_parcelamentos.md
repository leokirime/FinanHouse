# Feedback — Bloco 04: Servicos, API e persistencia atomica de parcelamentos

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-25

## 1. Resumo Executivo

O Bloco 04 implementou a persistência atômica de uma compra parcelada (RS-01): `InstallmentPlan` + N `FinancialEntry` + eventuais `MonthlyPeriod` novas são criados dentro de uma única transação real (`db.transaction()` nativo do MySQL, via Drizzle), com uma abstração de unidade de trabalho (`InstallmentTransactionRunner`) que mantém a camada de aplicação livre de qualquer dependência direta de `mysql2`/`drizzle-orm`. A arquitetura existente já suportava transação nativa sem nenhuma mudança estrutural — confirmado por inspeção antes de implementar, não presumido.

`FinancialEntry` (domínio) foi estendida com `installmentPlanId`/`installmentNumber` (sempre `number | null`, nunca opcional), permitindo distinguir lançamento avulso de parcela sem ambiguidade. `CreateInstallmentPurchaseService` reaproveita integralmente as funções de domínio já existentes (`createInstallmentPlan`, `generateInstallments`, `createFinancialEntry`, `openMonthlyPeriod`) — nenhuma regra de negócio foi duplicada. A API ganhou `POST`/`GET` (lista e detalhe) para parcelamentos, seguindo exatamente os padrões já estabelecidos (autenticação real, household scoping, dinheiro como string decimal, DTOs sem campos internos).

Atomicidade foi provada por teste real: `InMemoryInstallmentTransactionRunner` reproduz rollback de verdade (snapshot/restore, sem reverter contadores de id — mesma semântica do `AUTO_INCREMENT` real) e os 6 cenários de falha exigidos (plano, parcela 1, parcela intermediária, última parcela, competência nova, categoria de outro household) foram testados ponta a ponta, confirmando zero dado parcial em cada caso. Suíte completa sem regressão: API 667 (+43, incluindo os 3 testes da correção do limite arbitrário de `installmentCount`), Web 366 (inalterado, só ajuste estrutural de fixture pré-existente), Domain 214 (+2) — total 1247. RS-01 passa a **RESOLVIDA** (DT-19). Nenhuma migration nova, nenhum acesso ao Aiven, nenhum commit/push/merge nesta rodada — aguardando revisão do proprietário.

## 2. Objetivo do Bloco

Implementar a persistência atômica de uma compra parcelada (RS-01) — `InstallmentPlan` + N `FinancialEntry` + eventuais `MonthlyPeriod` novas — e expor essa operação via API HTTP (criação e leitura), sem deixar nenhum estado parcial em caso de falha.

## 3. Escopo Implementado

Implementado exatamente conforme planejado em `05_blocks/bloco_04_servicos_api_e_persistencia_atomica_de_parcelamentos.md`, sem divergência de escopo:

- Extensão de `FinancialEntry` (domínio) e `createFinancialEntry`.
- `InstallmentPlanNotFoundError` (novo) conectado ao `error-handler.ts`; `InvalidInstallmentPlanError` (já existente desde o Bloco 02) conectado pela primeira vez.
- `FinancialEntryRepository.findByInstallmentPlan` (porta + Drizzle + memória).
- `InstallmentTransactionRunner`/`InstallmentTransactionContext` (porta) + `DrizzleInstallmentTransactionRunner` + `InMemoryInstallmentTransactionRunner`.
- `CreateInstallmentPurchaseService`, `ListInstallmentPlansService`, `GetInstallmentPlanDetailService`.
- Rotas `POST/GET .../installment-plans`, `GET .../installment-plans/:installmentPlanId`; DTOs; schema de validação.
- Wiring de DI (`DrizzleRepositories`, `HttpAppRepositories`, `server.ts`, `build-test-app.ts`).
- Ajuste estrutural mínimo no frontend (`FinancialEntryDto`/`financialEntryFromDto`) e nos 4 scripts `db-smoke-*.ts` para acompanhar a extensão do domínio — nenhuma tela nova, nenhuma execução real desses scripts.
- Testes de atomicidade, valores, datas, household, avulso, HTTP.
- DT-19 registrada; RS-01 marcada como resolvida na análise de risco original.

## 4. Arquivos Criados

- `apps/api/src/application/ports/installment-transaction-runner.ts`
- `apps/api/src/application/services/installment-purchase-services.ts` + `.test.ts`
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-installment-transaction-runner.ts` + `.test.ts`
- `apps/api/src/infrastructure/repositories/memory/in-memory-installment-transaction-runner.ts` + `.test.ts`
- `apps/api/src/http/routes/installment-plans.ts` + `.test.ts`
- `apps/api/src/http/mappers/installment-plan-dto.ts`
- `apps/api/src/http/schemas/installment-plan-schemas.ts`

## 5. Arquivos Alterados

- `packages/domain/src/financial-entry/financial-entry.ts` — `installmentPlanId`/`installmentNumber` adicionados.
- `packages/domain/src/financial-entry/financial-entry-rules.ts` — `createFinancialEntry`/`CreateFinancialEntryInput` aceitam os dois campos opcionalmente (default `null`); `financial-entry-rules.test.ts` ganhou 2 casos novos.
- `packages/domain/src/errors/domain-errors.ts` — `InstallmentPlanNotFoundError` adicionada.
- `packages/domain/src/summaries/*.test.ts`, `planning/category-budget-calculations.test.ts` (3 arquivos) — fixtures locais de `FinancialEntry` ajustadas (mecânico, mesmo padrão do Bloco 03).
- `apps/api/src/application/ports/financial-entry-repository.ts` — `findByInstallmentPlan`.
- `apps/api/src/application/ports/index.ts`, `application/services/index.ts` — barrels.
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-financial-entry-repository.ts` — `findByInstallmentPlan`.
- `apps/api/src/infrastructure/repositories/drizzle/mappers/financial-entry-mapper.ts` — mapeamento dos 2 campos novos nos dois sentidos.
- `apps/api/src/infrastructure/repositories/drizzle/create-drizzle-repositories.ts` — `installmentPlans` adicionado a `DrizzleRepositories`.
- `apps/api/src/infrastructure/repositories/drizzle/test-support/fake-drizzle-db.ts` — método `.transaction()` adicionado (chama o callback com a própria instância; não simula rollback — a prova de rollback é feita pela implementação em memória).
- `apps/api/src/infrastructure/repositories/memory/in-memory-financial-entry-repository.ts` — `findByInstallmentPlan` + `snapshot()`/`restore()`.
- `apps/api/src/infrastructure/repositories/memory/in-memory-monthly-period-repository.ts`, `in-memory-installment-plan-repository.ts` — `snapshot()`/`restore()`.
- `apps/api/src/infrastructure/repositories/memory/index.ts` — barrel.
- `apps/api/src/http/app.ts` — `HttpAppRepositories.installmentPlans`; `CreateHttpAppOptions.installmentTransactionRunner` (nova dependência, fora de `repositories`); rota registrada.
- `apps/api/src/http/server.ts` — `DrizzleInstallmentTransactionRunner` real, construído a partir do mesmo `db` já usado por `createDrizzleRepositories`.
- `apps/api/src/http/test-support/build-test-app.ts` — `TestRepositories.installmentPlans`; `InMemoryInstallmentTransactionRunner` wired.
- `apps/api/src/http/mappers/financial-entry-dto.ts` — DTO ganha os 2 campos novos.
- `apps/api/src/http/schemas/common.ts` — `householdAndInstallmentPlanIdParamSchema`.
- `apps/api/src/http/errors/error-handler.ts` — `InvalidInstallmentPlanError`/`InstallmentPlanNotFoundError` classificados.
- `apps/api/src/http/app.test.ts` — 2 chamadas diretas de `createHttpApp` ajustadas.
- `apps/api/src/http/routes/entries.test.ts`, `infrastructure/repositories/drizzle/drizzle-financial-entry-repository.test.ts`, `infrastructure/repositories/drizzle/mappers/financial-entry-mapper.test.ts`, `infrastructure/repositories/drizzle/create-drizzle-repositories.test.ts` — fixtures/asserções ajustadas mecanicamente (novos campos do domínio; contagem de portas 7→8; uma asserção do Bloco 03 que checava ausência de `installmentPlanId` corrigida para checar valor `null`, já que o campo agora sempre existe).
- `apps/api/scripts/db-smoke-auth-sessions.ts`, `db-smoke-category-budgets.ts`, `db-smoke-http.ts` — `installmentTransactionRunner` adicionado às chamadas de `createHttpApp` (nunca usado por esses smokes — só satisfaz o contrato de tipo); nenhum executado.
- `apps/api/scripts/db-smoke-repositories.ts` — 3 fixtures `FinancialEntry` ajustadas.
- `apps/web/src/api/financial-api.types.ts`, `financial-api.mappers.ts`, `financial-api.mappers.test.ts` — `FinancialEntryDto` acompanha a extensão do domínio (ajuste estrutural mínimo, nenhuma tela nova).
- `apps/web/src/pages/FinancialEntriesPage.test.tsx`, `view-models/comparison-view-model.test.ts`, `view-models/history-view-model.test.ts`, `state/test-support/finance-test-fixtures.ts` — fixtures ajustadas mecanicamente.
- `Docs/02_architecture/decisoes_tecnicas.md` — DT-19.
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/02_analysis/analise_riscos.md` — RS-01 marcada como resolvida (histórico preservado, nota de status adicionada).

## 6. Arquivos Removidos

- Nenhum.

## 7. Comandos Executados

```
npx tsc --noEmit   # packages/domain, apps/api (iterativo, a cada mudança estrutural)
npm run build:domain
npx vitest run   # packages/domain, apps/api (arquivos isolados e suíte completa)
npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run typecheck:api-scripts
npm run test   # todos os workspaces
cd apps/api && npx drizzle-kit check
npx ddae-engine validate
npx ddae-engine audit
```

## 8. Testes Realizados

- **`DrizzleInstallmentTransactionRunner`** (4 casos): uma transação por chamada; contexto com instâncias reais dos 4 repositórios esperados, construídas com o `tx`; devolve o valor produzido por `work()`; erro de domínio propagado sem reembrulho (nunca mascarado como erro de persistência).
- **`InMemoryInstallmentTransactionRunner`** (6 casos): sucesso persiste tudo; falha após criar plano + 5 parcelas → rollback total (0 plano, 0 parcelas); falha após criar uma `MonthlyPeriod` nova → rollback também desfaz a competência criada pela própria operação; rollback nunca afeta dados que já existiam antes da transação; ids gerados antes da falha nunca são reaproveitados (contador nunca revertido); devolve o valor de `work()` quando não há erro.
- **`CreateInstallmentPurchaseService`** (16 casos): Caso A (sucesso — 1 plano + 10 parcelas, soma exata, competências corretas, cada parcela com status/entryType/campos nulos corretos, numeração 1..10 sem lacuna); Caso B (falha ao criar o plano); Caso C (falha na parcela 1); Caso D (falha na parcela 6/10 — nem as 5 já criadas sobrevivem); Caso E (falha na parcela 10/10); Caso F (falha ao criar competência — inclusive a competência pré-existente é preservada); Caso G (categoria de outro household e categoria inexistente — nenhuma escrita); divisão de valores (R$ 1000,00/3 = 333.33+333.33+333.34, soma exata); datas (dezembro→janeiro, `dueDay` 31 em janeiro/fevereiro/fevereiro bissexto/abril); household (membro do mesmo household lê, household externo recebe 404, `ListInstallmentPlansService` isola por household); compatibilidade com lançamento avulso.
- **HTTP (`installment-plans.test.ts`, 14 casos):** POST válido (201, dinheiro como string, `installmentPlanId` correto em cada parcela); R$ 1000/3; corpo com campo desconhecido (400, nenhuma escrita); `installmentCount`/`dueDay` inválidos (400); `totalAmount` numérico (400); sem sessão (401, nenhuma escrita); categoria de outro household (409, nenhuma escrita); categoria inexistente (404, nenhuma escrita); GET lista (isolado por household, vazio quando não há); GET detalhe (200 com parcelas; 404 para plano inexistente; 404 para plano de outro household).
- **Suíte completa:** API 667/667, Web 366/366, Domain 214/214 — 0 falhas em qualquer workspace, confirmado em execução isolada e em `npm run test` completo.

## 9. Validações Executadas

| Comando | Resultado |
|---|---|
| `npm run build` | OK (domain + api + web) |
| `npm run verify:runtime` | OK |
| `npm run lint` | OK (oxlint, 3 workspaces) |
| `npm run typecheck` | OK (api + web + domain) |
| `npm run typecheck:api-scripts` | OK (inclui os 4 scripts `db-smoke-*.ts` ajustados) |
| `npm run test` | OK — API 667 (+43), Web 366 (inalterado), Domain 214 (+2) — total 1247 |
| `npx drizzle-kit check` | "Everything's fine" — nenhuma migration nova, nenhum schema drift |
| `npx ddae-engine validate` | Status OK, 0 erros, 0 avisos |
| `npx ddae-engine audit` | Status OK, 0 erros, 0 P1/P2 |

## 10. Decisões Técnicas

Registrada formalmente em `Docs/02_architecture/decisoes_tecnicas.md`, **DT-19**: `InstallmentTransactionRunner`/`InstallmentTransactionContext`, `DrizzleInstallmentTransactionRunner` (via `db.transaction()` nativo), `InMemoryInstallmentTransactionRunner` (snapshot/restore sem reverter contador de id), e a extensão de `FinancialEntry` com `installmentPlanId`/`installmentNumber` obrigatórios (nunca opcionais). RS-01 (`02_analysis/analise_riscos.md`) marcada como resolvida, histórico preservado.

## 11. Problemas Encontrados

Nenhum problema real de arquitetura — a inspeção prévia (Seção 6 do bloco) confirmou que `db.transaction()` já era suportado por `DrizzleDb` (o tipo usado por todos os repositórios) desde o Bloco 14, sem exigir nenhuma mudança estrutural. O único ajuste iterativo foi o volume esperado de fixtures quebradas pela extensão de `FinancialEntry` (mesma classe de ajuste já vista no Bloco 03 para o tipo de linha do banco, agora no tipo de domínio) — resolvido mecanicamente, guiado por `tsc --noEmit`, sem nenhuma mudança de comportamento em código de produção além do estritamente necessário.

## 12. Correções Aplicadas Durante o Bloco

- Um teste do Bloco 03 (`drizzle-financial-entry-repository.test.ts`) verificava ausência da propriedade `installmentPlanId` no valor inserido — corrigido para verificar que o valor é `null` (a propriedade agora sempre existe, porque `installmentPlanId` passou a fazer parte do tipo de domínio `FinancialEntry`).
- `create-drizzle-repositories.test.ts` esperava 7 portas — corrigido para 8 (`installmentPlans` adicionada).
- Design do `InMemoryInstallmentTransactionRunner`: a primeira versão do `snapshot()`/`restore()` incluía o contador de id (`idCounter`/`nextIdCounter`) — corrigido durante a própria implementação, antes de qualquer teste ter sido escrito com essa suposição, ao perceber que isso permitiria reaproveitar um id após rollback, diferente do comportamento real do `AUTO_INCREMENT` do MySQL (que nunca "devolve" um valor consumido, mesmo com `ROLLBACK`).

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência importante identificada._

### P3 — Melhoria Recomendada

_Nenhuma nova neste bloco._

### P4 — Opcional

_Nenhuma nova neste bloco._

## 14. Riscos Restantes

- Transação longa (proporcional a `installmentCount`) mantém uma conexão do pool ocupada mais tempo que uma escrita simples — aceitável no volume esperado (uso doméstico, sem escritores concorrentes). **Correção de 2026-08-25 (revisão pré-merge):** o schema HTTP chegou a impor `maximum: 60` em `installmentCount` sem nenhum requisito formal aprovado que sustentasse esse valor — pesquisa em `Docs/01_product/requisitos_funcionais.md` (RF-10), `02_analysis/*`, `05_blocks/bloco_04_*` e `decisoes_tecnicas.md` não encontrou decisão de produto estabelecendo um teto de parcelas; a única invariante formal é `installmentCount >= 2` (domínio, `installment-rules.ts`). O limite arbitrário foi removido de `installment-plan-schemas.ts` — API e domínio permanecem coerentes (só mínimo 2, sem máximo). Teste HTTP adicionado provando 61 parcelas aceito. Se um teto de negócio for desejado no futuro, deve nascer de um requisito formal, não de um valor de schema não documentado.
- Nenhum risco ativo remanescente relacionado a este item — apenas a característica conhecida de transação proporcional ao tamanho do plano.
- Nenhum outro risco material identificado — RS-01 resolvida, DT-15/DT-18 preservadas intactas (confirmado por `git grep -n "\.nextId("`, zero ocorrências executáveis, e pelos guards estáticos já existentes nos 3 repositórios afetados, que continuam passando).

## 15. Evidências

- `npm run test` (raiz): **API 667 passed (667), Web 366 passed (366), Domain 214 passed (214)** — 0 falhas em qualquer workspace.
- `npx drizzle-kit check`: `Everything's fine 🐶🔥` — confirmando que nenhuma migration nova foi necessária.
- `npx ddae-engine validate`: `Status: OK · Warnings: 0 · Errors: 0`.
- `npx ddae-engine audit`: `Status: OK · Warnings: 9 · Errors: 0 · Pendências P1/P2: nenhuma` (os 9 avisos são os 8 já conhecidos de blocos anteriores — nenhum novo além do já esperado "bloco sem feedback", resolvido por este próprio arquivo).
- `git status --short`: apenas os arquivos listados nas seções 4/5 acima.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Bloco 05 — Cadastro e visualização de parcelamentos no frontend (formulário de criação, indicador "N/Total" em Movimentações, consumo das rotas `POST/GET .../installment-plans` já prontas). Nenhum bloqueio técnico conhecido para iniciá-lo.

## 18. Commit Semântico Sugerido

```
feat(servicos_api_e_persistencia_atomica_de_parcelamentos): implementar criacao atomica de InstallmentPlan + N FinancialEntry (RS-01) e API de parcelamentos
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
