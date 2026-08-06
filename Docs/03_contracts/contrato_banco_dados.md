# Contrato de Banco de Dados

> Projeto: FinanHouse · Atualizado em: 2026-08-04

> Este contrato define o que o código pode assumir sobre o esquema do banco. Mudança de esquema sem migração registrada aqui é uma quebra de contrato.

> **Estado atual (2026-08-04):** a infraestrutura MySQL ativa do Finanhouse é o **Aiven for MySQL** (Bloco 11, DT-07 em `Docs/02_architecture/decisoes_tecnicas.md`) — a Clever Cloud (Bloco 02) deixou de ser a infraestrutura corrente e permanece apenas como registro histórico. Em 2026-07-31 (Bloco 12, DT-08), a migration inicial (`database/migrations/0000_initial_financial_domain.sql`) foi **aplicada ao banco real de desenvolvimento `finanhouse_dev`** — seis tabelas criadas, zero registros. Ainda em 2026-07-31 (Bloco 13, DT-09), uma migration incremental (`database/migrations/0001_responsible_member_household_integrity.sql`) corrigiu a integridade de `financial_entries.responsible_member_id`, agora protegida por FK composta (`ON DELETE RESTRICT`) + `CHECK` — journal do Drizzle (`__drizzle_migrations`) com **duas** migrations registradas, todas as tabelas continuam auditadas com **zero registros** (nenhum seed executado, nenhum dado real inserido). Ainda em 2026-07-31 (Bloco 14, DT-10), os repositórios Drizzle reais (`apps/api/src/infrastructure/repositories/drizzle/`) foram implementados, validados por smoke-test transacional com rollback e integrados às portas já existentes — a camada de persistência real está concluída; nenhum dado real ou sintético permanece no banco. Em 2026-08-04 (Bloco 18, DT-13), uma nova migration incremental (`database/migrations/0002_category_budgets.sql`) foi gerada, revisada (`drizzle-kit check`) e, com autorização explícita do proprietário, **aplicada ao banco real de desenvolvimento `finanhouse_dev`** — sétima tabela (`category_budgets`) criada, journal com três migrations registradas, zero registros na tabela nova e contagens das seis tabelas anteriores preservadas. Em 2026-08-04 (Bloco 19, DT-14), uma nova migration incremental (`database/migrations/0003_auth_sessions.sql`) foi gerada e revisada (`drizzle-kit check`) para autenticação real (`users.password_hash`/`password_configured_at` + tabela `auth_sessions`) — **pendente de aplicação**, condicionada a autorização explícita do proprietário via checkpoint do Bloco 19. Produção (`finanhouse_prod`) continua inexistente. Ver `database/proposed-schema/` para a documentação completa e DT-08/DT-09/DT-10/DT-13/DT-14 para o registro das decisões.

> **Nota de reconciliação — Clever Cloud → Aiven (2026-07-30):** a Clever Cloud foi usada apenas para diagnóstico (Blocos 02–04); seu banco estava vazio, nenhuma migration foi aplicada e nenhum dado do Finanhouse foi persistido nela. Uma conexão criptografada **foi observada** lá em modo permissivo (`rejectUnauthorized: false`), mas a validação estrita de identidade não era suportada adequadamente — segundo informação fornecida pelo proprietário, o certificado usava uma CA autoassinada por instância, sem SAN apropriado, com o CN não correspondendo ao hostname usado na conexão. A Clever Cloud saiu da arquitetura ativa (DT-07); o Aiven é o provedor ativo. Nenhuma conexão com o Aiven havia sido realizada antes da evidência operacional de 2026-07-30 registrada acima.

## 1. Objetivo

Garantir que toda mudança de esquema seja intencional, registrada e reversível.

## 2. Responsabilidade

