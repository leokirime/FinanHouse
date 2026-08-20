# Feedback — Bloco 03: Persistência, schema e migration

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-20

## 1. Resumo Executivo

O Bloco 03 persistiu `InstallmentPlan` sem alterar o contrato de domínio corrigido no Bloco 02: nova tabela `installment_plans`, extensão nullable de `financial_entries` (`installment_plan_id`/`installment_number`), porta `InstallmentPlanRepository` (imutável, sem update/remove), repositórios Drizzle (`insertId` nativo, seguindo DT-15) e em memória, mapper, e a migration correspondente — gerada e revisada, mas **não aplicada** a nenhum ambiente. Nenhum endpoint, serviço de orquestração ou wiring de DI foi criado — RS-01 e a integração transacional plano+parcelas permanecem integralmente reservados ao Bloco 04.

O ponto explicitamente pedido pelo proprietário — se a dívida técnica de DT-15 (`nextId()`/`save()` de `DrizzleFinancialEntryRepository`) compromete a criação segura de várias parcelas no Bloco 04 — foi investigado a fundo (leitura completa do código real, não suposição) e a conclusão é **B: risco real**, não apenas teórico. O mecanismo, a consequência (sobrescrita silenciosa, não um erro visível) e a correção mínima recomendada estão documentados em `Docs/02_architecture/decisoes_tecnicas.md` (DT-17). Nenhuma refatoração foi feita — apenas a avaliação, conforme instrução explícita.

Suíte completa sem regressão: API 609 testes (+38, todos novos), Web 366 (inalterado), Domain 212 (inalterado) — total 1187 vs. baseline 1149. Build, verify:runtime, lint, typecheck (raiz e scripts), `ddae-engine validate` (0 erros/avisos) e `ddae-engine audit` (10 avisos, todos já esperados ou explicados) passaram. Status: **concluído conforme escopo**, com a pendência P2 de DT-15/Bloco 04 registrada explicitamente para decisão do proprietário antes do próximo bloco.

## 2. Objetivo do Bloco

Persistir `InstallmentPlan` (schema, porta, repositórios Drizzle/memória) e estender `financial_entries` com o vínculo nullable de parcela, gerando (sem aplicar) a migration correspondente.

## 3. Escopo Implementado

Implementado exatamente como planejado em `05_blocks/bloco_03_persistencia_schema_e_migration.md`, sem divergência:

- Tabela `installment_plans` (schema Drizzle), com `dueDay` obrigatório e `createdAt` presente — reafirmando a correção do Bloco 02.
- Extensão nullable de `financial_entries` (`installment_plan_id`/`installment_number`), CHECK de coerência, índice único composto, FK composta `ON DELETE RESTRICT`.
- Porta `InstallmentPlanRepository` (`findById`/`findByHousehold`/`create` — sem update/remove).
- `DrizzleInstallmentPlanRepository` com `insertId` nativo (nunca `nextId()`/`information_schema`/`MAX(id)`).
- `InMemoryInstallmentPlanRepository` com a mesma semântica de isolamento por household.
- Mapper `installment-plan-mapper.ts`.
- Migration `0004_deep_machine_man.sql` gerada e revisada, não aplicada.
- Avaliação formal A/B do risco de DT-15 para o Bloco 04 — registrada em DT-17.
- Testes novos para todos os artefatos acima e asserções estáticas de schema.
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-17) e `Docs/03_contracts/contrato_banco_dados.md` atualizados.

## 4. Arquivos Criados

- `apps/api/src/db/schema/installment-plans.ts`
- `apps/api/src/application/ports/installment-plan-repository.ts`
- `apps/api/src/infrastructure/repositories/drizzle/mappers/installment-plan-mapper.ts` + `installment-plan-mapper.test.ts`
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-installment-plan-repository.ts` + `drizzle-installment-plan-repository.test.ts`
- `apps/api/src/infrastructure/repositories/memory/in-memory-installment-plan-repository.ts` + `in-memory-installment-plan-repository.test.ts`
- `database/migrations/0004_deep_machine_man.sql`, `database/migrations/meta/0004_snapshot.json`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_03_persistencia_schema_e_migration.md`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/06_prompts/prompt_bloco_03_persistencia_schema_e_migration.md`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/08_feedbacks/feedback_bloco_03_persistencia_schema_e_migration.md` (este arquivo)

