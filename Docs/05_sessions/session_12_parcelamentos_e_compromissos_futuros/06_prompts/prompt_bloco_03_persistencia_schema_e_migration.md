# Prompt — Bloco 03: Persistência, schema e migration

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_03_persistencia_schema_e_migration.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco (`Docs/03_contracts/contrato_banco_dados.md`, `Docs/02_architecture/decisoes_tecnicas.md` — DT-01, DT-09, DT-15)

## 2. Objetivo

Persistir `InstallmentPlan` (schema, porta, repositórios Drizzle/memória) e estender `financial_entries` com o vínculo nullable de parcela, gerando (sem aplicar) a migration correspondente — sem alterar o contrato de domínio corrigido no Bloco 02.

## 3. Escopo

- Nova tabela `installment_plans` (todas as colunas do contrato do Bloco 02; `dueDay` obrigatório, `createdAt` presente).
- Extensão de `financial_entries`: `installment_plan_id`/`installment_number` nullable, CHECK de coerência, índice único (plano, número), FK composta `ON DELETE RESTRICT`.
- Porta `InstallmentPlanRepository` (`findById`, `findByHousehold`, `create` — sem update/remove).
- `DrizzleInstallmentPlanRepository` com `AUTO_INCREMENT` nativo (`insertId`), nunca `nextId()`.
- `InMemoryInstallmentPlanRepository` com a mesma semântica.
- Migration gerada e revisada estaticamente, nunca aplicada.
- Avaliação formal (A/B) do risco de DT-15 (`nextId()`/`save()` de `DrizzleFinancialEntryRepository`) para o caso de uso do Bloco 04.
- Testes completos e atualização de `Docs/02_architecture/decisoes_tecnicas.md`/`Docs/03_contracts/contrato_banco_dados.md`.

## 4. Fora de Escopo

- RS-01 (orquestração transacional de plano + N parcelas), qualquer endpoint/serviço/rollback de compra parcelada — Bloco 04.
- Wiring de DI (`createDrizzleRepositories`, `DrizzleRepositories`, `HttpAppRepositories`, `build-test-app.ts`) — Bloco 04.
- Qualquer alteração em `packages/domain`.
- Aplicação da migration, acesso ao Aiven, seed, bootstrap, dados reais.
- Refatoração ampla do padrão `nextId()`/`save()` de `DrizzleFinancialEntryRepository`/`CategoryBudgetRepository`/`MonthlyPeriodRepository` (dívida P2 de DT-15) — apenas avaliar e reportar, nunca corrigir neste bloco.
- Qualquer código de frontend.

## 5. Arquivos Permitidos

- `apps/api/src/db/schema/installment-plans.ts`, `financial-entries.ts`, `index.ts`
- `apps/api/src/db/types.ts`
- `apps/api/src/application/ports/installment-plan-repository.ts`, `index.ts`
- `apps/api/src/infrastructure/repositories/drizzle/mappers/installment-plan-mapper.ts` (+ teste)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-installment-plan-repository.ts` (+ teste)
- `apps/api/src/infrastructure/repositories/memory/in-memory-installment-plan-repository.ts` (+ teste), `memory/index.ts`
- `apps/api/src/db/schema/schema.test.ts`
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-financial-entry-repository.test.ts`, `.../mappers/financial-entry-mapper.test.ts` (só correção mínima de fixture, se necessário)
- `database/migrations/*` (gerado por `drizzle-kit generate`) e `database/migrations/README.md`
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/03_contracts/contrato_banco_dados.md`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_03_persistencia_schema_e_migration.md`, `06_prompts/prompt_bloco_03_persistencia_schema_e_migration.md`, `08_feedbacks/feedback_bloco_03_persistencia_schema_e_migration.md`

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- **Nunca** aplique a migration, execute `drizzle-kit migrate`/`push`, conecte ao Aiven, rode seed/bootstrap ou toque em dados reais.
- **Nunca** faça `git add`/`commit`/`push`/`merge` sem autorização explícita.

## 7. Restrições de Segurança

Não aplicável a novos vetores de ataque (sem endpoint, sem frontend). Atenção obrigatória: revisar a migration gerada linha a linha antes de considerá-la concluída, garantindo ausência de dados reais/segredos; `createdByUserId` de `installment_plans` nunca deve ser usado como controle de acesso — isolamento é sempre por `householdId`.

## 8. Restrições de Performance

Não aplicável — nenhum código de leitura/escrita foi conectado a um caminho de produção neste bloco (sem wiring de DI, sem endpoint).

## 9. Restrições de Design System

Não aplicável — nenhum código de frontend neste bloco.

## 10. Tarefas

1. Inspecionar convenções reais do schema/repositórios existentes antes de implementar.
2. Criar/estender o schema Drizzle (`installment-plans.ts`, `financial-entries.ts`) e os barris.
3. Implementar porta, mapper, repositório Drizzle (`insertId` nativo) e repositório em memória.
4. Rodar `tsc --noEmit` para medir o impacto real e corrigir o mínimo necessário em fixtures existentes.
5. Escrever os testes novos (mapper, Drizzle via `FakeDrizzleDb`, memória, asserções estáticas de schema).
6. Gerar a migration, revisar linha a linha, rodar `drizzle-kit check`.
7. Atualizar `database/migrations/README.md`, `Docs/02_architecture/decisoes_tecnicas.md` (DT-17, com a reavaliação explícita do risco de DT-15) e `Docs/03_contracts/contrato_banco_dados.md`.
8. Rodar a suíte completa de validação e a revisão de segurança.
9. Preencher este bloco/prompt; criar o feedback só depois de tudo validado.

## 11. Critérios de Aceite

- [x] `installment_plans` criada com `dueDay` obrigatório e `createdAt` presente.
- [x] `financial_entries` ganha apenas as duas colunas nullable previstas — nunca `installment_total`/duplicação de `total_amount`/`installment_count`.
- [x] Lançamentos comuns continuam funcionando sem qualquer plano.
- [x] Coerência e unicidade de parcela garantidas por CHECK/índice único.
- [x] `ON DELETE RESTRICT`, nunca CASCADE, sem rota de exclusão de plano.
- [x] `create()` do repositório Drizzle usa exclusivamente `insertId` — verificado por teste estático.
- [x] Porta sem update/remove.
- [x] Migration gerada/revisada, não aplicada.
- [x] Avaliação A/B do risco de DT-15 registrada explicitamente.
- [x] Nenhum endpoint/serviço/transação/wiring de DI criado.
- [x] Suíte completa sem regressão.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test`
- [x] `npx drizzle-kit generate` / `npx drizzle-kit check`
- [x] `npx ddae-engine audit`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_03_persistencia_schema_e_migration --session session_12_parcelamentos_e_compromissos_futuros
```

Preencha todas as seções, incluindo pendências classificadas P1–P4 (P2 do risco de DT-15/Bloco 04; P4 da lacuna pré-existente de `database/migrations/README.md`).

## 14. Validação Final

Preencher `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/09_validation/` (ou arquivo equivalente) com o status final, após revisão do proprietário — não antecipado aqui.

## 15. Commit Semântico Sugerido

```
feat(persistencia_schema_e_migration): persistir InstallmentPlan (schema, repositórios, migration gerada) e estender financial_entries com vínculo de parcela
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