A camada de acesso a dados (Drizzle + mysql2) garante: integridade referencial via foreign keys (`RESTRICT` por padrão em registros financeiros; `CASCADE` apenas nas tabelas puramente associativas, como `household_members`), unicidade via índices únicos compostos, e tipos corretos (`DECIMAL(13,2)` para dinheiro, nunca `FLOAT`/`DOUBLE`). Desde o Bloco 03, o banco também garante via **foreign keys compostas** que `financial_entries.period_id` e `financial_entries.category_id` pertencem ao mesmo `household_id` da movimentação. Desde o Bloco 13 (DT-09), o banco garante do mesmo modo que `financial_entries.responsible_member_id` pertence ao mesmo `household_id` — via uma coluna auxiliar nullable `responsible_member_household_id`, uma FK composta `(responsible_member_id, responsible_member_household_id) → household_members(id, household_id)` com `ON DELETE RESTRICT`, e uma `CHECK` que mantém a coluna auxiliar sincronizada com `household_id` (`SET NULL` direto não é possível: o MySQL proíbe uma `CHECK` referenciar coluna também modificada por `SET NULL`/`CASCADE` em FK — ver `database/proposed-schema/relacionamentos.md`). Nenhuma dessas três relações é mais responsabilidade exclusiva da aplicação. Permanece responsabilidade da aplicação: formato de e-mail; papéis/status permitidos (via constantes TypeScript + `CHECK` no banco); preencher `responsible_member_household_id` corretamente na camada de persistência (a `CHECK` valida, mas quem escreve o valor é o repositório); consistência entre `created_by_user_id`/`closed_by_user_id` e o household (decisão explícita de manter na camada de serviço por ora).

## 3. Modelo de Dados — aplicado em `finanhouse_dev` (Aiven), não aplicado em produção

Entidades principais, campos, tipos, relacionamentos. Fonte de verdade: `apps/api/src/db/schema/`. Documentação legível: `database/proposed-schema/modelo-logico.md`.

