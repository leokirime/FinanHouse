# Bloco 02 — Domínio e geração das parcelas

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-20

## 1. Objetivo

Implementar, em `packages/domain` (domínio puro, sem persistência/API/frontend), a divisão monetária sem perda de centavos, o avanço de competência por ano/mês, a resolução de vencimento e a geração das N parcelas conceituais de um `InstallmentPlan` — o primeiro código real de parcelamentos desta sessão.

## 2. Contexto

O Bloco 01 (`05_blocks/bloco_01_planejamento_funcional_e_contratos_de_parcelamentos.md`, integrado à `main` em `3dbb5e7`) fechou RF-10 e todas as decisões de MVP necessárias para começar a implementar: `InstallmentPlan` como agrupador, `firstReferenceMonth` como data solta, `installmentCount`/plano imutáveis, `dueDay` como campo **obrigatório** do plano, `createdAt` como campo do plano, arredondamento com a última parcela absorvendo o resto, e as 15 invariantes de domínio (`02_analysis/analise_tecnica.md`, seção 7).

**Correção pós-revisão (antes de qualquer commit):** a primeira implementação deste bloco divergiu do contrato em dois pontos, identificados na revisão do proprietário do projeto: (1) `createInstallmentPlan` omitia `createdAt` do `InstallmentPlan` retornado, apesar de o campo constar explicitamente no contrato do Bloco 01; (2) `dueDay` havia sido implementado como `number | null` (com `if (input.dueDay !== null)` e `dueDate: ... ? null : ...`), quando o contrato definia `dueDay` como regra-base **obrigatória** do plano, sempre 1–31. Ambos foram corrigidos nesta mesma execução, antes de qualquer commit — ver seção 9 e o feedback deste bloco para o detalhamento completo.

## 3. Problema que Este Bloco Resolve

Sem este bloco, não existe nenhum código capaz de calcular quanto vale cada parcela, em que competência ela cai, ou qual sua data de vencimento — apenas a decisão documental de como isso deveria funcionar. Este bloco torna essas regras executáveis e testadas, sem ainda depender de banco, API ou UI (que dependeriam de decisões de persistência ainda não tomadas — Bloco 03).

## 4. Escopo

- `splitMoney(total, parts)` em `packages/domain/src/money/money.ts` — última parcela absorve o resto.
- `addMonthsToReferenceMonth(referenceMonth, months)` — avanço de competência por aritmética de ano/mês.
- `resolveInstallmentDueDate(referenceMonth, dueDay)` — resolução de vencimento para o último dia válido do mês.
- Tipos de domínio `InstallmentPlan` e `GeneratedInstallment` (`packages/domain/src/installment/installment-plan.ts`).
- `createInstallmentPlan(input)` — valida os invariantes de entrada do plano.
- `generateInstallments(plan)` — gera as N parcelas conceituais.
- Novo erro `InvalidInstallmentPlanError`.
- Testes cobrindo as 15 invariantes registradas no Bloco 01, mais entradas inválidas.
- Exportação via `packages/domain/src/index.ts`.

## 5. Fora de Escopo

- Repositório, Drizzle, migration, tabela `installment_plans` (Bloco 03).
- Rota HTTP, DTO, serviço de aplicação orquestrando persistência (Bloco 04) — incluindo a decisão de atomicidade da RS-01.
- Frontend (Bloco 05/06).
- Qualquer conexão com Aiven ou dado real.
- Extensão do tipo `FinancialEntry` existente com `installmentPlanId`/`installmentNumber` — deliberadamente adiada para o Bloco 03: adicionar esses dois campos (mesmo nullable) ao tipo `FinancialEntry` hoje quebraria o typecheck de dezenas de fixtures/testes já existentes em `apps/api`/`apps/web` (objetos literais que constroem `FinancialEntry` sem esses campos), o que exigiria tocar `apps/api/**`/`apps/web/**` — fora do escopo autorizado deste bloco. `GeneratedInstallment` (novo tipo, autocontido) carrega toda a informação equivalente sem esse acoplamento; a extensão real de `FinancialEntry` acontece no Bloco 03, junto da mudança de schema, quando o ajuste em cascata pelos repositórios/testes já é esperado.

  **`GeneratedInstallment` não substitui `FinancialEntry` na arquitetura final — nunca substituirá.** É exclusivamente uma estrutura intermediária deste bloco: a parcela conceitual calculada pelo domínio, antes de qualquer persistência. No modelo final persistido (Bloco 03/04), cada parcela continua sendo uma `FinancialEntry` real, vinculada ao `InstallmentPlan` via `installmentPlanId`/`installmentNumber` — exatamente a decisão arquitetural já fechada no Bloco 01 ("cada parcela é uma `FinancialEntry` comum").

## 6. Arquivos e Pastas Envolvidos

