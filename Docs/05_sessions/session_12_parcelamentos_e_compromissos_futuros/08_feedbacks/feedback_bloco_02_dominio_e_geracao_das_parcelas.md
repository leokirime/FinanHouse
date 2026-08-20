# Feedback — Bloco 02: Domínio e geração das parcelas

> Sessão: 12 (parcelamentos_e_compromissos_futuros) · Projeto: FinanHouse · Atualizado em: 2026-08-20

## 1. Resumo Executivo

Primeiro bloco de código real da Sessão 12, implementado em `packages/domain` (domínio puro, sem repositório/API/frontend/banco): `splitMoney`, `addMonthsToReferenceMonth`, `resolveInstallmentDueDate`, os tipos `InstallmentPlan`/`GeneratedInstallment`, `createInstallmentPlan` e `generateInstallments`.

**Esta é a segunda (e final) execução do bloco.** Na primeira execução, o proprietário do projeto revisou o código antes do commit e encontrou dois desvios reais entre o contrato consolidado no Bloco 01 e a implementação: (1) `InstallmentPlan` não incluía `createdAt`, apesar de o campo constar explicitamente no contrato; (2) `dueDay` havia sido implementado como `number | null` (opcional), quando o contrato definia `dueDay` como regra-base **obrigatória** do plano (1–31). Ambos foram corrigidos nesta execução, antes de qualquer commit — a decisão de manter `GeneratedInstallment` como estrutura intermediária (sem estender `FinancialEntry` ainda) foi confirmada como correta pelo proprietário e não foi alterada.

Domínio passou de 204 para **212 testes** (+8, cobrindo especificamente as duas correções). API e web permanecem inalterados (571/366) — `npm run typecheck` limpo em todos os workspaces, confirmando zero ripple fora de `packages/domain/src/**`. Nenhuma migration, nenhuma conexão com Aiven, nenhum dado real, nenhuma alteração em API/frontend. Nenhum commit/push/merge foi realizado.

## 2. Objetivo do Bloco

Implementar, em domínio puro, a divisão monetária, o avanço de competência, a resolução de vencimento e a geração das parcelas conceituais de um `InstallmentPlan` — em conformidade exata com o contrato fechado no Bloco 01.

## 3. Escopo Implementado

Implementado integralmente, incluindo a correção de conformidade desta revisão:

- `splitMoney(total, parts)` — `packages/domain/src/money/money.ts`.
- `InvalidInstallmentPlanError` — `packages/domain/src/errors/domain-errors.ts`.
- `InstallmentPlan` (agora com `dueDay: number` obrigatório e `createdAt: string`), `GeneratedInstallment` (agora com `dueDate: string`, nunca `null`) — `packages/domain/src/installment/installment-plan.ts`.
- `addMonthsToReferenceMonth`, `resolveInstallmentDueDate`, `createInstallmentPlan` (agora exige e preserva `dueDay`/`createdAt`), `generateInstallments` (agora sempre resolve `dueDate`) — `packages/domain/src/installment/installment-rules.ts`.
- Exportação via `packages/domain/src/index.ts`.
- 51 testes (43 da primeira execução + 8 novos desta correção).

## 4. Arquivos Criados

