# Bloco 03 — Persistência, schema e migration

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-20

## 1. Objetivo

Persistir `InstallmentPlan` (schema, porta, repositórios Drizzle/memória) e estender `financial_entries` com o vínculo nullable de parcela, gerando (sem aplicar) a migration correspondente.

## 2. Contexto

Bloco 02 (commit `b91648d`, merge `73721ca`) entregou o domínio puro de parcelamentos — `InstallmentPlan`, `GeneratedInstallment`, `createInstallmentPlan`, `generateInstallments` — sem nenhuma camada de persistência. Este bloco é o próximo passo natural da Sessão 12 antes que o Bloco 04 possa orquestrar a criação atômica de um plano + N parcelas (RS-01, `Docs/01_product/requisitos_funcionais.md`). Segue as convenções já registradas em `Docs/02_architecture/decisoes_tecnicas.md` (DT-01 Drizzle+mysql2, DT-09 FK composta por household, DT-15 geração nativa de id).

## 3. Problema que Este Bloco Resolve

Não existe nenhuma forma de gravar um `InstallmentPlan` no banco, nem de vincular uma `financial_entries` a um plano/número de parcela — sem isso, o Bloco 04 não tem onde persistir o resultado de `generateInstallments`.

## 4. Escopo

- Nova tabela `installment_plans` (schema Drizzle) com todas as colunas do contrato do Bloco 02 (`dueDay` obrigatório, `createdAt` presente).
- Extensão de `financial_entries` com `installment_plan_id`/`installment_number` (nullable), CHECK de coerência, índice único (plano, número) e FK composta.
- Porta `InstallmentPlanRepository` (`findById`, `findByHousehold`, `create` — sem update/remove, plano imutável).
- `DrizzleInstallmentPlanRepository` usando `AUTO_INCREMENT` nativo (`ResultSetHeader.insertId`), nunca `nextId()`/`information_schema`/`MAX(id)`.
- `InMemoryInstallmentPlanRepository` com a mesma semântica de isolamento por household e imutabilidade.
- Mapper `installment-plan-mapper.ts` (Money↔decimal, Date↔string ISO, DATE↔string direto).
- Migration gerada e revisada estaticamente (`drizzle-kit generate`/`check`), **nunca aplicada**.
- Avaliação formal e explícita do risco de DT-15 (`nextId()`/`save()`) para o caso de uso do Bloco 04.
- Testes: mapper, repositório Drizzle (`FakeDrizzleDb`), repositório em memória, asserções estáticas de schema.
- Atualização de `Docs/02_architecture/decisoes_tecnicas.md` (DT-17) e `Docs/03_contracts/contrato_banco_dados.md`.

## 5. Fora de Escopo

- RS-01 (persistência atômica de plano + N parcelas), qualquer endpoint/serviço/transação de compra parcelada — Bloco 04.
- Wiring de DI (`createDrizzleRepositories`, `DrizzleRepositories`, `HttpAppRepositories`, `build-test-app.ts`) — Bloco 04.
- Qualquer alteração em `packages/domain` (o contrato de `InstallmentPlan`/`GeneratedInstallment` corrigido no Bloco 02 permanece intocado).
- Aplicação da migration (`drizzle-kit migrate`), acesso ao Aiven, seed, bootstrap.
- Correção do padrão `nextId()`/`save()` de `DrizzleFinancialEntryRepository` (dívida P2 de DT-15) — apenas avaliada e documentada, não corrigida.
- Qualquer código de frontend.

## 6. Arquivos e Pastas Envolvidos

