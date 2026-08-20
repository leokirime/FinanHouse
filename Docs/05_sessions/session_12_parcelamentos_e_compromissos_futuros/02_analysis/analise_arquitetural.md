# Análise Arquitetural

> Projeto: FinanHouse · Atualizado em: 2026-08-19

> Se esta sessão introduz ou altera uma decisão arquitetural, ela precisa estar refletida em `Docs/02_architecture/decisoes_tecnicas.md` ao final — esta análise é o raciocínio que leva até lá. Nenhuma DT nova é registrada ainda neste bloco (planejamento apenas) — será registrada quando a implementação real acontecer (Bloco 02/03).

## 1. Impactos na Arquitetura

A direção conceitual (levada pelo proprietário do projeto) foi confrontada com o código real desta sessão e **confirmada, sem alteração de fundo**: não criar um segundo motor financeiro — cada parcela continua sendo uma `FinancialEntry` comum, gerada em lote por um serviço de aplicação. Um novo agrupador (`InstallmentPlan`) referencia as parcelas geradas, mas nunca substitui nem duplica a lógica de status/competência já existente em `financial-entry-rules.ts`.

Nenhuma regra de domínio existente (`createFinancialEntry`, `realizeFinancialEntry`, `cancelFinancialEntry`, `assertFinancialEntryDeletable`) precisa mudar. O único código de domínio genuinamente novo é a **geração de parcelas** (divisão monetária + avanço de competência), que não existe hoje em nenhuma forma.

## 2. Componentes Novos ou Alterados

| Componente | Tipo de mudança | Justificativa |
|---|---|---|
| `packages/domain/src/installment/` (novo módulo: `generateInstallments`, regras de arredondamento/avanço de mês) | Novo | Nenhuma lógica equivalente existe — `packages/domain/src/money/money.ts` não tem uma função de divisão (`divideMoney`/`splitMoney`); `apps/web/src/utils/reference-month.ts` tem avanço de mês só no frontend, não no domínio (`@finanhouse/domain` é o único lugar correto para uma regra reutilizada por API e potencialmente scripts). |
| `financial_entries.installment_plan_id` (nullable), `financial_entries.installment_number` (nullable) | Alterado (schema) | Cada parcela precisa saber a que plano pertence e qual é sua posição (`3/10`) — sem isso, a UI não consegue agrupar/rotular. Nullable porque a maioria das movimentações não é parcelada. |
| `installment_plans` (nova tabela) | Novo | Agrupador do plano — descrição, valor total, número de parcelas, competência inicial, categoria, household, autoria. Segue o mesmo padrão de `category_budgets` (Bloco 18): FK simples para `households`, FK composta para `categories` (household match). |
| `InstallmentPlanRepository` (porta + Drizzle + memória) | Novo | Mesmo padrão de todo repositório já existente — mas com uma diferença importante: deve nascer **já usando `AUTO_INCREMENT` nativo via `insertId`** (nunca o padrão `nextId()` + `save()` insere-ou-atualiza usado por `financial_entries`/`monthly_periods`/`category_budgets`, identificado como dívida técnica P2 em DT-15). É a primeira tabela nova desde essa lição — não faz sentido repetir o padrão já sabido como arriscado. |
| `CreateInstallmentPlanService` (aplicação) | Novo | Orquestra: valida entrada, garante (idempotente, `ensurePeriod`) cada competência necessária, gera as N parcelas via domínio, persiste o plano e as `financial_entries` numa única operação. |
| Rota `POST /api/v1/households/:householdId/installment-plans` | Novo | Segue exatamente o padrão de `POST .../entries` (schema AJV, `createdByUserId` da sessão, nunca do corpo). |
| Frontend: formulário de parcelamento, indicador "N/Total" na lista de Movimentações | Novo | Reaproveita `EntryDialog`/`useMutationDialog`/`FinancialEntryList` — nenhuma infraestrutura de UI nova. |

## 3. Impacto em Contratos Existentes

- `Docs/03_contracts/contrato_api_http.md`: novo endpoint a documentar (`POST .../installment-plans`, possivelmente `GET .../installment-plans` para listagem). Nenhum endpoint existente muda de contrato — `POST .../entries` continua existindo para lançamentos avulsos, sem relação com parcelamento.
- `Docs/03_contracts/contrato_frontend_backend.md`: nova função em `apps/web/src/api/financial-api.ts` (`createInstallmentPlan`), nova ação em `FinanceAction`/`FinanceProvider` — mesmo padrão já usado por `CREATE_ENTRY`.
- `Docs/03_contracts/contrato_banco_dados.md`: nova tabela + duas colunas novas em `financial_entries` — a documentar no Bloco 03, junto da migration real.
- Nenhum contrato de autenticação (`contrato_autenticacao.md`) muda — parcelamento usa exatamente o mesmo gate de sessão/household de todas as outras rotas.

## 4. Impacto em Escalabilidade/Performance

Baixo. Pior caso razoável: um household com dezenas de parcelamentos de até ~60 parcelas cada (5 anos) — ainda uma fração pequena do volume de `financial_entries` já esperado para 2 usuários. A geração de N parcelas em lote (`INSERT` de N linhas + N chamadas idempotentes de `ensurePeriod`) é uma operação pontual (criação do plano), não recorrente a cada carregamento de tela — sem impacto nas consultas de leitura já existentes (`findByHousehold`, `findByPeriod`), que continuam iguais.

## 5. Perguntas Orientadoras

- **Esta mudança é reversível com baixo custo, ou é cara de desfazer depois?** As duas colunas nullable em `financial_entries` são reversíveis (nunca populadas para lançamentos avulsos, `DROP COLUMN` seguro se o recurso for abandonado). A tabela `installment_plans` é uma tabela nova isolada — remover é uma migration simples, sem efeito em dados existentes. Risco baixo.
- **Esta mudança contradiz alguma decisão arquitetural anterior registrada?** Não. Reforça DT-16 (parcela pode ser excluída como qualquer `financial_entry`) e corrige preventivamente o padrão de geração de id identificado como dívida em DT-15 (ao invés de repeti-lo numa tabela nova).

## 6. Decisões Pendentes

- `installment_plans.first_reference_month`: **decisão tomada nesta análise** — coluna de data solta (`DATE`, mesmo formato `YYYY-MM-01` de `monthly_periods.reference_month`), **não** uma FK para `monthly_periods`. Motivo: a competência da 10ª parcela de um plano de 10x aberto hoje pode não existir ainda como linha em `monthly_periods` no momento da criação do plano — precisar de uma FK obrigaria criar as 10 linhas de competência antecipadamente só para poder referenciá-las, mesmo antes de qualquer parcela daquele mês existir. Cada `financial_entry` gerada, por outro lado, **usa a FK composta normal** para seu próprio `period_id` (criado sob demanda via `ensurePeriod`, mesmo padrão já usado por `FinanceProvider`) — a garantia de integridade por competência continua existindo por parcela, só não no plano-agrupador.
- Geração de id do plano: `create()`/`insertId` desde o início (ver seção 2) — decisão já tomada, a aplicar no Bloco 03.

Nenhuma decisão arquitetural fica pendente para o Bloco 02. As decisões de produto (imutabilidade do plano, exclusão individual sem cascata, `dueDay` como campo do plano, `createdByUserId` só auditoria) estão fechadas em `02_analysis/analise_funcional.md`, seção 4.
