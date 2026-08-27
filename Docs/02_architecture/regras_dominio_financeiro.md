# Regras do Domínio Financeiro

> Projeto: HouseManager · Gerado no Bloco 05 (`bloco_05_regras_de_dominio_e_servicos_financeiros`) · 2026-07-25

> Este documento descreve o **comportamento** implementado em `packages/domain/src/` e `apps/api/src/application/`. A fonte de verdade é sempre o código e seus testes — este documento explica o *porquê* das decisões, não repete o que já está óbvio no código.

## 1. Vocabulário

| Termo | Significado |
|---|---|
| Previsto (`expected`) | O que se espera receber/pagar — estável, não muda quando a movimentação é realizada. |
| Realizado (`realized`) | O que de fato aconteceu — só existe depois que a movimentação é confirmada. |
| Pendente (`pending`) | Confirmado, aguardando realização. |
| Planejado (`planned`) | Ainda não confirmado. |
| Projetado (`projected`) | Estimativa atual: realizado (valor real) + pendente + planejado (valor esperado, para o que ainda não aconteceu). |

## 2. Estados e Transições — Movimentações (`financial_entries`)

Estados: `planned`, `pending`, `realized`, `cancelled`.

```
planned ──markAsPending──► pending
planned ──realize────────► realized
planned ──cancel─────────► cancelled

pending ──realize────────► realized
pending ──cancel─────────► cancelled
pending ──correctToPlanned (explícito)──► planned

realized ──revertRealization (estorno explícito)──► pending

cancelled ──reactivate (explícito)──► planned
```

Cada seta é uma função nomeada em `packages/domain/src/financial-entry/financial-entry-rules.ts` — não existe uma função genérica "mudar status para X" que aceite qualquer origem. Isso é proposital: `realized → cancelled` não existe (é preciso estornar primeiro, via `revertFinancialEntryRealization`, depois cancelar); `pending → planned` e `cancelled → planned` só acontecem por ação humana explícita (correção/reativação), nunca como efeito colateral de outra operação.

### Por que essas restrições

- **`realized` não cancela diretamente**: uma movimentação já realizada representa dinheiro que já trocou de mãos. Cancelar sem passar pelo estorno explícito esconderia essa realidade.
- **Estorno limpa `actual_amount`/`realization_date`**: depois de `revertFinancialEntryRealization`, a movimentação volta a ser "pendente" sem dados de realização — evita que dados antigos fiquem "pendurados" incoerentes com o novo status.

## 3. Invariantes de Realização

Impostos por `assertFinancialEntryRealizationInvariants` (chamado ao final de toda função de regra):

- `status === 'realized'` ⇒ `actualAmount` e `realizationDate` **não podem ser nulos**.
- Qualquer outro status ⇒ `actualAmount` e `realizationDate` **devem ser nulos**.

## 4. Validações de Criação/Edição

- `expectedAmount` (e `actualAmount`, quando presente) devem ser estritamente positivos.
- `dueDate`/`realizationDate`, quando presentes, devem ser datas de calendário reais no formato `YYYY-MM-DD` (`2026-02-30` é rejeitado).
- A categoria deve estar `active` e ter o mesmo `entryType` da movimentação.
- O membro responsável, se informado, deve estar `active`.
- Período, categoria e membro devem pertencer ao mesmo `householdId` da movimentação (`HouseholdMismatchError`).
- Edição direta (`updateFinancialEntry`) só é permitida em `planned`/`pending` — `realized`/`cancelled` exigem as operações dedicadas.

## 5. Competência Mensal (`monthly_periods`)

Estados: `open`, `review`, `closed`.

```
open ──startReview──► review
review ──reopenFromReview──► open
review ──close──► closed
closed ──reopen (explícito)──► review
```

- **`open`**: cria e altera movimentações normalmente.
- **`review`**: bloqueia criação/edição comum (`PeriodInReviewError`), mas permite os "ajustes explícitos de revisão" — estorno, correção, reativação — via `allowReviewAdjustment: true`.
- **`closed`**: bloqueia tudo (`ClosedPeriodError`), inclusive ajustes de revisão.
- **Fechamento** (`closeMonthlyPeriod`) exige `status === 'review'` e valida, para cada movimentação informada: que pertence à competência (`periodId` bate) e que respeita os invariantes de realização. Isso é a "consistência dos totais" — se toda movimentação é válida, os totais calculados a partir delas também são.

