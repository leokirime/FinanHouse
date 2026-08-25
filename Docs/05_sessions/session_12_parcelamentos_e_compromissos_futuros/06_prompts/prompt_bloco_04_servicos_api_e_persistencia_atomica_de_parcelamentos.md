# Prompt — Bloco 04: Servicos, API e persistencia atomica de parcelamentos

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/05_blocks/bloco_04_servicos_api_e_persistencia_atomica_de_parcelamentos.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco (RS-01 em `Docs/01_product/requisitos_funcionais.md`; DT-15/DT-17/DT-18 em `Docs/02_architecture/decisoes_tecnicas.md`)

## 2. Objetivo

Implementar a persistência atômica de uma compra parcelada (RS-01) — `InstallmentPlan` + N `FinancialEntry` + eventuais `MonthlyPeriod` novas, tudo em uma única transação real — e expor essa operação via API HTTP (criação e leitura).

## 3. Escopo

- Extensão de `FinancialEntry` (domínio) com `installmentPlanId`/`installmentNumber` (`number | null`, nunca opcional).
- `InstallmentTransactionRunner` (porta) + implementações Drizzle (`db.transaction()` nativo) e em memória (snapshot/restore real).
- `CreateInstallmentPurchaseService`, `ListInstallmentPlansService`, `GetInstallmentPlanDetailService`.
- Rotas HTTP `POST/GET .../installment-plans`, `GET .../installment-plans/:installmentPlanId`.
- Testes de atomicidade (sucesso + 6 cenários de falha com rollback total), valores, datas, household, avulso, HTTP.

## 4. Fora de Escopo

- Interface de usuário para parcelamentos (Bloco 05).
- Edição estrutural ou exclusão global do plano — imutável.
- Aplicação de migration, acesso ao Aiven, seed/bootstrap.
- Nova correção de DT-15 — já encerrada no Bloco 03.

## 5. Arquivos Permitidos

- `packages/domain/src/financial-entry/*.ts`, `errors/domain-errors.ts`
- `apps/api/src/application/ports/financial-entry-repository.ts`, `installment-transaction-runner.ts`, `index.ts`
- `apps/api/src/application/services/installment-purchase-services.ts`, `index.ts`
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-financial-entry-repository.ts`, `drizzle-installment-transaction-runner.ts`, `create-drizzle-repositories.ts`, `mappers/financial-entry-mapper.ts`
- `apps/api/src/infrastructure/repositories/memory/*.ts`
- `apps/api/src/http/app.ts`, `server.ts`, `routes/installment-plans.ts`, `mappers/*.ts`, `schemas/*.ts`, `errors/error-handler.ts`, `test-support/build-test-app.ts`
- `apps/api/scripts/db-smoke-*.ts` (só ajuste estrutural de compilação — nunca execução)
- `apps/web/src/api/financial-api.types.ts`, `financial-api.mappers.ts` (só ajuste estrutural mínimo — sem tela nova)
- Testes correspondentes a cada arquivo acima
- Documentação: bloco/prompt/feedback do Bloco 04, `Docs/02_architecture/decisoes_tecnicas.md` (nova DT), `Docs/01_product/requisitos_funcionais.md` (RS-01)

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- **Nunca** aplique migration, execute `db:migrate`/`db:push`/seed/bootstrap, ou acesse o Aiven.
- **Nunca** reintroduza `nextId()`/`information_schema`/`MAX(id)` — DT-15/DT-18 devem permanecer intactas.
- **Nunca** faça `git add`/`commit`/`push`/`merge` sem autorização explícita.

## 7. Restrições de Segurança

`createdByUserId` sempre da sessão autenticada (`request.authSession.userId`), nunca do corpo — mesmo padrão do Bloco 19/DT-14. Categoria/household validados antes de qualquer escrita. Nenhum dado sensível novo.

## 8. Restrições de Performance

Uma única transação por parcelamento (nunca N conexões/transações). `installmentCount` limitado no schema do corpo (máx. 60) — sem novo índice necessário (já criado no Bloco 03).

## 9. Restrições de Design System

Não aplicável — nenhuma interface criada neste bloco.

## 10. Tarefas

1. Inspecionar a arquitetura real (domínio, portas, repositórios, DI, rotas/schemas/DTOs/erros) antes de desenhar qualquer abstração nova — confirmar que `db.transaction()` já é suportado pelo `DrizzleDb` usado por todos os repositórios.
2. Estender `FinancialEntry` e corrigir todas as fixtures quebradas (domain + apps/api + apps/web) via `tsc --noEmit` iterativo.
3. Adicionar `InstallmentPlanNotFoundError`; conectar erros de domínio ao `error-handler.ts`.
4. Adicionar `findByInstallmentPlan` ao `FinancialEntryRepository`.
5. Criar `InstallmentTransactionRunner`/`InstallmentTransactionContext` e as duas implementações.
6. Implementar `CreateInstallmentPurchaseService` reaproveitando as funções de domínio já existentes — nenhuma regra duplicada.
7. Implementar os serviços de leitura.
8. Adicionar DTOs, schema, rotas; conectar em `app.ts`/`server.ts`/`build-test-app.ts`.
9. Escrever os testes de atomicidade (sucesso + 6 falhas), valores, datas, household, avulso, HTTP.
10. Rodar a suíte completa e corrigir quebras estruturais remanescentes.
11. Registrar a nova DT e atualizar RS-01.
12. Preencher bloco/prompt; criar feedback só depois de tudo validado.

## 11. Critérios de Aceite

- [x] Sucesso persiste plano + N parcelas; qualquer falha (plano, parcela 1/intermediária/última, competência, categoria de outro household) não deixa dado parcial.
- [x] `create()`/`insertId` nativo preservados — nenhum `nextId()`/`information_schema`/`MAX(id)`.
- [x] `createdByUserId` sempre da sessão; plano pertence ao household, não ao autor.
- [x] Divisão de valores e datas persistidas exatamente como o domínio produz.
- [x] Lançamento avulso continua funcionando.
- [x] API com dinheiro sempre como string decimal.
- [x] Nenhuma migration nova, nenhum acesso ao Aiven.
- [x] Suíte completa sem regressão.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test`
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine audit`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_04_servicos_api_e_persistencia_atomica_de_parcelamentos --session session_12_parcelamentos_e_compromissos_futuros
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencher `Docs/05_sessions/session_12_parcelamentos_e_compromissos_futuros/09_validation/` (ou arquivo equivalente) após revisão do proprietário — não antecipado aqui.

## 15. Commit Semântico Sugerido

```
feat(servicos_api_e_persistencia_atomica_de_parcelamentos): implementar criacao atomica de InstallmentPlan + N FinancialEntry (RS-01) e API de parcelamentos
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