| Entidade | Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|---|
| users | id | BIGINT UNSIGNED AUTO_INCREMENT | Sim | PK |
| users | display_name | VARCHAR(120) | Sim | |
| users | email | VARCHAR(255) | Sim | único |
| users | status | VARCHAR(20) | Sim | `active`/`inactive`, CHECK |
| users ⚠️ | password_hash | VARCHAR(255) | Não | hash Argon2id; nulo até a senha ser configurada (DT-14, migration `0003` pendente) |
| users ⚠️ | password_configured_at | TIMESTAMP | Não | preenchido junto com `password_hash` |
| households | id | BIGINT UNSIGNED AUTO_INCREMENT | Sim | PK |
| households | name | VARCHAR(120) | Sim | |
| households | currency_code | VARCHAR(3) | Sim | default `BRL` (conceitual, não inserido) |
| households | timezone | VARCHAR(64) | Sim | default `America/Sao_Paulo` (conceitual) |
| households | created_by_user_id | BIGINT UNSIGNED | Sim | FK → users.id, RESTRICT |
| household_members | id | BIGINT UNSIGNED AUTO_INCREMENT | Sim | PK |
| household_members | household_id | BIGINT UNSIGNED | Sim | FK → households.id, CASCADE |
| household_members | user_id | BIGINT UNSIGNED | Sim | FK → users.id, CASCADE |
| household_members | role | VARCHAR(20) | Sim | `owner`/`member`, CHECK |
| household_members | status | VARCHAR(20) | Sim | `active`/`inactive`, CHECK |
| household_members | joined_at | TIMESTAMP | Sim | |
| household_members | removed_at | TIMESTAMP | Não | nulo enquanto ativo |
| categories | id | BIGINT UNSIGNED AUTO_INCREMENT | Sim | PK |
| categories | household_id | BIGINT UNSIGNED | Sim | FK → households.id, RESTRICT |
| categories | name | VARCHAR(80) | Sim | único por household+entry_type |
| categories | entry_type | VARCHAR(10) | Sim | `income`/`expense`, CHECK |
| categories | status | VARCHAR(20) | Sim | `active`/`inactive`, CHECK |
| monthly_periods | id | BIGINT UNSIGNED AUTO_INCREMENT | Sim | PK |
| monthly_periods | household_id | BIGINT UNSIGNED | Sim | FK → households.id, RESTRICT |
| monthly_periods | reference_month | DATE | Sim | dia 1 do mês; único por household |
| monthly_periods | status | VARCHAR(10) | Sim | `open`/`review`/`closed`, CHECK |
| monthly_periods | closed_at | TIMESTAMP | Não | |
| monthly_periods | closed_by_user_id | BIGINT UNSIGNED | Não | FK → users.id, SET NULL |
| financial_entries | id | BIGINT UNSIGNED AUTO_INCREMENT | Sim | PK |
| financial_entries | household_id | BIGINT UNSIGNED | Sim | FK → households.id, RESTRICT |
| financial_entries | period_id | BIGINT UNSIGNED | Sim | FK composta (period_id, household_id) → monthly_periods(id, household_id), RESTRICT |
| financial_entries | category_id | BIGINT UNSIGNED | Sim | FK composta (category_id, household_id) → categories(id, household_id), RESTRICT |
| financial_entries | responsible_member_id | BIGINT UNSIGNED | Não | FK composta (responsible_member_id, responsible_member_household_id) → household_members(id, household_id), RESTRICT (DT-09) |
| financial_entries | responsible_member_household_id | BIGINT UNSIGNED | Não | espelha household_id quando responsible_member_id está preenchido; CHECK garante a sincronia (DT-09) |
| financial_entries | created_by_user_id | BIGINT UNSIGNED | Sim | FK → users.id, RESTRICT (consistência com household não verificada no banco — camada de serviço) |
| financial_entries | entry_type | VARCHAR(10) | Sim | `income`/`expense`, CHECK |
| financial_entries | status | VARCHAR(10) | Sim | `planned`/`pending`/`realized`/`cancelled`, CHECK |
| financial_entries | description | VARCHAR(255) | Sim | |
| financial_entries | expected_amount | DECIMAL(13,2) | Sim | positivo |
| financial_entries | actual_amount | DECIMAL(13,2) | Não | nulo enquanto não realizado |
| financial_entries | due_date | DATE | Não | |
| financial_entries | realization_date | DATE | Não | data em que foi recebida (receita) ou paga (despesa) |
| financial_entries | notes | VARCHAR(500) | Não | |
| category_budgets | id | BIGINT UNSIGNED AUTO_INCREMENT | Sim | PK |
| category_budgets | household_id | BIGINT UNSIGNED | Sim | FK → households.id, RESTRICT |
| category_budgets | period_id | BIGINT UNSIGNED | Sim | FK composta (period_id, household_id) → monthly_periods(id, household_id), RESTRICT |
| category_budgets | category_id | BIGINT UNSIGNED | Sim | FK composta (category_id, household_id) → categories(id, household_id), RESTRICT |
| category_budgets | limit_amount | DECIMAL(13,2) | Sim | positivo, CHECK |
| category_budgets | — | — | — | índice único composto (household_id, period_id, category_id); tipo/status de categoria (`expense`/`active`) validados na aplicação, não no banco (DT-13) |
| auth_sessions ⚠️ | id | BIGINT UNSIGNED AUTO_INCREMENT | Sim | PK |
| auth_sessions ⚠️ | user_id | BIGINT UNSIGNED | Sim | FK → users.id, RESTRICT |
| auth_sessions ⚠️ | household_id | BIGINT UNSIGNED | Sim | FK → households.id, RESTRICT |
| auth_sessions ⚠️ | token_hash | VARCHAR(64) | Sim | SHA-256 hex do token de sessão, único — nunca o token bruto (DT-14) |
| auth_sessions ⚠️ | expires_at | TIMESTAMP | Sim | 7 dias após a criação |
| auth_sessions ⚠️ | revoked_at | TIMESTAMP | Não | preenchido no logout |
| auth_sessions ⚠️ | last_used_at | TIMESTAMP | Não | atualizado a cada validação de sessão bem-sucedida |
| auth_sessions ⚠️ | — | — | — | índices em `user_id`, `expires_at`, único em `token_hash`; vínculo do usuário com o household validado na aplicação, não por FK (DT-14) |

