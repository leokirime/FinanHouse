# Contrato de Banco de Dados

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Este contrato define o que o código pode assumir sobre o esquema do banco. Mudança de esquema sem migração registrada aqui é uma quebra de contrato.

> **Estado atual (2026-07-25):** o MySQL do Finanhouse **já existe** na Clever Cloud e **permanece vazio** no banco real — ver `database/current-schema/`. O Bloco 03 (`bloco_03_modelagem_inicial_do_dominio_financeiro`) modelou um **schema proposto** (Drizzle ORM, ver ADR-001) e gerou uma migration inicial revisável — nada disso foi aplicado ao banco. O modelo abaixo descreve o schema *proposto*, não o estado real. Ver `database/proposed-schema/` para a documentação completa.

## 1. Objetivo

Garantir que toda mudança de esquema seja intencional, registrada e reversível.

## 2. Responsabilidade

A camada de acesso a dados (Drizzle + mysql2) garante: integridade referencial via foreign keys (`RESTRICT` por padrão em registros financeiros; `CASCADE` apenas nas tabelas puramente associativas, como `household_members`), unicidade via índices únicos compostos, e tipos corretos (`DECIMAL(13,2)` para dinheiro, nunca `FLOAT`/`DOUBLE`). Desde o Bloco 03, o banco também garante via **foreign keys compostas** que `financial_entries.period_id` e `financial_entries.category_id` pertencem ao mesmo `household_id` da movimentação — não é mais responsabilidade exclusiva da aplicação (ver `database/proposed-schema/relacionamentos.md`). Permanece responsabilidade da aplicação: formato de e-mail; papéis/status permitidos (via constantes TypeScript + `CHECK` no banco); consistência entre `responsible_member_id` e `household_id` (o MySQL não permite `ON DELETE SET NULL` em FK composta com coluna `NOT NULL`, então esta relação específica não tem FK composta — ver pendência P2 no feedback do Bloco 03); consistência entre `created_by_user_id`/`closed_by_user_id` e o household (decisão explícita de manter na camada de serviço por ora).

## 3. Modelo de Dados — schema proposto (não aplicado)

Entidades principais, campos, tipos, relacionamentos. Fonte de verdade: `apps/api/src/db/schema/`. Documentação legível: `database/proposed-schema/modelo-logico.md`.

| Entidade | Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|---|
| users | id | BIGINT UNSIGNED AUTO_INCREMENT | Sim | PK |
| users | display_name | VARCHAR(120) | Sim | |
| users | email | VARCHAR(255) | Sim | único |
| users | status | VARCHAR(20) | Sim | `active`/`inactive`, CHECK |
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
| financial_entries | responsible_member_id | BIGINT UNSIGNED | Não | FK simples → household_members.id, SET NULL (não composta — ver seção 2) |
| financial_entries | created_by_user_id | BIGINT UNSIGNED | Sim | FK → users.id, RESTRICT (consistência com household não verificada no banco — camada de serviço) |
| financial_entries | entry_type | VARCHAR(10) | Sim | `income`/`expense`, CHECK |
| financial_entries | status | VARCHAR(10) | Sim | `planned`/`pending`/`realized`/`cancelled`, CHECK |
| financial_entries | description | VARCHAR(255) | Sim | |
| financial_entries | expected_amount | DECIMAL(13,2) | Sim | positivo |
| financial_entries | actual_amount | DECIMAL(13,2) | Não | nulo enquanto não realizado |
| financial_entries | due_date | DATE | Não | |
| financial_entries | realization_date | DATE | Não | data em que foi recebida (receita) ou paga (despesa) |
| financial_entries | notes | VARCHAR(500) | Não | |

Todas as tabelas têm `created_at`/`updated_at` (TIMESTAMP). Detalhes completos, índices e regras: `database/proposed-schema/`.

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
- A migration inicial (Bloco 03) foi gerada e revisada, mas **não aplicada** — o banco real permanece vazio.

## 9. Erros Esperados

Violação de constraint, deadlock, timeout de conexão — como cada caso deve ser tratado pela aplicação.

_..._

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
- **P2 — Verificação de TLS/SSL** entre a futura aplicação (Vercel) e o MySQL da Clever Cloud, antes da primeira migration real e antes de inserir qualquer dado real.
- **P2 — Aplicação da migration inicial**: depende de revisão final e autorização explícita do proprietário.
- Extensões futuras não modeladas ainda: `recurrence_rules`, `installment_plans`, `category_budgets`, `period_status_history` — ver `database/proposed-schema/extensoes-futuras.md`.
