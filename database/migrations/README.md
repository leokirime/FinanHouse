# database/migrations

Migrations SQL geradas pelo `drizzle-kit generate` a partir do schema TypeScript em `apps/api/src/db/schema/`. Ver `apps/api/drizzle.config.ts`.

Regras:
- Migrations são **geradas e revisadas**, nunca escritas à mão diretamente aqui.
- `drizzle-kit push` é proibido em qualquer ambiente (sincronização automática de schema).
- `drizzle-kit migrate` (aplicação real ao MySQL) só é executado mediante autorização explícita do proprietário, após revisão do SQL.
- Nenhuma migration destrutiva (`DROP`, `TRUNCATE`, dados reais) sem aprovação explícita, mesmo depois de revisada.
- O `.gitignore` da raiz bloqueia `*.sql` genericamente (proteção contra dumps de dados acidentais), com uma exceção explícita para `database/migrations/*.sql` — só migrations geradas pelo `drizzle-kit` nesta pasta são rastreadas pelo Git; qualquer outro `.sql` no projeto continua ignorado.

## Status

- `0000_initial_financial_domain.sql` — migration inicial (6 tabelas: `users`, `households`, `household_members`, `categories`, `monthly_periods`, `financial_entries`), incluindo foreign keys compostas de `financial_entries` para garantir no banco que período e categoria pertencem ao mesmo household. Gerada e revisada em 2026-07-25. **Aplicada em 2026-07-31 ao banco real `finanhouse_dev` (Aiven)** — Bloco 12, DT-08. Não aplicada em nenhum banco de produção.
- `0001_responsible_member_household_integrity.sql` — migration incremental: coluna auxiliar `responsible_member_household_id`, FK composta `(responsible_member_id, responsible_member_household_id) → household_members(id, household_id)` com `ON DELETE RESTRICT`, `CHECK` de consistência, `unique(id, household_id)` em `household_members`. Gerada e revisada em 2026-07-31. **Aplicada em 2026-07-31 ao banco real `finanhouse_dev` (Aiven)** — Bloco 13, DT-09, após recuperação de uma tentativa anterior que ficou parcialmente aplicada (erro MySQL `3823`; ver DT-09 para o detalhamento completo do incidente). Não aplicada em nenhum banco de produção.
- `0004_deep_machine_man.sql` — migration incremental (Sessão 12, Bloco 03): cria a tabela `installment_plans` (agrupador de compra parcelada, `id`/`household_id`/`description`/`category_id`/`total_amount`/`installment_count`/`first_reference_month`/`due_day`/`created_by_user_id`/`created_at`, FK composta `(category_id, household_id) → categories(id, household_id)` e FKs simples para `households`/`users`, todas `ON DELETE RESTRICT`, `unique(id, household_id)` como alvo de FK composta, 3 `CHECK` — `total_amount > 0`, `installment_count >= 2`, `due_day` entre 1 e 31); adiciona a `financial_entries` as colunas nullable `installment_plan_id`/`installment_number`, o `CHECK` de coerência (nunca uma preenchida sem a outra) e a FK composta `(installment_plan_id, household_id) → installment_plans(id, household_id)` com `ON DELETE RESTRICT` (nunca `CASCADE` — decisão do Bloco 01: excluir um plano nunca apaga as parcelas já lançadas). Gerada e revisada em 2026-08-20. **NÃO aplicada a nenhum banco** — nem `finanhouse_dev`, nem produção. `drizzle-kit migrate` não foi executado neste bloco; aplicação pendente de autorização explícita do proprietário.
- `finanhouse_prod` (Aiven) continua inexistente — nenhuma migration foi aplicada em produção.

> Nota (pendência P4 pré-existente, não introduzida neste bloco): esta seção não documenta `0002_category_budgets.sql` nem `0003_auth_sessions.sql`, geradas em blocos anteriores à Sessão 12 — gap de documentação já existente antes do Bloco 03, não coberto por este trabalho.

## Dependências de desenvolvimento — vulnerabilidades conhecidas (P3)

`npm audit` reporta 4 vulnerabilidades moderadas, todas na cadeia de desenvolvimento do `drizzle-kit` (`esbuild` via `@esbuild-kit/core-utils`/`@esbuild-kit/esm-loader`, usado internamente pelo CLI). **Dependências de produção: zero vulnerabilidades** (`npm audit --omit=dev` retorna `found 0 vulnerabilities`). Correção automática (`npm audit fix --force`) forçaria downgrade para `drizzle-kit@0.18.1` (breaking change) — não aplicada. Acompanhar quando o Drizzle atualizar essa dependência interna, sem downgrade quebrável.
