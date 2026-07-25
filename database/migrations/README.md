# database/migrations

Migrations SQL geradas pelo `drizzle-kit generate` a partir do schema TypeScript em `apps/api/src/db/schema/`. Ver `apps/api/drizzle.config.ts`.

Regras:
- Migrations são **geradas e revisadas**, nunca escritas à mão diretamente aqui.
- `drizzle-kit push` é proibido em qualquer ambiente (sincronização automática de schema).
- `drizzle-kit migrate` (aplicação real ao MySQL) só é executado mediante autorização explícita do proprietário, após revisão do SQL.
- Nenhuma migration destrutiva (`DROP`, `TRUNCATE`, dados reais) sem aprovação explícita, mesmo depois de revisada.
- O `.gitignore` da raiz bloqueia `*.sql` genericamente (proteção contra dumps de dados acidentais), com uma exceção explícita para `database/migrations/*.sql` — só migrations geradas pelo `drizzle-kit` nesta pasta são rastreadas pelo Git; qualquer outro `.sql` no projeto continua ignorado.

## Status

- `0000_initial_financial_domain.sql` — migration inicial (6 tabelas: `users`, `households`, `household_members`, `categories`, `monthly_periods`, `financial_entries`), incluindo foreign keys compostas de `financial_entries` para garantir no banco que período e categoria pertencem ao mesmo household. **Gerada e revisada em 2026-07-25, ainda não aplicada.**
- O banco real na Clever Cloud **permanece vazio** — ver `database/current-schema/`. Nenhuma migration foi aplicada.

## Dependências de desenvolvimento — vulnerabilidades conhecidas (P3)

`npm audit` reporta 4 vulnerabilidades moderadas, todas na cadeia de desenvolvimento do `drizzle-kit` (`esbuild` via `@esbuild-kit/core-utils`/`@esbuild-kit/esm-loader`, usado internamente pelo CLI). **Dependências de produção: zero vulnerabilidades** (`npm audit --omit=dev` retorna `found 0 vulnerabilities`). Correção automática (`npm audit fix --force`) forçaria downgrade para `drizzle-kit@0.18.1` (breaking change) — não aplicada. Acompanhar quando o Drizzle atualizar essa dependência interna, sem downgrade quebrável.
