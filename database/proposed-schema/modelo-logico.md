# Modelo Lógico — Schema Proposto

> Gerado no Bloco 03 · Migration: `database/migrations/0000_initial_financial_domain.sql` (gerada, **não aplicada**) · Estado real do banco: vazio (`database/current-schema/`).

## Visão geral

Seis tabelas cobrem a fundação do domínio financeiro do Finanhouse: quem usa o sistema (`users`), o núcleo doméstico compartilhado (`households`, `household_members`), como as movimentações são categorizadas (`categories`), a competência mensal (`monthly_periods`) e as movimentações em si (`financial_entries`).

## users

Representa os perfis que utilizarão o Finanhouse (proprietário e esposa, inicialmente).

| Campo | Tipo | Regra |
|---|---|---|
| id | BIGINT UNSIGNED AUTO_INCREMENT | PK |
| display_name | VARCHAR(120) | obrigatório |
| email | VARCHAR(255) | obrigatório, único |
| status | VARCHAR(20) | `active`/`inactive`, CHECK |
| created_at / updated_at | TIMESTAMP | auditoria |

Sem senha nesta tabela — autenticação é responsabilidade de um bloco próprio, ainda não modelado. Nenhum usuário é criado ou inserido neste bloco.

## households

Representa o núcleo financeiro doméstico compartilhado (a "casa" do Finanhouse).

| Campo | Tipo | Regra |
|---|---|---|
| id | BIGINT UNSIGNED AUTO_INCREMENT | PK |
| name | VARCHAR(120) | obrigatório |
| currency_code | VARCHAR(3) | default conceitual `BRL` |
| timezone | VARCHAR(64) | default conceitual `America/Sao_Paulo` |
| created_by_user_id | BIGINT UNSIGNED | FK → users.id, RESTRICT |
| created_at / updated_at | TIMESTAMP | auditoria |

Os defaults de moeda/timezone são conceituais (definidos no schema) — nenhum dado é inserido neste bloco.

## household_members

Relaciona usuários ao núcleo doméstico — tabela puramente associativa.

| Campo | Tipo | Regra |
|---|---|---|
| id | BIGINT UNSIGNED AUTO_INCREMENT | PK |
| household_id | BIGINT UNSIGNED | FK → households.id, CASCADE |
| user_id | BIGINT UNSIGNED | FK → users.id, CASCADE |
| role | VARCHAR(20) | `owner`/`member`, CHECK |
| status | VARCHAR(20) | `active`/`inactive`, CHECK |
| joined_at | TIMESTAMP | obrigatório |
| removed_at | TIMESTAMP | nulo enquanto ativo |

`household_id + user_id` é único (uma pessoa não pode ter dois vínculos ativos com o mesmo núcleo).

## categories

Categorias de receitas e despesas, por núcleo doméstico.

| Campo | Tipo | Regra |
|---|---|---|
| id | BIGINT UNSIGNED AUTO_INCREMENT | PK |
| household_id | BIGINT UNSIGNED | FK → households.id, RESTRICT |
| name | VARCHAR(80) | obrigatório |
| entry_type | VARCHAR(10) | `income`/`expense`, CHECK |
| status | VARCHAR(20) | `active`/`inactive`, CHECK |
| created_at / updated_at | TIMESTAMP | auditoria |

`household_id + entry_type + name` é único. Categorias já usadas por movimentações não são excluídas fisicamente — o status vira `inactive`. `(id, household_id)` também é único — necessário como alvo da foreign key composta de `financial_entries` (ver seção "Integridade entre household e movimentação").

## monthly_periods

Cada competência mensal de um núcleo doméstico.

| Campo | Tipo | Regra |
|---|---|---|
| id | BIGINT UNSIGNED AUTO_INCREMENT | PK |
| household_id | BIGINT UNSIGNED | FK → households.id, RESTRICT |
| reference_month | DATE | primeiro dia do mês (ex.: `2026-07-01`) |
| status | VARCHAR(10) | `open`/`review`/`closed`, CHECK |
| closed_at | TIMESTAMP | nulo até o fechamento |
| closed_by_user_id | BIGINT UNSIGNED | FK → users.id, SET NULL |
| created_at / updated_at | TIMESTAMP | auditoria |

`household_id + reference_month` é único. `(id, household_id)` também é único — necessário como alvo da foreign key composta de `financial_entries` (ver seção "Integridade entre household e movimentação"). O fluxo completo de fechamento/reabertura é responsabilidade de um bloco futuro — aqui só o campo `status` e os metadados de fechamento existem.