Todas as tabelas têm `created_at`/`updated_at` (TIMESTAMP), exceto `auth_sessions` (só `created_at`, sem `updated_at` — `last_used_at`/`revoked_at` cobrem as mutações relevantes). Detalhes completos, índices e regras: `database/proposed-schema/`. `category_budgets` aplicada a `finanhouse_dev` em 2026-08-04 (Bloco 18, DT-13). ⚠️ = `users.password_hash`/`password_configured_at` e `auth_sessions` definidos em `apps/api/src/db/schema/` e migration `0003_auth_sessions.sql` gerada/revisada, mas **ainda não aplicados** a `finanhouse_dev` — não assumir sua presença até a aplicação ser confirmada (ver seção 8).

## 4. Inputs

O que a aplicação envia ao persistir (formato esperado antes da gravação, validações de domínio aplicadas antes do INSERT/UPDATE).

_..._

## 5. Outputs

O que uma consulta retorna, incluindo casos de ausência (registro não encontrado é `null`, lista vazia, ou exceção?).

_..._

## 6. Formatos Esperados

- IDs: `BIGINT UNSIGNED AUTO_INCREMENT`.
- Dinheiro: `DECIMAL(13,2)`, nunca `FLOAT`/`DOUBLE`; Drizzle mantém como `string` em TypeScript para evitar perda de precisão na fronteira JS.
- `reference_month`, `due_date`, `realization_date`: `DATE` (não texto livre).
- Timestamps técnicos (`created_at`, `updated_at`, `joined_at`, `closed_at`, `removed_at`): `TIMESTAMP`, armazenados em UTC; timezone de apresentação vem da configuração do household (`households.timezone`).
- Sem soft delete genérico: categorias e membros usam campo `status` (`active`/`inactive`) em vez de exclusão física; `financial_entries` usa `status` de ciclo de vida (`planned`/`pending`/`realized`/`cancelled`), não exclusão. `realized` cobre tanto receita recebida quanto despesa paga — vocabulário neutro entre os dois tipos de movimentação.

## 7. Regras Obrigatórias

- [ ] Toda migração é reversível ou tem plano de rollback documentado.
- [ ] Nenhuma coluna obrigatória é adicionada em tabela com dados existentes sem valor padrão ou backfill.
- [ ] _..._

## 8. Migrações

Ferramenta: `drizzle-kit` (config em `apps/api/drizzle.config.ts`). Migrations SQL versionadas em `database/migrations/`, geradas a partir do schema TypeScript em `apps/api/src/db/schema/` via `drizzle-kit generate` (comando estático, não conecta ao banco).