- `packages/domain/src/money/money.ts`, `money.test.ts` (alterados)
- `packages/domain/src/errors/domain-errors.ts` (alterado — novo erro)
- `packages/domain/src/index.ts` (alterado — novo export)
- `packages/domain/src/installment/installment-plan.ts` (novo)
- `packages/domain/src/installment/installment-rules.ts` (novo)
- `packages/domain/src/installment/installment-rules.test.ts` (novo)
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/**` (documentação deste bloco)

Nenhum arquivo em `apps/api/**`, `apps/web/**`, `database/migrations/**` ou schema Drizzle é tocado.

## 7. Dependências

- Bloco 01 concluído e integrado à `main` (`3dbb5e7c89d5a48cfd82bbf742480ec2d0c22e80`) — satisfeita.

## 8. Plano de Implementação

1. `splitMoney` em `money.ts` + testes (arredondamento determinístico, invariante de soma para faixa ampla de valores).
2. `InvalidInstallmentPlanError` em `domain-errors.ts`.
3. Tipos `InstallmentPlan`/`GeneratedInstallment` em `installment/installment-plan.ts`.
4. `addMonthsToReferenceMonth`, `resolveInstallmentDueDate`, `createInstallmentPlan`, `generateInstallments` em `installment/installment-rules.ts` (reaproveitando `assertValidReferenceMonth` já existente em `monthly-period-rules.ts`).
5. Exportar o módulo novo em `index.ts`.
6. Testes cobrindo as 15 invariantes + entradas inválidas (`installment-rules.test.ts`).
7. `npm run build:domain` + `npm run typecheck` (confirmar zero ripple em `apps/api`/`apps/web`).
8. Documentação deste bloco, prompt e feedback.
9. Validações completas + parar para revisão — nenhum commit automático.

## 9. Critérios de Aceite

- [x] `splitMoney`: primeiras `N-1` parcelas no valor-base, última absorve o resto; `sumMoney(splitMoney(total, n)) === total` para faixa ampla de `total`/`n`.
- [x] `addMonthsToReferenceMonth`: avança por ano/mês (nunca soma de dias); cobre dezembro→janeiro, 12 parcelas, 24 parcelas.
- [x] `resolveInstallmentDueDate`: nunca produz data inválida; cobre mês de 31/30/28/29 dias (bissexto incluído).
- [x] `createInstallmentPlan` valida os 4 invariantes de entrada (`installmentCount >= 2`, `totalAmount > 0`, `dueDay` obrigatório 1–31, `firstReferenceMonth` válido) e **preserva `createdAt`** fornecido pelo chamador.
- [x] `InstallmentPlan.dueDay` é `number` (não `number | null`) — nenhum caminho no código produz um plano sem vencimento definido.
- [x] `InstallmentPlan.createdAt` existe e é preservado exatamente como fornecido (mesmo padrão de `MonthlyPeriod.closedAt`: string ISO fornecida por quem chama, nunca gerada dentro do domínio).
- [x] `generateInstallments` produz exatamente N parcelas, numeradas 1..N, mesmo household/plano, status inicial `planned`, `dueDate` sempre uma string de data válida (nunca `null`), objetos independentes.
- [x] As 15 invariantes do Bloco 01 têm teste correspondente.
- [x] Nenhum arquivo fora de `packages/domain/src/**` e documentação da Sessão 12 foi alterado.
- [x] `npm run typecheck` (todos os workspaces) permanece limpo — zero ripple em `apps/api`/`apps/web`.

## 10. Validações Obrigatórias

- [ ] `npm run build`
- [ ] `npm run verify:runtime`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run typecheck:api-scripts`
- [ ] `npm run test`
- [ ] `npx ddae-engine validate`
- [ ] `npx ddae-engine audit`

## 11. Segurança

Não aplicável — domínio puro, sem entrada de usuário via rede, sem autenticação, sem dado sensível. `createdByUserId` é propagado como metadado de autoria em `GeneratedInstallment`, nunca usado para controle de acesso (não há nenhuma consulta/filtro por usuário neste módulo — a garantia de visibilidade compartilhada por household continua sendo responsabilidade da camada HTTP, RF-09/DT-14, inalterada por este bloco).

## 12. Performance

Não aplicável — funções puras, O(N) no número de parcelas (tipicamente dezenas), sem I/O.

## 13. Design System / UX

Não aplicável — nenhuma tela é tocada neste bloco.

## 14. Riscos

Nenhum risco novo. RS-01 (atomicidade da geração em lote) permanece registrada para o Bloco 04, fora do escopo deste bloco (que nem persiste nada).

## 15. Pendências Esperadas

Nenhuma.

## 16. Feedback Obrigatório

Gerar e preencher via `ddae-engine feedback create --block bloco_02_dominio_e_geracao_das_parcelas --session session_12_parcelamentos_e_compromissos_futuros` — sem feedback preenchido, o bloco não está concluído.

## 17. Commit Semântico Sugerido

_Sugestão apenas — nunca executado automaticamente sem confirmação explícita do usuário._

```
feat(domain): implementar geracao de parcelas de installment plan
```
