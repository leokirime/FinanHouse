# apps/api/src/infrastructure

Implementações concretas das portas definidas em `apps/api/src/application/ports/`.

- `repositories/memory/` — repositórios **em memória**, exclusivos para desenvolvimento e testes. Determinísticos, resetáveis (`reset()`), sem banco de dados, sem arquivos, sem credenciais.
- `repositories/drizzle/` — repositórios **reais**, sobre `apps/api/src/db/schema/` (Bloco 14, DT-10 em `Docs/02_architecture/decisoes_tecnicas.md`): `DrizzleFinancialEntryRepository`, `DrizzleMonthlyPeriodRepository`, `DrizzleCategoryRepository`, `DrizzleHouseholdMemberRepository`, mais a fábrica `createDrizzleRepositories(db)`. Recebem a instância Drizzle (ou uma `transaction`) por injeção de dependência — nunca abrem conexão própria nem são singleton. `mappers/` converte entre linhas do MySQL e entidades de domínio (dinheiro, datas, enums); `persistence-errors.ts` traduz erros do driver para uma hierarquia sanitizada (`PersistenceError`); `test-support/fake-drizzle-db.ts` é o double usado pelos próprios testes destes repositórios, nunca importado fora de testes. Validados por smoke-test transacional (`apps/api/scripts/db-smoke-repositories.ts`) contra `finanhouse_dev`, com rollback intencional e zero dado residual.

Não existe porta/repositório para `users`/`households` — nenhum serviço de aplicação hoje precisa persisti-los diretamente (lacuna registrada em DT-10, não uma decisão definitiva).