- **Permitido:** `drizzle-kit generate` (gera SQL revisável), `drizzle-kit check` (valida consistência das migrations).
- **Proibido em qualquer ambiente:** `drizzle-kit push` (sincronização automática de schema).
- **Proibido sem autorização explícita do proprietário:** `drizzle-kit migrate` (aplica migrations ao banco real).
- Toda migration gerada é revisada manualmente (tabelas, índices, constraints, FKs, regras ON DELETE/UPDATE, ausência de comandos destrutivos) antes de qualquer aplicação futura.
- A migration inicial (Bloco 03) foi gerada, revisada e **aplicada ao banco real de desenvolvimento (`finanhouse_dev`) em 2026-07-31** (Bloco 12, DT-08) — as seis tabelas existem, sem dados. Produção continua sem nenhuma migration aplicada.
- `0002_category_budgets.sql` (Bloco 18, DT-13) foi gerada e revisada (`drizzle-kit check`: "Everything's fine") em 2026-08-04 e, com autorização explícita do proprietário, **aplicada ao banco real de desenvolvimento (`finanhouse_dev`) na mesma data** — `__drizzle_migrations` agora com três migrations registradas. Produção continua sem nenhuma migration aplicada.
- `0003_auth_sessions.sql` (Bloco 19, DT-14) foi gerada e revisada (`drizzle-kit check`: "Everything's fine") em 2026-08-04 — **não aplicada** a nenhum ambiente; aguarda autorização explícita do proprietário via checkpoint do Bloco 19. Só adiciona colunas/tabela (`users.password_hash`/`password_configured_at`, `auth_sessions`); nunca configura senha nem cria sessão — isso é responsabilidade de `db-configure-initial-passwords.ts`, com autorização própria e separada.

## 9. Erros Esperados

Desde o Bloco 14 (DT-10), `apps/api/src/infrastructure/repositories/drizzle/persistence-errors.ts` traduz todo erro de driver (mysql2/Drizzle) capturado pelos repositórios reais para uma hierarquia sanitizada de `PersistenceError`, nunca propagando o objeto bruto do mysql2, host, porta, usuário, senha, Service URI ou query com valores sensíveis:

| Situação | Código mysql2 reconhecido | Classe traduzida |
|---|---|---|
| Chave única duplicada | `ER_DUP_ENTRY` | `DuplicateRecordError` |
| Referência a registro inexistente | `ER_NO_REFERENCED_ROW_2` / `ER_NO_REFERENCED_ROW` | `ForeignKeyViolationError` |
| Registro ainda referenciado (exclusão bloqueada) | `ER_ROW_IS_REFERENCED_2` / `ER_ROW_IS_REFERENCED` | `ForeignKeyViolationError` |
| Violação de `CHECK` | `ER_CHECK_CONSTRAINT_VIOLATED` | `CheckConstraintViolationError` |
| Violação das FKs/CHECK compostas de isolamento por household (período, categoria ou membro responsável de outro household) | `ER_NO_REFERENCED_ROW_2`/`ER_CHECK_CONSTRAINT_VIOLATED` cujo texto cita uma das constraints compostas | `HouseholdScopeViolationError` |
| Timeout de bloqueio | `ER_LOCK_WAIT_TIMEOUT` | `DatabaseTimeoutError` |
| Falha de conexão (host/DNS/TLS) | reaproveita `categorizeConnectionError` (`apps/api/src/db/sanitize-error.ts`, mesma função usada pelos scripts desde o Bloco 13) | `DatabaseConnectionError` / `DatabaseTimeoutError` |
| Valor de enum/status fora das constantes conhecidas do domínio | — (validação própria, não erro de driver) | `UnexpectedPersistedValueError` |
| Qualquer outro erro não reconhecido | — | `UnexpectedPersistenceError` |

O Drizzle envolve todo erro de query real em `DrizzleQueryError` (mensagem `"Failed query: ... params: ..."`, sem `code`/`sqlMessage` diretamente nela) — o erro do driver mysql2 fica em `.cause`; a tradução desembrulha esse nível antes de classificar. O erro original (com o `code` do driver) fica disponível apenas em `PersistenceError.cause`, nunca na `message` pública — não deve ser logado/impresso por quem consome os repositórios.

## 10. Validações

O que é validado no banco (constraints, triggers) versus o que é validado só na aplicação.

_..._

## 11. Versionamento do Contrato

Como uma mudança de esquema breaking é comunicada e coordenada com o deploy da aplicação que a usa.

_..._

## 12. Decisões Pendentes

