# apps/api/src/application

Camada de aplicação: orquestra as regras de domínio (`@finanhouse/domain`) com os repositórios, sem conter regra de negócio própria.

- `ports/` — interfaces de repositório (`FinancialEntryRepository`, `MonthlyPeriodRepository`, `CategoryRepository`, `HouseholdMemberRepository`). Não importam `mysql2`/`drizzle-orm` — são contratos puros.
- `services/` — um serviço por caso de uso (`CreateFinancialEntryService`, `CloseMonthlyPeriodService`, etc.), recebendo as dependências de repositório via interface no construtor. Erros de domínio (`DomainError` e subclasses) propagam sem tradução.

Implementações reais das portas (Drizzle/MySQL) ainda não existem — hoje só há as implementações em memória (`apps/api/src/infrastructure/repositories/memory/`), usadas em desenvolvimento e testes.