## 5. Arquivos Alterados

- `apps/api/src/db/schema/financial-entries.ts` — colunas nullable, CHECK de coerência, índice único, FK composta para `installment_plans`.
- `apps/api/src/db/schema/index.ts` — barrel export de `installment-plans.ts`.
- `apps/api/src/db/types.ts` — `InstallmentPlan`/`NewInstallmentPlan` (`$inferSelect`/`$inferInsert`).
- `apps/api/src/application/ports/index.ts` — barrel export de `InstallmentPlanRepository`.
- `apps/api/src/infrastructure/repositories/memory/index.ts` — barrel export de `InMemoryInstallmentPlanRepository`.
- `apps/api/src/db/schema/schema.test.ts` — 16 novas asserções (`installment_plans` + extensão de `financial_entries`).
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-financial-entry-repository.test.ts`, `.../mappers/financial-entry-mapper.test.ts` — correção mínima de fixture (`installmentPlanId: null, installmentNumber: null` no `buildRow()`), necessária porque `$inferSelect` passou a exigir as duas colunas novas como chaves presentes.
- `database/migrations/README.md` — nova entrada para `0004_deep_machine_man.sql`.
- `database/migrations/meta/_journal.json` — entrada gerada automaticamente por `drizzle-kit generate`.
- `Docs/02_architecture/decisoes_tecnicas.md` — nova decisão DT-17 (modelo de dados + reavaliação formal do risco de DT-15).
- `Docs/03_contracts/contrato_banco_dados.md` — linhas de `installment_plans`/extensão de `financial_entries`, seção de migrations, decisões pendentes.

## 6. Arquivos Removidos

- Nenhum.

## 7. Comandos Executados

```
npx vitest run src/db/schema/schema.test.ts
npx vitest run src/infrastructure/repositories/drizzle/mappers/installment-plan-mapper.test.ts src/infrastructure/repositories/drizzle/drizzle-installment-plan-repository.test.ts src/infrastructure/repositories/memory/in-memory-installment-plan-repository.test.ts
npx vitest run   # apps/api completo — 59 arquivos, 609 testes
npx tsc --noEmit   # apps/api
npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run typecheck:api-scripts
npm run test   # todos os workspaces — API 609, Web 366, Domain 212
npx drizzle-kit generate
npx drizzle-kit check
npx ddae-engine validate
npx ddae-engine audit
git status --short
git diff --stat
git diff --check
git check-ignore -v apps/api/.env.local apps/web/.env.local
```

## 8. Testes Realizados

- **`installment-plan-mapper.test.ts`** (4 casos): mapeamento completo domínio↔persistência, conversão de dinheiro (Money↔decimal), conversão de `createdAt` (Date↔ISO string), `dueDay` sempre numérico (nunca null), round-trip domínio→persistência→domínio.
- **`drizzle-installment-plan-repository.test.ts`** (11 casos, via `FakeDrizzleDb`): `findById` (encontrado/não encontrado/erro sanitizado), `findByHousehold` (isolamento entre households, lista vazia), `create()` (nunca fornece `id`, ids distintos em chamadas sequenciais e entre households, sempre `INSERT` novo nunca `UPDATE`, `PersistenceError` sanitizado em falha), e um teste estático confirmando que o código-fonte real (fora de comentários) nunca menciona `information_schema`/`nextId`/`MAX(id)` e sempre usa `insertId`.
- **`in-memory-installment-plan-repository.test.ts`** (7 casos): geração de id interna, ids distintos, `findById`, isolamento por household em `findByHousehold`, `reset()`.
- **`schema.test.ts`** (16 novos casos, 35 no total no arquivo): tipos de coluna (`bigint unsigned` em todos os campos numéricos, nunca `int`), `decimal(13,2)` para dinheiro, `due_day` `NOT NULL`, `created_at` com `defaultNow`, `unique(id, household_id)`, três `CHECK`s, FKs simples (`household_id`/`created_by_user_id`) e composta (`category_id`), ausência de FK para `monthly_periods`; para `financial_entries`: colunas novas nullable, ausência de `installment_total`/`total_amount`/`installment_count`, `CHECK` de coerência, índice único, FK composta com `RESTRICT`.
- **Suíte completa (`npm run test`)**: API 609/609, Web 366/366, Domain 212/212 — nenhuma regressão em nenhum workspace.
- **`npx tsc --noEmit`** (apps/api): zero erros após a extensão do schema — confirmou que apenas os dois `buildRow()` de teste precisavam de ajuste, nenhuma mudança em código de produção.

## 9. Validações Executadas

| Comando | Resultado |
|---|---|
| `npm run build` | OK (domain + api + web) |
| `npm run verify:runtime` | OK — `@finanhouse/domain` e serviço compilado importam via Node puro |
| `npm run lint` | OK (oxlint, 3 workspaces) |
| `npm run typecheck` | OK (api + web + domain) |
| `npm run typecheck:api-scripts` | OK |
| `npm run test` | OK — API 609 (+38), Web 366, Domain 212 — total 1187 (baseline 1149) |
| `npx drizzle-kit generate` | OK — `0004_deep_machine_man.sql` gerado (9 tabelas reconhecidas no schema) |
| `npx drizzle-kit check` | "Everything's fine" |
| `npx ddae-engine validate` | Status OK, 0 erros, 0 avisos |
| `npx ddae-engine audit` | Status OK, 10 avisos — 9 já conhecidos de blocos anteriores + 1 novo esperado ("Bloco sem feedback correspondente", resolvido por este próprio arquivo) |
| Revisão de segurança | `git status`/`git diff --stat`/`git diff --check` sem achados; `.env.local` de `api`/`web` continuam ignorados pelo Git; migration `0004` inspecionada linha a linha — DDL puro, sem dados/segredos |

## 10. Decisões Técnicas

Todas registradas formalmente em `Docs/02_architecture/decisoes_tecnicas.md`, **DT-17**:

- Modelo de dados de `installment_plans` e extensão de `financial_entries` (colunas, tipos, FKs, CHECKs, índice único) — replica exatamente as convenções já estabelecidas (FK composta por household, `bigint unsigned` universal, `unique(id, household_id)`, DECIMAL para dinheiro).
- `ON DELETE RESTRICT` (nunca `SET NULL`) na FK de `installment_plan_id` — tecnicamente forçado pelo erro MySQL 8 `3823` (coluna alvo de `SET NULL` não pode ser também referenciada por `CHECK`), mesma justificativa já usada por `financial_entries_responsible_member_household_fk` (DT-09).
- `InstallmentPlanRepository` nasce sem a dívida de DT-15 — primeira tabela nova desde essa decisão, já usando `insertId` nativo desde o primeiro commit.
- **Reavaliação formal do risco de DT-15 para o Bloco 04** (pedido explícito do proprietário) — conclusão **B: risco real**. Ver seção 11 abaixo e DT-17 para o detalhamento completo (mecanismo, consequência silenciosa, mudança mínima recomendada).

## 11. Problemas Encontrados

**Achado principal — avaliação de risco pedida explicitamente pelo proprietário (não um bug introduzido neste bloco):**

`DrizzleFinancialEntryRepository.nextId()` (`apps/api/src/infrastructure/repositories/drizzle/drizzle-financial-entry-repository.ts:132-145`) usa o mesmo padrão que DT-15 já documentou como defeituoso para `auth_sessions`: `SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_NAME = 'financial_entries'`. Essa leitura não reflete de forma confiável um `INSERT` recém-concluído no mesmo processo.

Um laço de criação de N parcelas no estilo `for (parcela de 1..N) { id = await nextId(); await save({ id, ... }) }` (o desenho mais natural para o Bloco 04) chama `nextId()` novamente logo após cada `INSERT` — exatamente o padrão sequencial em que essa metadata já se mostrou capaz de não avançar entre chamadas. Se o segundo `nextId()` devolver o mesmo `id` já usado pela primeira parcela, `save()` não falha visivelmente: como primeiro verifica se o `id` já existe, ele entra no ramo de `UPDATE` e **sobrescreve silenciosamente a parcela anterior já persistida**, sem lançar nenhum erro — o mesmo modo de falha silenciosa já comprovado (e corrigido) para `auth_sessions` em DT-15, agora reproduzível dentro de uma única requisição, sem precisar de dois usuários concorrentes.

A nota de dívida técnica original de DT-15 julgava esse risco "menor" para `financial_entries` por comparação com `auth_sessions` (login é automático a cada carregamento de página; criar uma movimentação é uma ação deliberada). Essa comparação segue válida para o uso *atual* (uma movimentação por vez), mas não cobre o uso que o Bloco 04 pretende introduzir — múltiplas chamadas em sequência rápida, para o mesmo household, dentro da mesma requisição.

**Conclusão explícita: B — risco real, não apenas teórico, para o caso de uso planejado do Bloco 04.** Documentado por completo em DT-17. Nenhuma correção foi implementada neste bloco, por instrução explícita do proprietário — apenas a avaliação e o relato.

## 12. Correções Aplicadas Durante o Bloco

- Dois arquivos de teste pré-existentes (`drizzle-financial-entry-repository.test.ts`, `financial-entry-mapper.test.ts`) precisaram de uma correção mínima em seus `buildRow()` (adicionar `installmentPlanId: null, installmentNumber: null`), porque `$inferSelect` do Drizzle exige as novas colunas nullable como chaves presentes no tipo (diferente de `$inferInsert`, que as trata como opcionais). Confirmado via `npx tsc --noEmit` que nenhuma outra mudança de compatibilidade foi necessária — em particular, `toPersistenceFinancialEntry` (código de produção) não precisou de nenhum ajuste.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Original (registrada neste bloco): `DrizzleFinancialEntryRepository.nextId()`/`save()` (padrão pré-DT-15) era um risco real para a criação sequencial de N parcelas planejada no Bloco 04 — podia sobrescrever parcelas silenciosamente, sem erro visível. Avaliação completa e mudança mínima recomendada (um `create()` dedicado, espelhando `AuthSessionRepository`, sem tocar `nextId()`/`save()` existentes) documentadas em `Docs/02_architecture/decisoes_tecnicas.md`, DT-17._
_**Resolvida em 2026-08-20** — ver seção 19 (Adendo) abaixo: `DrizzleFinancialEntryRepository`, e também `DrizzleMonthlyPeriodRepository`/`DrizzleCategoryBudgetRepository` (mesma dívida, fechada por completo), agora usam `create()`/`update()` com `insertId` nativo — DT-18. Nenhuma pendência P2 técnica ativa remanescente desta origem._

### P3 — Melhoria Recomendada

_Nenhuma nova neste bloco._

### P4 — Opcional

_Original (registrada neste bloco): `database/migrations/README.md` não documentava `0002_category_budgets.sql`/`0003_auth_sessions.sql` no mesmo nível de detalhe das demais entradas — lacuna pré-existente a este bloco, apenas sinalizada, não corrigida na aprovação original._
_**Resolvida em 2026-08-20** — ver seção 19 (Adendo): `database/migrations/README.md` e `Docs/03_contracts/contrato_banco_dados.md` atualizados com as entradas de `0002`/`0003` (incluindo a correção de uma imprecisão adicional encontrada: `contrato_banco_dados.md` ainda marcava `0003_auth_sessions.sql`/`auth_sessions` como "pendente de aplicação", quando na verdade já havia sido aplicada em 2026-08-06 segundo `apps/api/README.md`). Nenhuma pendência P4 técnica/documental ativa remanescente desta origem._

## 14. Riscos Restantes

- ~~O risco P2 (DT-17) era o único risco material deixado em aberto por este bloco~~ — **resolvido em 2026-08-20** (ver seção 19, Adendo).
- Migration `0004_deep_machine_man.sql` permanece gerada e não aplicada — nenhum ambiente (`finanhouse_dev` ou produção) reflete o novo schema até uma aplicação explícita e autorizada. Continua sendo o único item realmente em aberto.

## 15. Evidências

- `npm run test` (raiz): **API 609 passed (609), Web 366 passed (366), Domain 212 passed (212)** — 0 falhas em qualquer workspace.
- `npx drizzle-kit check`: `Everything's fine 🐶🔥`.
- `npx ddae-engine validate`: `Status: OK · Warnings: 0 · Errors: 0`.
- `npx ddae-engine audit`: `Status: OK · Warnings: 10 · Errors: 0` (todos identificados e explicados nesta e em feedbacks anteriores).
- `git status --short`: apenas os arquivos listados nas seções 4/5 acima — nenhum arquivo fora do escopo planejado foi tocado.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Bloco 04 — orquestração transacional de compra parcelada (RS-01: persistência atômica de `InstallmentPlan` + N `FinancialEntry`, wiring de DI, endpoint HTTP). **Recomendação explícita:** decidir, antes de iniciar a orquestração transacional, se a correção mínima de DT-15/P2 (um `create()` dedicado em `FinancialEntryRepository`, espelhando `AuthSessionRepository`) entra como primeiro passo do próprio Bloco 04 ou como um bloco curto dedicado — ver DT-17 para o detalhamento completo do risco.