- ~~Realizar inspeção somente leitura do MySQL existente na Clever Cloud~~ — **concluído em 2026-07-25**, banco confirmado vazio.
- ~~Biblioteca de acesso ao MySQL e estratégia de migrations~~ — **decidido em 2026-07-25**: Drizzle + mysql2 (ADR-001).
- ~~Modelar o schema inicial~~ — **proposto em 2026-07-25** (Bloco 03): 6 tabelas, migration gerada e revisada, **ainda não aplicada**.
- ~~Decidir o provedor de infraestrutura MySQL ativo~~ — **decidido em 2026-07-27** (Bloco 11, DT-07): Aiven for MySQL substitui a Clever Cloud; configuração, TLS/CA e scripts preparados. Conexão real validada em 2026-07-30 (ver item de TLS abaixo).
- ~~P2 — Verificação de TLS/SSL~~ — **encerrada em 2026-07-30**: `db:check` executado manualmente pelo proprietário contra o Aiven (`apps/api/scripts/db-check.ts`) confirmou provider `aiven`, ambiente `development`, banco `finanhouse_dev`, usuário de aplicação `finanhouse_dev_app`, MySQL `8.4.8`, conectividade bem-sucedida, banco ativo correspondente ao configurado e TLS ativo — com CA oficial do serviço, `DATABASE_SSL_MODE=verify_identity`, `rejectUnauthorized: true` e verificação padrão de hostname preservados. Nenhuma migration foi aplicada, nenhum seed foi executado, nenhuma tabela foi criada durante essa verificação. Evidência operacional registrada no feedback do Bloco 11.
- ~~P2 — Aplicação da migration inicial~~ — **encerrada em 2026-07-31** (Bloco 12, DT-08): `db:migrate` executado uma única vez contra `finanhouse_dev`, com autorização explícita do proprietário; auditoria pós-migration confirmou as seis tabelas, journal com uma migration registrada e zero registros em todas as tabelas. Persistência real completa (repositórios Drizzle, endpoints de API, integração do frontend) continua pendente — ver RF-05.
- ~~P2 — `financial_entries.responsible_member_id` sem FK composta protegendo consistência com household (Blocos 03/04)~~ — **encerrada em 2026-07-31** (Bloco 13, DT-09): migration incremental `0001_responsible_member_household_integrity.sql` aplicada com sucesso a `finanhouse_dev` (segunda tentativa, após recuperação de um estado parcial causado pelo erro MySQL 3823 na primeira — ver DT-09). FK composta com `ON DELETE RESTRICT` + `CHECK` de consistência; journal com duas migrations registradas; zero registros em todas as tabelas.
- ~~Implementar repositórios Drizzle reais para as portas já existentes~~ — **encerrada em 2026-07-31** (Bloco 14, DT-10): `DrizzleFinancialEntryRepository`, `DrizzleMonthlyPeriodRepository`, `DrizzleCategoryRepository`, `DrizzleHouseholdMemberRepository` implementados e validados por smoke-test transacional (rollback intencional, zero dado residual). Endpoints de API HTTP e integração do frontend continuam pendentes — ver RF-05.
- ~~`category_budgets` (limites mensais por categoria)~~ — **encerrada em 2026-08-04** (Bloco 18, DT-13): migration `0002_category_budgets.sql` aplicada a `finanhouse_dev` com autorização explícita do proprietário; auditoria pós-migration e smoke-test transacional (`db-smoke-category-budgets.ts`) aprovados, zero dado residual.
- `users.password_hash`/`password_configured_at` + `auth_sessions` (autenticação real) — **modelados e migration gerada em 2026-08-04** (Bloco 19, DT-14); aplicação a `finanhouse_dev` pendente de autorização explícita do proprietário (checkpoint do Bloco 19); configuração das senhas iniciais pendente de uma segunda autorização separada (`db-configure-initial-passwords.ts`).
- Extensões futuras não modeladas ainda: `recurrence_rules`, `installment_plans`, `period_status_history` — ver `database/proposed-schema/extensoes-futuras.md`.