- `packages/domain/src/installment/installment-plan.ts`
- `packages/domain/src/installment/installment-rules.ts`
- `packages/domain/src/installment/installment-rules.test.ts`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_02_dominio_e_geracao_das_parcelas.md`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/06_prompts/prompt_bloco_02_dominio_e_geracao_das_parcelas.md`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/08_feedbacks/feedback_bloco_02_dominio_e_geracao_das_parcelas.md` (este arquivo)

## 5. Arquivos Alterados

- `packages/domain/src/money/money.ts` (+ `money.test.ts`) — `splitMoney`.
- `packages/domain/src/errors/domain-errors.ts` — novo erro.
- `packages/domain/src/index.ts` — novo export.

Nenhum arquivo em `apps/api/**`, `apps/web/**`, `database/migrations/**` ou schema Drizzle foi alterado, nesta execução nem na anterior.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
# Confirmação de estado antes de qualquer alteração:
git branch --show-current / git status / git status --short / git diff --stat
git rev-parse HEAD / git rev-parse origin/main

# Correção (edição de arquivos já existentes, sem novos comandos ddae-engine):
npm run build:domain   (repetido após cada alteração)
npm run typecheck      (repetido após cada alteração — confirma zero ripple)

npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run typecheck:api-scripts
npm run test
npx ddae-engine validate
npx ddae-engine audit
```

## 8. Testes Realizados

Os 43 testes da primeira execução permanecem válidos e passando (ajustados onde dependiam do comportamento antigo — ver seção 12). 8 testes novos/reestruturados nesta correção:

1. `InstallmentPlan` criado contém `createdAt`.
2. `createdAt` fornecido na entrada é preservado exatamente, sem transformação.
3. `dueDay` 1 é aceito e preservado.
4. `dueDay` 31 é aceito e preservado.
5. `dueDay` não inteiro (ex. 15.5) é rejeitado.
6. `dueDay: null` não forma um `InstallmentPlan` válido (mesmo contornando o tipo em tempo de compilação com type assertion, simulando uma entrada malformada de fora do TypeScript).
7. `dueDay` ausente (`undefined`) não forma um `InstallmentPlan` válido.
8. `generateInstallments` sempre produz `dueDate` como string de data válida — nunca `null` (dueDay é obrigatório).

Os testes que dependiam de `dueDay: null`/`dueDate: null` (existência de parcelamento sem vencimento) foram removidos e substituídos por testes da rejeição desse cenário — o comportamento antigo não existe mais no contrato aprovado. `dueDay 0`/`dueDay 32` (já cobertos na primeira execução) permanecem válidos e passando.

Suíte completa (1149 testes) sem regressão.

## 9. Validações Executadas

- [x] `npm run build` — sucesso.
- [x] `npm run verify:runtime` — sucesso.
- [x] `npm run lint` — sem erros/avisos.
- [x] `npm run typecheck` — sem erros em nenhum workspace (confirma zero ripple em `apps/api`/`apps/web`, mesmo após as duas correções).
- [x] `npm run typecheck:api-scripts` — sem erros.
- [x] `npm run test` — **1149 testes passando**: API 571 (inalterado), web 366 (inalterado), domínio 212 (+8 em relação à primeira execução deste bloco, +51 em relação ao baseline pré-Bloco-02).
- [x] `npx ddae-engine validate` — Status OK, 0 erros.
- [x] `npx ddae-engine audit` — Status OK, 0 erros, 9 avisos (todos já conhecidos — 7 quality gates gerais, P2 histórica do Bloco 19, estrutura legada `session_01..10`; nenhum novo).

## 10. Decisões Técnicas

**`createdAt: string`, sempre fornecido por quem chama `createInstallmentPlan` — nunca gerado dentro do domínio.** Investigação confirmou que nenhum tipo de domínio existente antes deste bloco carrega um campo de "timestamp de criação" (é sempre uma coluna de banco, `TIMESTAMP DEFAULT (now())`, nunca exposta a `packages/domain`). O precedente mais próximo de um valor temporal em um tipo de domínio é `MonthlyPeriod.closedAt: string`, sempre fornecido pelo chamador (`CloseMonthlyPeriodInput.closedAt`), nunca calculado internamente — nenhuma função de domínio deste projeto chama `new Date()` para capturar "agora" (o que introduziria não-determinismo numa camada deliberadamente pura). `createdAt` de `InstallmentPlan` segue exatamente esse padrão: campo obrigatório em `CreateInstallmentPlanInput`, copiado sem transformação para o `InstallmentPlan` retornado. Formato: string ISO 8601 completa (data e hora) — diferente de `dueDate`/`closedAt`/`referenceMonth` (que são datas de calendário `YYYY-MM-DD`), porque `createdAt` representa um instante, não um dia.

**`dueDay: number` obrigatório (não `number | null`).** Corrige o desvio do contrato: o Bloco 01 já definia `dueDay` como regra-base do plano, sempre 1–31 — não havia previsão de parcelamento sem vencimento. `createInstallmentPlan` agora sempre valida `assertValidDueDay(input.dueDay)` (removido o `if (input.dueDay !== null)`), e `generateInstallments` sempre chama `resolveInstallmentDueDate` (removido o `plan.dueDay === null ? null : ...`). `GeneratedInstallment.dueDate` passou de `string | null` para `string` — toda parcela gerada agora tem uma data de vencimento válida.

**`GeneratedInstallment` mantido, decisão confirmada sem alteração.** O proprietário do projeto confirmou explicitamente que a estrutura intermediária (sem estender `FinancialEntry` ainda) é a decisão correta para este bloco. Reforçado na documentação (`installment-plan.ts`, `bloco_02_...md`): `GeneratedInstallment` nunca substituirá `FinancialEntry` na arquitetura final — é exclusivamente a parcela conceitual calculada pelo domínio antes de qualquer persistência; no modelo final persistido (Bloco 03/04), cada parcela continua sendo uma `FinancialEntry` real vinculada ao `InstallmentPlan`.

## 11. Problemas Encontrados

Os dois desvios de contrato descritos no resumo executivo — encontrados pelo proprietário do projeto na revisão da primeira execução, não pela própria execução. Nenhum bug de lógica: os testes da primeira execução passavam porque testavam o comportamento (nullable) que havia sido implementado, não o comportamento (obrigatório) que havia sido de fato aprovado no Bloco 01 — uma divergência de conformidade com o contrato, não um erro de execução dos testes em si.

## 12. Correções Aplicadas Durante o Bloco

1. `installment-plan.ts`: `InstallmentPlan.dueDay` de `number | null` para `number`; adicionado `InstallmentPlan.createdAt: string`; `GeneratedInstallment.dueDate` de `string | null` para `string`. Documentação de ambos os campos reforçada com a justificativa de padrão (`closedAt`) e o esclarecimento definitivo do papel de `GeneratedInstallment`.
2. `installment-rules.ts`: `CreateInstallmentPlanInput.dueDay` de `number | null` para `number`; adicionado `CreateInstallmentPlanInput.createdAt: string`; `createInstallmentPlan` passou a validar `dueDay` incondicionalmente e a copiar `createdAt` para o retorno; `generateInstallments` passou a chamar `resolveInstallmentDueDate` incondicionalmente (removida a ramificação para `null`).
3. `installment-rules.test.ts`: `validPlanInput` passou a incluir `dueDay`/`createdAt` válidos por padrão; testes de `dueDay 0`/`dueDay 32`/`dueDay não inteiro` separados e um teste de `dueDay null`/`undefined` (rejeição) adicionado; testes de `createdAt` (presença e preservação) adicionados; teste de "dueDate null quando plano não define dueDay" removido (cenário deixou de existir) e substituído por "dueDate sempre válida" (dueDay é obrigatório).
4. `bloco_02_...md`/prompt: seção de contexto/critérios de aceite atualizada para não afirmar mais "implementa exatamente as decisões do Bloco 01" sem qualificação — agora registra explicitamente a correção pós-revisão.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência nova. (A pendência P2 pré-existente do Bloco 19 continua registrada em `feedback_bloco_19_autenticacao_real_e_sessao_domestica.md`, não relacionada a esta sessão.)_

### P3 — Melhoria Recomendada

_Nenhuma._

### P4 — Opcional

_Nenhuma nova. (Estrutura de sessões legada `session_01..10` e correção de geração de id em três repositórios antigos — DT-15 — seguem registradas desde blocos anteriores, não relacionadas a este bloco.)_

## 14. Riscos Restantes

Nenhum risco novo. RS-01 permanece registrada para o Bloco 04 — este bloco não persiste nada.

## 15. Evidências

```
Test Files  9 passed (9) — packages/domain — Tests 212 passed (212)
Test Files  56 passed (56) — apps/api — Tests 571 passed (571)
Test Files  38 passed (38) — apps/web — Tests 366 passed (366)

git status --short (após a correção, ainda sem commit):
 M packages/domain/src/errors/domain-errors.ts
 M packages/domain/src/index.ts
 M packages/domain/src/money/money.test.ts
 M packages/domain/src/money/money.ts
?? packages/domain/src/installment/
?? Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_02_...
?? Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/06_prompts/prompt_bloco_02_...
?? Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/08_feedbacks/feedback_bloco_02_...

DDAE Engine Validation Report — Status: OK, Errors: 0
DDAE Engine Audit Report — Status: OK, Errors: 0, Warnings: 9 (todos pré-existentes)
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo

Os dois desvios de contrato identificados na revisão foram corrigidos e testados; nenhuma pendência P1/P2 nova; `typecheck` confirma zero ripple fora de `packages/domain`; `GeneratedInstallment` confirmado como decisão correta para este bloco pelo proprietário do projeto.

## 17. Próximo Bloco Recomendado

Bloco 03 — Persistência, schema e migration. Aguardando autorização explícita para: (a) aprovar este Bloco 02 corrigido e autorizar commit/push/merge; (b) então iniciar o Bloco 03.

## 18. Commit Semântico Sugerido

```
feat(domain): implementar geracao de parcelas de installment plan
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