- `apps/api/src/db/schema/installment-plans.ts` (novo)
- `apps/api/src/db/schema/financial-entries.ts` (extensão)
- `apps/api/src/db/schema/index.ts`, `apps/api/src/db/types.ts`
- `apps/api/src/application/ports/installment-plan-repository.ts` (novo), `apps/api/src/application/ports/index.ts`
- `apps/api/src/infrastructure/repositories/drizzle/mappers/installment-plan-mapper.ts` (novo) e teste
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-installment-plan-repository.ts` (novo) e teste
- `apps/api/src/infrastructure/repositories/memory/in-memory-installment-plan-repository.ts` (novo) e teste, `apps/api/src/infrastructure/repositories/memory/index.ts`
- `apps/api/src/db/schema/schema.test.ts` (extensão)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-financial-entry-repository.test.ts`, `.../mappers/financial-entry-mapper.test.ts` (fixtures — compatibilidade mínima)
- `database/migrations/0004_deep_machine_man.sql`, `database/migrations/meta/`, `database/migrations/README.md`
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/03_contracts/contrato_banco_dados.md`

## 7. Dependências

- Bloco 01 (decisões de produto: sem exclusão global de plano, sem cascade) e Bloco 02 (contrato de domínio `InstallmentPlan`/`GeneratedInstallment` corrigido) já mergeados em `main` (commit `73721ca`).
- Convenções de schema já estabelecidas (FK composta por household, `bigint unsigned` universal, DECIMAL para dinheiro, `unique(id, household_id)`).

## 8. Plano de Implementação

1. Inspecionar convenções reais do schema/repositórios existentes (`auth-sessions.ts`, `monthly-periods.ts`, `category-budgets.ts`, mappers e repositórios Drizzle/memória correspondentes).
2. Criar `installment-plans.ts` (schema) replicando as convenções encontradas.
3. Estender `financial-entries.ts` com as duas colunas nullable, CHECK de coerência, índice único e FK composta.
4. Atualizar barris (`schema/index.ts`, `db/types.ts`, `application/ports/index.ts`, `memory/index.ts`).
5. Implementar porta, mapper, repositório Drizzle (`insertId` nativo) e repositório em memória.
6. Rodar `tsc --noEmit` para descobrir o impacto real da extensão de `financial_entries` e corrigir o mínimo necessário.
7. Escrever os testes novos (mapper, Drizzle, memória, schema).
8. Gerar a migration (`drizzle-kit generate`), revisar linha a linha, rodar `drizzle-kit check`.
9. Atualizar `database/migrations/README.md`, `Docs/02_architecture/decisoes_tecnicas.md` (DT-17, incluindo a reavaliação do risco de DT-15) e `Docs/03_contracts/contrato_banco_dados.md`.
10. Rodar a suíte completa de validação (build, verify:runtime, lint, typecheck, typecheck:api-scripts, test, ddae validate, ddae audit) e revisão de segurança.
11. Preencher este bloco e o prompt correspondente; criar o feedback só depois de tudo validado.

## 9. Critérios de Aceite

- [x] `installment_plans` criada no schema Drizzle com `dueDay` obrigatório e `createdAt` presente (contrato do Bloco 02 preservado).
- [x] `financial_entries` ganha `installment_plan_id`/`installment_number` nullable — nunca `installment_total`, nunca duplicação de `total_amount`/`installment_count`.
- [x] Lançamentos comuns (ambas as colunas null) continuam funcionando sem qualquer plano.
- [x] CHECK garante que as duas colunas sempre se movem juntas; índice único impede duas parcelas com o mesmo número no mesmo plano.
- [x] `ON DELETE RESTRICT` na FK de `installment_plan_id` — nunca CASCADE; nenhuma rota de exclusão de plano criada.
- [x] `DrizzleInstallmentPlanRepository.create()` usa exclusivamente `insertId` nativo — teste estático confirma ausência de `information_schema`/`nextId`/`MAX(id)`.
- [x] `InstallmentPlanRepository` não expõe update/remove.
- [x] Migration gerada e revisada, **não aplicada** a nenhum ambiente.
- [x] Avaliação formal (A/B) do risco de DT-15 para o Bloco 04 registrada em DT-17.
- [x] Nenhum endpoint, serviço, transação ou wiring de DI criado neste bloco.
- [x] Suíte completa passa sem regressão (API 609, Web 366, Domain 212 — total 1187, baseline 1149).

## 10. Validações Obrigatórias

- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test` (todos os workspaces)
- [x] `npx drizzle-kit generate` / `npx drizzle-kit check` (estáticos, sem conexão a banco)
- [x] `npx ddae-engine validate`
- [x] `npx ddae-engine audit`
- [x] Revisão de segurança (`git status`, `git diff --stat`, `git diff --check`, inspeção da migration gerada)

## 11. Segurança

Nenhum dado sensível ou real tocado — nenhuma conexão ao Aiven, nenhum seed, nenhuma aplicação de migration. A migration gerada foi revisada linha a linha (DDL puro, sem dados). `createdByUserId` de `installment_plans` segue a mesma regra já estabelecida para `financial_entries`: somente autoria/auditoria, nunca filtro de visibilidade ou controle de acesso — o isolamento real é sempre por `householdId`.

## 12. Performance

Não aplicável — nenhum código de leitura/escrita em produção foi conectado neste bloco (sem wiring de DI, sem endpoint). Os índices (`installment_plans_household_id_idx`, único composto em `financial_entries`) seguem o mesmo padrão de custo already aceito para os índices equivalentes de `category_budgets`/`monthly_periods`.

## 13. Design System / UX

Não aplicável — nenhum código de frontend neste bloco.

## 14. Riscos

- **Risco já identificado e avaliado formalmente (não corrigido neste bloco):** `DrizzleFinancialEntryRepository.nextId()`/`save()` (padrão pré-DT-15) pode sobrescrever silenciosamente parcelas em um laço sequencial de criação — ver DT-17, seção de reavaliação, e item de pendência P2 abaixo. Recomendação registrada: correção curta e isolada antes do desenho da orquestração transacional do Bloco 04.
- Documentação histórica de `database/migrations/README.md` e `Docs/03_contracts/contrato_banco_dados.md` já estava com lacunas anteriores a este bloco (migrations `0002`/`0003` sub-documentadas) — não ampliado neste bloco, apenas sinalizado.

## 15. Pendências Esperadas

- **P2** — `DrizzleFinancialEntryRepository` ainda usa o padrão `nextId()`/`information_schema`/`save()` (mesma classe de defeito já corrigida em `auth_sessions` por DT-15); reavaliado neste bloco especificamente para o caso de uso do Bloco 04 (criação sequencial de N parcelas) e concluído como risco real (não apenas teórico) — ver DT-17. Mudança mínima proposta: `create()` dedicado espelhando `AuthSessionRepository`, sem tocar `nextId()`/`save()` existentes.
- **P4** — `database/migrations/README.md` não documenta `0002_category_budgets.sql`/`0003_auth_sessions.sql` no detalhe das demais entradas (gap pré-existente, sinalizado mas não corrigido neste bloco).

## 16. Feedback Obrigatório

Feedback gerado via `ddae-engine feedback create --block bloco_03_persistencia_schema_e_migration --session session_12_parcelamentos_e_compromissos_futuros` após esta validação completa.

## 17. Commit Semântico Sugerido

```
feat(persistencia_schema_e_migration): persistir InstallmentPlan (schema, repositórios, migration gerada) e estender financial_entries com vínculo de parcela
```