## financial_entries

Receitas e despesas previstas ou realizadas.

| Campo | Tipo | Regra |
|---|---|---|
| id | BIGINT UNSIGNED AUTO_INCREMENT | PK |
| household_id | BIGINT UNSIGNED | FK → households.id, RESTRICT |
| period_id | BIGINT UNSIGNED | FK composta (period_id, household_id) → monthly_periods(id, household_id), RESTRICT |
| category_id | BIGINT UNSIGNED | FK composta (category_id, household_id) → categories(id, household_id), RESTRICT |
| responsible_member_id | BIGINT UNSIGNED | FK simples → household_members.id, SET NULL, opcional (não composta — ver abaixo) |
| created_by_user_id | BIGINT UNSIGNED | FK → users.id, RESTRICT |
| entry_type | VARCHAR(10) | `income`/`expense`, CHECK |
| status | VARCHAR(10) | `planned`/`pending`/`realized`/`cancelled`, CHECK |
| description | VARCHAR(255) | obrigatório |
| expected_amount | DECIMAL(13,2) | obrigatório, > 0 (CHECK) |
| actual_amount | DECIMAL(13,2) | opcional, nulo ou > 0 (CHECK) |
| due_date | DATE | opcional |
| realization_date | DATE | opcional — data em que foi recebida (receita) ou paga (despesa) |
| notes | VARCHAR(500) | opcional |
| created_at / updated_at | TIMESTAMP | auditoria |

### Integridade entre household e movimentação

`period_id` e `category_id` são protegidos por **foreign keys compostas** — `(period_id, household_id)` referenciando `monthly_periods(id, household_id)`, e `(category_id, household_id)` referenciando `categories(id, household_id)`. Isso impede, no próprio MySQL, que uma movimentação use um período ou categoria de outro núcleo doméstico — não depende apenas da aplicação se comportar corretamente.

`responsible_member_id` **não** tem FK composta equivalente: o MySQL proíbe `ON DELETE SET NULL` em qualquer foreign key composta que inclua uma coluna `NOT NULL` (`household_id` é `NOT NULL`), então uma FK composta `(responsible_member_id, household_id)` com `SET NULL` seria rejeitada pelo banco. A consistência "responsável pertence ao mesmo household" para esta coluna permanece responsabilidade da camada de serviço — registrado como pendência P2 no feedback do Bloco 03.

`created_by_user_id` e `closed_by_user_id` (em `monthly_periods`) também não têm validação de household no banco — decisão explícita de manter na camada de serviço por ora, já que um usuário pode pertencer a múltiplos households e a modelagem de "member" já cobre o vínculo usuário↔household.

## Distinção previsto vs. realizado

`expected_amount` é sempre preenchido (o que se espera receber/pagar). `actual_amount` e `realization_date` só são preenchidos quando a movimentação é de fato realizada (`status = 'realized'`) — nulos enquanto `status` é `planned` ou `pending`. `realized` é o termo neutro entre "recebido" (receita) e "pago" (despesa), escolhido para não presumir apenas o vocabulário de despesas.

## Estratégia de dinheiro

Todo valor monetário é `DECIMAL(13,2)`, nunca `FLOAT`/`DOUBLE` (evita erro de arredondamento). Em TypeScript, o Drizzle mantém esses campos como `string` na fronteira de persistência, evitando a conversão automática para `number` que poderia perder precisão.

## Estratégia de datas

- `reference_month`, `due_date`, `realization_date`: `DATE` (não texto livre).
- Timestamps técnicos (`created_at`, `updated_at`, etc.): `TIMESTAMP`, armazenados em UTC.
- Timezone de apresentação: vem da configuração do household (`households.timezone`), não de cada linha.

## Política de exclusão

- `RESTRICT` em todas as FKs (simples e compostas) que apontam para registros financeiros ou suas dependências diretas (households, categories, monthly_periods, financial_entries, users quando referenciado como criador).
- `CASCADE` apenas em `household_members` (tabela puramente associativa) — remover um household ou um user remove os vínculos, não os dados financeiros.
- `SET NULL` nas referências opcionais de coluna única (`monthly_periods.closed_by_user_id`, `financial_entries.responsible_member_id`) — nenhuma delas é composta, por isso `SET NULL` é permitido pelo MySQL.
- Categorias e membros preferem status `inactive` a exclusão física.
