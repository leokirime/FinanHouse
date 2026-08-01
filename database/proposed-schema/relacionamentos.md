# Relacionamentos — Schema Proposto

> Migrations: `database/migrations/0000_initial_financial_domain.sql` + `database/migrations/0001_responsible_member_household_integrity.sql`. Ambas aplicadas em `finanhouse_dev` (Aiven) — ver `Docs/02_architecture/decisoes_tecnicas.md`, DT-08 e DT-09. Não aplicadas em nenhum banco de produção.

## Diagrama textual

```
users ──< households (created_by_user_id, RESTRICT)
users ──< household_members (user_id, CASCADE)
users ──< monthly_periods (closed_by_user_id, SET NULL, opcional)
users ──< financial_entries (created_by_user_id, RESTRICT)

households ──< household_members (household_id, CASCADE)
households ──< categories (household_id, RESTRICT)
households ──< monthly_periods (household_id, RESTRICT)
households ──< financial_entries (household_id, RESTRICT)

household_members ──< financial_entries (responsible_member_id + responsible_member_household_id, RESTRICT, opcional — FK composta, DT-09)

categories ──< financial_entries (category_id + household_id, RESTRICT — FK composta)

monthly_periods ──< financial_entries (period_id + household_id, RESTRICT — FK composta)
```

## Tabela de chaves estrangeiras simples

| Origem | Coluna | Destino | ON DELETE | ON UPDATE |
|---|---|---|---|---|
| households | created_by_user_id | users.id | RESTRICT | NO ACTION |
| household_members | household_id | households.id | CASCADE | NO ACTION |
| household_members | user_id | users.id | CASCADE | NO ACTION |
| categories | household_id | households.id | RESTRICT | NO ACTION |
| monthly_periods | household_id | households.id | RESTRICT | NO ACTION |
| monthly_periods | closed_by_user_id | users.id | SET NULL | NO ACTION |
| financial_entries | household_id | households.id | RESTRICT | NO ACTION |
| financial_entries | created_by_user_id | users.id | RESTRICT | NO ACTION |

## Tabela de chaves estrangeiras compostas

Protegem, no próprio MySQL, que uma movimentação só use período/categoria/membro responsável do mesmo household.

| Origem (colunas) | Destino (colunas) | ON DELETE | ON UPDATE |
|---|---|---|---|
| financial_entries (period_id, household_id) | monthly_periods (id, household_id) | RESTRICT | NO ACTION |
| financial_entries (category_id, household_id) | categories (id, household_id) | RESTRICT | NO ACTION |
| financial_entries (responsible_member_id, responsible_member_household_id) | household_members (id, household_id) | RESTRICT | NO ACTION |

Exigem que `monthly_periods`, `categories` e `household_members` tenham uma constraint `UNIQUE(id, household_id)` — ver seção "Índices únicos" abaixo. Sem essa unique key composta, o MySQL rejeita a criação da foreign key composta (a referência precisa apontar para uma chave única existente na tabela de destino).

## `responsible_member_id` — FK composta com coluna auxiliar (DT-09, Bloco 13)

`financial_entries.household_id` é `NOT NULL`, e o MySQL/InnoDB proíbe declarar `ON DELETE SET NULL` em qualquer FK composta na qual alguma coluna referenciadora seja `NOT NULL` — uma FK composta direta `(responsible_member_id, household_id) → household_members(id, household_id)` com `SET NULL` seria rejeitada (o `SET NULL` exigiria zerar `household_id`, violando sua própria `NOT NULL`).

A solução adotada: uma coluna auxiliar nullable `financial_entries.responsible_member_household_id`, preenchida (pela camada de persistência) apenas quando `responsible_member_id` está definido, sempre com o valor de `household_id`. A FK composta referencia `(responsible_member_id, responsible_member_household_id)` — nenhuma das duas é `NOT NULL`. Uma `CHECK` (`financial_entries_responsible_member_household_check`) garante que a coluna auxiliar é nula exatamente quando `responsible_member_id` é nulo, e igual a `household_id` quando não é.

**Por que `RESTRICT`, não `SET NULL`, apesar da coluna auxiliar permitir tecnicamente `SET NULL`:** o MySQL 8 proíbe uma `CHECK` constraint referenciar qualquer coluna que também seja alvo de uma ação referencial que a modifica automaticamente (`SET NULL`/`CASCADE`) em uma foreign key — erro `3823`, `ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN`. Como `responsible_member_id` e `responsible_member_household_id` são referenciadas pela `CHECK` acima, `SET NULL` foi descoberto como incompatível com ela na prática (primeira tentativa real de aplicação falhou com esse erro). `RESTRICT` não modifica nenhuma coluna, então não conflita com a `CHECK`. Consequência: remover fisicamente um `household_member` ainda referenciado por alguma movimentação passa a ser bloqueado, em vez de limpar `responsible_member_id` automaticamente — sem impacto prático, já que `household_members` usa exclusão lógica (`status`/`removed_at`), nunca `DELETE` físico.

Alternativas avaliadas e rejeitadas: manter `SET NULL` e remover a `CHECK` (reabriria a lacuna que a correção existe para fechar); usar trigger para sincronizar a coluna auxiliar (vetado pelo escopo do Bloco 13); coluna gerada (`GENERATED ALWAYS AS`) (tem restrições próprias de interação com FKs de ação automática, não avaliada a fundo por RESTRICT+CHECK já resolver sem essa complexidade).

Esta era a pendência **P2** registrada nos feedbacks dos Blocos 03/04 — encerrada em 2026-07-31 (Bloco 13, DT-09).

## Índices únicos

| Tabela | Colunas | Motivo |
|---|---|---|
| users | email | um e-mail por usuário |
| household_members | household_id + user_id | um vínculo por par usuário/núcleo |
| household_members | id + household_id | alvo da FK composta de `financial_entries.responsible_member_id` (DT-09) |
| categories | household_id + entry_type + name | nome único por núcleo e tipo |
| categories | id + household_id | alvo da FK composta de `financial_entries.category_id` |
| monthly_periods | household_id + reference_month | uma competência por mês por núcleo |
| monthly_periods | id + household_id | alvo da FK composta de `financial_entries.period_id` |

## Índices simples (financial_entries)

`household_id`, `period_id`, `category_id`, `status`, `entry_type`, `due_date`, `realization_date` — todos indexados para suportar os filtros mais comuns (movimentações de um núcleo, de uma competência, por status, por vencimento/realização). Além disso, um índice composto `(responsible_member_id, responsible_member_household_id)` suporta a FK composta do membro responsável (DT-09).

## Validações que permanecem só na camada de serviço

- `created_by_user_id` (em `households` e `financial_entries`) e `closed_by_user_id` (em `monthly_periods`) pertencerem/serem membros do household relevante — decisão explícita de não modelar isso via FK composta nesta fundação, já que um usuário pode pertencer a múltiplos households.
- Preencher corretamente `responsible_member_household_id` ao criar/atualizar uma movimentação — a `CHECK` valida a consistência, mas quem escreve o valor é a camada de persistência (futuros repositórios Drizzle), nunca escrita manual fora dela.
