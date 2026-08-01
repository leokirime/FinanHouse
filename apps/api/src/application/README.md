# apps/api/src/application

Camada de aplicação: orquestra as regras de domínio (`@finanhouse/domain`) com os repositórios, sem conter regra de negócio própria.

- `ports/` — interfaces de repositório (`FinancialEntryRepository`, `MonthlyPeriodRepository`, `CategoryRepository`, `HouseholdMemberRepository`). Não importam `mysql2`/`drizzle-orm` — são contratos puros.
- `services/` — um serviço por caso de uso (`CreateFinancialEntryService`, `CloseMonthlyPeriodService`, etc.), recebendo as dependências de repositório via interface no construtor. Erros de domínio (`DomainError` e subclasses) propagam sem tradução.

Implementações reais das portas (Drizzle/MySQL) existem desde o Bloco 14 (`apps/api/src/infrastructure/repositories/drizzle/`, DT-10) — validadas por smoke-test transacional contra `finanhouse_dev`. As implementações em memória (`apps/api/src/infrastructure/repositories/memory/`) continuam existindo e sendo usadas nos testes dos serviços de aplicação.
