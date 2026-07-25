# packages/domain

Tipos e regras de negócio do domínio financeiro do Finanhouse, **independentes de framework** — não importa Drizzle nem nada específico de `apps/api`. Os tipos aqui espelham conceitualmente o schema proposto em `apps/api/src/db/schema/` (fonte de verdade da persistência), mas são definidos de forma independente para poderem ser usados também por `apps/web` sem trazer dependências de banco.

## Arquivos

- `category.ts` — `Category`, tipos de status/entry_type.
- `monthly-period.ts` — `MonthlyPeriod`, helper `isPeriodClosed`.
- `financial-entry.ts` — `FinancialEntry`, helper `isRealized`.

Status: tipos mínimos criados no Bloco 03. Nenhuma regra de negócio complexa (fechamento de competência, recorrência) implementada ainda — ver `database/proposed-schema/extensoes-futuras.md`.
