# Relacionamentos — Schema Proposto

> Migration: `database/migrations/0000_initial_financial_domain.sql` (gerada, **não aplicada**).

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

household_members ──< financial_entries (responsible_member_id, SET NULL, opcional — FK simples)

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
| financial_entries | responsible_member_id | household_members.id | SET NULL | NO ACTION |
| financial_entries | created_by_user_id | users.id | RESTRICT | NO ACTION |

## Tabela de chaves estrangeiras compostas

Protegem, no próprio MySQL, que uma movimentação só use período/categoria do mesmo household.

| Origem (colunas) | Destino (colunas) | ON DELETE | ON UPDATE |
|---|---|---|---|
| financial_entries (period_id, household_id) | monthly_periods (id, household_id) | RESTRICT | NO ACTION |
| financial_entries (category_id, household_id) | categories (id, household_id) | RESTRICT | NO ACTION |

Exigem que `monthly_periods` e `categories` tenham uma constraint `UNIQUE(id, household_id)` — ver seção "Índices únicos" abaixo (`monthly_periods_id_household_id_unique`, `categories_id_household_id_unique`). Sem essa unique key composta, o MySQL rejeita a criação da foreign key composta (a referência precisa apontar para uma chave única existente na tabela de destino).

## Por que `responsible_member_id` não tem FK composta

O MySQL/InnoDB proíbe declarar `ON DELETE SET NULL` (ou `ON UPDATE SET NULL`) em qualquer foreign key composta na qual **qualquer uma das colunas referenciadoras seja `NOT NULL`**. Como `financial_entries.household_id` é `NOT NULL`, uma FK composta `(responsible_member_id, household_id) → household_members(id, household_id)` com `SET NULL` seria rejeitada pelo MySQL ao tentar aplicar a migration (o comportamento `SET NULL` exigiria zerar `household_id`, o que violaria sua própria constraint `NOT NULL`).

Alternativas avaliadas:
- **FK composta com RESTRICT em vez de SET NULL** — tecnicamente válida, mas mudaria o comportamento: hoje, remover um `household_member` limpa `responsible_member_id` automaticamente; com RESTRICT, a remoção seria bloqueada enquanto houver movimentações apontando para o membro. Não implementada nesta fundação para não alterar esse comportamento sem uma decisão explícita.
- **Manter FK simples (`responsible_member_id → household_members.id`, SET NULL)** — opção escolhida. A consistência "responsável pertence ao mesmo household da movimentação" não é garantida pelo banco para esta coluna; fica como responsabilidade da camada de serviço.

Registrado como pendência **P2** no feedback do Bloco 03 — decisão a revisitar quando a camada de serviço for implementada.

## Índices únicos

| Tabela | Colunas | Motivo |
|---|---|---|
| users | email | um e-mail por usuário |
| household_members | household_id + user_id | um vínculo por par usuário/núcleo |
| categories | household_id + entry_type + name | nome único por núcleo e tipo |
| categories | id + household_id | alvo da FK composta de `financial_entries.category_id` |
| monthly_periods | household_id + reference_month | uma competência por mês por núcleo |
| monthly_periods | id + household_id | alvo da FK composta de `financial_entries.period_id` |

## Índices simples (financial_entries)

`household_id`, `period_id`, `category_id`, `status`, `entry_type`, `due_date`, `realization_date` — todos indexados para suportar os filtros mais comuns (movimentações de um núcleo, de uma competência, por status, por vencimento/realização).

## Validações que permanecem só na camada de serviço

- `responsible_member_id` pertencer ao mesmo `household_id` (ver seção acima).
- `created_by_user_id` (em `households` e `financial_entries`) e `closed_by_user_id` (em `monthly_periods`) pertencerem/serem membros do household relevante — decisão explícita de não modelar isso via FK composta nesta fundação, já que um usuário pode pertencer a múltiplos households.