## 18. Commit Semântico Sugerido

```
feat(persistencia_schema_e_migration): persistir InstallmentPlan (schema, repositórios, migration gerada) e estender financial_entries com vínculo de parcela
```

## 19. Adendo — Correção e Hardening da DT-15 (2026-08-20, pré-Bloco 04)

Após a aprovação técnica deste bloco (commit `131713b2e6ce23b3050be6df52c2937f93faed88`, já commitado/pushado), o proprietário autorizou uma rodada adicional de correção: fechar por completo a dívida técnica P2 registrada em DT-15/DT-17, nos três repositórios ainda pendentes (`FinancialEntryRepository`, `MonthlyPeriodRepository`, `CategoryBudgetRepository`), em vez de corrigir apenas o repositório citado na avaliação original — para não carregar nenhuma implementação baseada em `nextId()`/`information_schema` para o Bloco 04. Detalhamento completo da decisão em `Docs/02_architecture/decisoes_tecnicas.md`, **DT-18**.

**Resumo do que foi feito:**
- `FinancialEntryRepository`, `MonthlyPeriodRepository`, `CategoryBudgetRepository` (portas): `save()`/`nextId()` substituídos por `create()`/`update()` separados.
- `DrizzleFinancialEntryRepository`, `DrizzleMonthlyPeriodRepository`, `DrizzleCategoryBudgetRepository`: reescritos para o mesmo padrão de `DrizzleAuthSessionRepository`/`DrizzleInstallmentPlanRepository` — `create()` via `INSERT` sem `id` + `ResultSetHeader.insertId`, `update()` nunca cria implicitamente, sempre verifica existência e household antes do `UPDATE`.
- `InMemoryFinancialEntryRepository`, `InMemoryMonthlyPeriodRepository`, `InMemoryCategoryBudgetRepository`: mesmo contrato `create()`/`update()`; ganharam `seed()` (mesmo padrão de `InMemoryUserRepository`) para os testes de HTTP/serviço pré-existentes continuarem populando fixtures com `id` conhecido.
- `CreateFinancialEntryService`, `OpenMonthlyPeriodService`, `PutCategoryBudgetService` e todos os serviços de transição de estado adaptados para `create()`/`update()` — nenhuma regra de negócio mudou.
- Dois scripts de smoke-test manuais (`db-smoke-repositories.ts`, `db-smoke-category-budgets.ts`) atualizados para o novo contrato — **nenhum executado nesta rodada**.
- Três arquivos de teste de repositório Drizzle reescritos com testes de `create()`/`update()` e guard estático de ausência de `information_schema`/`nextId`/`MAX(id)`; ~90 chamadas `.save(...)` de fixture em testes de HTTP/serviço convertidas para `.seed([...])`.
- `database/migrations/README.md` e `Docs/03_contracts/contrato_banco_dados.md`: P4 resolvida (entradas de `0002`/`0003` documentadas) — no processo, foi encontrada e corrigida uma imprecisão adicional em `contrato_banco_dados.md` (`auth_sessions`/0003 ainda descritos como não aplicados, quando `apps/api/README.md` já registrava a aplicação em 2026-08-06).
- DT-15 e DT-17 mantidos intactos (histórico nunca editado) — cada um ganhou uma linha **Status** apontando para a nova decisão DT-18, que registra a resolução.
- `git grep -n "\.nextId("` em `apps/**`: zero ocorrências executáveis.

**Validação:** API 624 (+15 sobre o baseline deste bloco), Web 366 (inalterado), Domain 212 (inalterado) — total 1202. Build, verify:runtime, lint, typecheck, typecheck:api-scripts, `drizzle-kit check`, `ddae-engine validate` (0 erros) e `ddae-engine audit` (0 erros, pendências P2 desta origem fechadas) sem regressão. Nenhuma migration aplicada, nenhum acesso ao Aiven, nenhum dado real alterado.

**Commit desta correção:** ver `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/README.md` ou o histórico do Git na branch `feat/session-12-bloco-03-persistencia-schema-migration` — hash registrado no relatório final apresentado ao proprietário para esta rodada.

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
