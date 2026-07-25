# packages/domain

Tipos e regras de negócio do domínio financeiro do Finanhouse, **independentes de framework** — não importa Drizzle, mysql2, nem nada específico de `apps/api`. Os tipos aqui espelham conceitualmente o schema proposto em `apps/api/src/db/schema/` (fonte de verdade da persistência), mas são definidos de forma independente para poderem ser usados também por `apps/web` sem trazer dependências de banco.

## Estrutura

```
src/
├── money/              # dinheiro em centavos (bigint), parse/format, aritmética
├── category/            # tipo Category
├── household-member/    # tipo HouseholdMember
├── financial-entry/      # tipo FinancialEntry + regras (transições, validações)
├── monthly-period/       # tipo MonthlyPeriod + regras (abertura/revisão/fechamento)
├── summaries/            # cálculos de resumo mensal e comparação entre meses
├── errors/                # erros de domínio tipados (DomainError e subclasses)
└── index.ts               # ponto de entrada único (@finanhouse/domain)
```

Consumido por `apps/api` via `@finanhouse/domain` (workspace npm — ver `exports` em `package.json`).

## Documentação das regras

Explicação detalhada do comportamento (transições, cálculos, estratégia monetária): `Docs/02_architecture/regras_dominio_financeiro.md`.

Status: fundação (Bloco 03) + regras de domínio e serviços financeiros (Bloco 05) implementados e testados, sem persistência real ainda. Extensões futuras (`recurrence_rules`, `installment_plans`, `category_budgets`, `period_status_history`) documentadas em `database/proposed-schema/extensoes-futuras.md`, não implementadas.