## 6. Cálculos Financeiros (`summaries/monthly-summary.ts`)

Ver a documentação inline no código-fonte (`MonthlySummary`) para as fórmulas exatas. Resumo:

- **Previsto** soma `expectedAmount` de tudo que não está cancelado (inclui `realized`, porque o valor previsto original não muda quando algo é realizado).
- **Realizado** soma `actualAmount` só de `realized`.
- **Pendente**/**Planejado** somam `expectedAmount` de `pending`/`planned` respectivamente.
- **Saldo previsto** = receita prevista − despesa prevista.
- **Saldo realizado** = receita realizada − despesa realizada.
- **Saldo projetado** mistura: usa `actualAmount` para o que já foi `realized`, e `expectedAmount` para `pending`+`planned` — é a "melhor estimativa atual", diferente do saldo previsto (que ignora o valor real mesmo depois de realizado).
- **Cancelado** é somado à parte (`cancelledTotal`) e nunca entra em nenhum saldo.

## 7. Comparação Entre Meses (`summaries/compare-periods.ts`)

Todas as comparações de valor usam a métrica **realizada** (o que de fato aconteceu em cada mês) — é a base mais justa para comparar dois meses já ocorridos. `currentExpectedVsRealized` complementa isso mostrando quanto do previsto do mês atual ainda não foi realizado.

- Percentual de variação (`calculatePercentChange`) retorna `null` quando o período anterior é zero ("sem base comparável") — nunca `Infinity`/`NaN`.
- Arredondamento do percentual: os centavos (`bigint`) são convertidos para `number` só para essa divisão de exibição, arredondados a 2 casas decimais. Essa perda de precisão é aceitável porque o resultado nunca é persistido nem realimenta cálculo monetário algum.
- Categorias "novas"/"encerradas" comparam o conjunto de categorias de despesa com uso (não cancelado) em cada mês.

## 8. Estratégia Monetária (`money/money.ts`)

Dinheiro é sempre `bigint` em centavos internamente — nunca `number`/`float` em cálculo algum. Conversão para a string decimal (formato `DECIMAL(13,2)` usado pela persistência) só acontece nas bordas: `parseMoney`/`formatMoney`. `parseMoney` exige exatamente duas casas decimais e rejeita sinal — valores de domínio são sempre não negativos; o sinal (receita/despesa) vem de `entryType`, não do valor.

## 9. Erros de Domínio (`errors/domain-errors.ts`)

Toda regra de negócio violada lança uma subclasse tipada de `DomainError` (nunca uma `Error` genérica ou um retorno silencioso). A camada de aplicação (`apps/api/src/application/services/`) deixa esses erros propagarem — não os captura nem os traduz; um futuro endpoint HTTP é quem decide como apresentá-los.

## 10. Fronteira entre Domínio e Persistência

- `packages/domain/src/` não importa `mysql2`, `drizzle-orm`, nem nada de `apps/api/src/db/`. Os tipos de domínio (`FinancialEntry`, `MonthlyPeriod`, etc.) são deliberadamente parecidos com o schema Drizzle (Bloco 03), mas são definidos de forma independente.
- `apps/api/src/application/ports/` define as interfaces de repositório que o domínio precisa; `apps/api/src/infrastructure/repositories/memory/` implementa essas interfaces em memória, para testes e desenvolvimento.
- **O que falta para persistência real**: implementar `Drizzle*Repository` para cada porta, mapeando entre os tipos de domínio (`Money` como `bigint`) e o schema Drizzle (`string` para `DECIMAL`) — a conversão `parseMoney`/`formatMoney` é exatamente o que essa camada usará. Isso está bloqueado até a resolução de TLS (Bloco 04) e não foi implementado neste bloco.

## 11. O Que Ainda Não Existe

- `recurrence_rules`, `installment_plans`, `category_budgets`, `period_status_history` (ver `database/proposed-schema/extensoes-futuras.md`).
- Endpoints HTTP expondo os serviços de aplicação.
- Interface visual.
- Repositórios reais (Drizzle/MySQL) — hoje só existem os repositórios em memória.
- Autenticação/autorização — os serviços recebem `householdId`/`createdByUserId` como dados de entrada, sem verificar permissão alguma.
