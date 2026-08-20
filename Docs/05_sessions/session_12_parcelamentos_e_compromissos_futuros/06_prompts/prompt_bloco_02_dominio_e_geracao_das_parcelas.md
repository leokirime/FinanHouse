# Prompt — Bloco 02: Domínio e geração das parcelas

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_02_dominio_e_geracao_das_parcelas.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Implementar, em `packages/domain` (domínio puro), a divisão monetária, o avanço de competência, a resolução de vencimento e a geração das parcelas conceituais de um `InstallmentPlan`.

## 3. Escopo

`splitMoney`, `addMonthsToReferenceMonth`, `resolveInstallmentDueDate`, tipos `InstallmentPlan`/`GeneratedInstallment`, `createInstallmentPlan`, `generateInstallments`, testes cobrindo as 15 invariantes do Bloco 01.

## 4. Fora de Escopo

Repositório/Drizzle/migration/tabela (Bloco 03); serviço de aplicação/rota HTTP/RS-01 (Bloco 04); frontend (Bloco 05/06); Aiven/dado real; extensão de `FinancialEntry` com `installmentPlanId`/`installmentNumber` (adiada para o Bloco 03 — ver bloco, seção 5).

## 5. Arquivos Permitidos

- `packages/domain/src/money/money.ts`, `money.test.ts`
- `packages/domain/src/errors/domain-errors.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/installment/**`
- `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/**`

Nenhum caminho em `apps/api/**`, `apps/web/**`, `database/migrations/**` é permitido neste bloco.

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Não implemente repository, Drizzle, migration, API, DTO ou frontend.
- Não abra conexão com o Aiven.
- Não persista nada.

## 7. Restrições de Segurança

Não aplicável — domínio puro, sem entrada de rede, sem autenticação. `createdByUserId` propagado só como metadado de autoria, nunca usado para controle de acesso neste módulo.

## 8. Restrições de Performance

Não aplicável — funções puras O(N) no número de parcelas, sem I/O.

## 9. Restrições de Design System

Não aplicável — nenhuma tela é tocada.

## 10. Tarefas

1. `splitMoney` em `money.ts` + testes.
2. `InvalidInstallmentPlanError` em `domain-errors.ts`.
3. Tipos `InstallmentPlan`/`GeneratedInstallment`.
4. `addMonthsToReferenceMonth`, `resolveInstallmentDueDate`, `createInstallmentPlan`, `generateInstallments`.
5. Exportar em `index.ts`.
6. Testes das 15 invariantes + entradas inválidas.
7. `npm run typecheck` em todos os workspaces (confirmar zero ripple).
8. Documentação + feedback.
9. Validações completas + parar para revisão.

## 11. Critérios de Aceite

- [x] `splitMoney` com última parcela absorvendo o resto; soma exata testada para faixa ampla.
- [x] `addMonthsToReferenceMonth` por ano/mês, cobrindo virada de ano, 12x, 24x.
- [x] `resolveInstallmentDueDate` nunca produz data inválida (31/30/28/29 dias).
- [x] `createInstallmentPlan` valida os 4 invariantes de entrada (`dueDay` obrigatório 1–31) e preserva `createdAt` fornecido pelo chamador.
- [x] `InstallmentPlan.dueDay` é `number` obrigatório (não nullable); `InstallmentPlan.createdAt` existe (corrigido em revisão — ver feedback).
- [x] `generateInstallments` produz exatamente N parcelas corretas e independentes, `dueDate` sempre uma data válida (nunca `null`).
- [x] As 15 invariantes do Bloco 01 têm teste correspondente.
- [x] Nenhum arquivo fora de `packages/domain/src/**`/documentação alterado.
- [x] `typecheck` de todos os workspaces limpo.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `npm run build`
- [ ] `npm run verify:runtime`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run typecheck:api-scripts`
- [ ] `npm run test`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_02_dominio_e_geracao_das_parcelas --session session_12_parcelamentos_e_compromissos_futuros
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Ver `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/08_feedbacks/feedback_bloco_02_dominio_e_geracao_das_parcelas.md` para o status final.

## 15. Commit Semântico Sugerido

```
feat(domain): implementar geracao de parcelas de installment plan
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
