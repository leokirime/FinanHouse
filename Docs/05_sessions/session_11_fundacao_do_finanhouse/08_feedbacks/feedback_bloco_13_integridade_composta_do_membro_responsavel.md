# Feedback — Bloco 13: Integridade composta do membro responsável

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-31

## 1. Resumo Executivo

Este bloco encerrou a pendência P2 registrada desde os Blocos 03/04: `financial_entries.responsible_member_id` tinha apenas FK simples para `household_members.id`, sem nenhuma garantia no banco de que o membro responsável pertencesse ao mesmo household da movimentação. A correção adiciona uma coluna auxiliar nullable `responsible_member_household_id`, uma FK composta `(responsible_member_id, responsible_member_household_id) → household_members(id, household_id)` e uma `CHECK` que mantém a coluna auxiliar sincronizada com `household_id` — implementada como migration incremental versionada (`0001_responsible_member_household_integrity.sql`), sem alterar a migration inicial já aplicada no Bloco 12.

**A primeira tentativa de aplicação falhou.** O plano original previa `ON DELETE SET NULL` na FK composta (preservando o comportamento da FK simples anterior), mas o MySQL 8 rejeitou essa combinação com o erro `3823` (`ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN`): uma coluna não pode participar de uma `CHECK` se também for alvo de uma ação referencial automática (`SET NULL`/`CASCADE`) em FK — e ambas as colunas da FK composta eram referenciadas pela `CHECK`. Como DDL não é transacional no MySQL/InnoDB, os 4 statements anteriores à falha (remoção da FK simples antiga, coluna auxiliar, `unique(id, household_id)`, `CHECK`) já haviam sido aplicados permanentemente a `finanhouse_dev`, deixando o banco em estado parcial. O incidente foi diagnosticado com um script temporário e somente leitura (nunca versionado) que reexecutou isoladamente o statement que falhou, com autorização pontual e explícita do proprietário para exibir o erro bruto do MySQL — exceção justificada porque erros de DDL/constraint não contêm host, usuário ou senha. O estado parcial foi revertido com 4 statements de recuperação (também temporários, também autorizados separadamente), confirmado por auditoria somente leitura, e só então a migration corrigida — com `ON DELETE RESTRICT` no lugar de `SET NULL`, mantendo a `CHECK` — foi aplicada com sucesso, mediante uma segunda autorização explícita separada.

Durante o pré-flight deste bloco, também foi descoberto e corrigido um defeito de segurança real e pré-existente desde o Bloco 11: os cinco scripts de banco estabeleciam a conexão MySQL fora do bloco `try/catch`, fazendo uma falha de conexão (ex.: `ENOTFOUND`, quando o serviço Aiven estava temporariamente desligado) escapar sem sanitização e imprimir o hostname real no terminal. Corrigido nos cinco scripts, com 10 novos testes de regressão estática.

Ao final: seis tabelas preservadas, journal do Drizzle com duas migrations registradas, todas as tabelas com **zero registros** — nenhum seed executado, nenhum dado real inserido, nenhuma alteração em produção. A P2 do membro responsável está encerrada (DT-09). RF-05 não é declarado concluído.

## 2. Objetivo do Bloco

Eliminar a pendência P2 relacionada a `financial_entries.responsible_member_id`, garantindo diretamente no MySQL que o membro responsável pertence ao mesmo household da movimentação, via migration incremental versionada, auditada e aplicada exclusivamente em `finanhouse_dev`.

## 3. Escopo Implementado

Implementado conforme planejado em `05_blocks/bloco_13_integridade_composta_do_membro_responsavel.md`, com uma divergência de estratégia técnica (RESTRICT em vez de SET NULL) causada por uma restrição real do MySQL descoberta apenas na aplicação real, não detectável por revisão estática:

- Coluna auxiliar, FK composta, `CHECK` e índice no schema Drizzle.
- Migration incremental gerada duas vezes (a primeira com `SET NULL`, corrigida para `RESTRICT` após o incidente) — apenas a versão corrigida foi aplicada com sucesso e é a que permanece versionada.
- Auditor de integridade específico (`responsible-member-integrity-audit.ts` + `db-audit-responsible-member-integrity.ts`), com 20 testes unitários.
- Correção de segurança nos 5 scripts de banco (conexão dentro do `try`), com 10 testes de regressão.
- Checkpoint humano solicitado e concedido **duas vezes**: uma para a tentativa original, outra (com plano revisado) para recuperação + reaplicação.
- DT-09 registrada, incluindo o incidente completo. P2 dos Blocos 03/04 encerrada.

## 4. Arquivos Criados

- `apps/api/src/db/responsible-member-integrity-audit.ts`
- `apps/api/src/db/responsible-member-integrity-audit.test.ts`
- `apps/api/scripts/db-audit-responsible-member-integrity.ts`
- `apps/api/src/db/migration-0001.test.ts`
- `apps/api/scripts/connection-safety.test.ts`
- `database/migrations/0001_responsible_member_household_integrity.sql`
- `database/migrations/meta/0001_snapshot.json`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_13_integridade_composta_do_membro_responsavel.md` (este arquivo)

## 5. Arquivos Alterados

- `apps/api/src/db/schema/financial-entries.ts` (coluna auxiliar, FK composta RESTRICT, CHECK, índice)
- `apps/api/src/db/schema/household-members.ts` (`unique(id, household_id)`)
- `apps/api/src/db/schema/schema.test.ts` (testes atualizados para a nova FK composta)
- `apps/api/scripts/db-check.ts`, `db-migrate.ts`, `db-seed-dev.ts`, `db-audit-schema.ts` (correção de segurança: conexão dentro do `try`)
- `apps/api/package.json`, `package.json` (raiz) — novo script `db:audit:responsible-member`
- `database/migrations/meta/_journal.json` (nova entrada da migration `0001`)
- `Docs/02_architecture/decisoes_tecnicas.md` (nova DT-09; seção 5 "Decisões Pendentes" — P2 encerrada)
- `Docs/03_contracts/contrato_banco_dados.md` (seções 2, 3, 12 atualizadas)
- `Docs/01_product/requisitos_funcionais.md` (RF-05 atualizado)
- `database/proposed-schema/modelo-logico.md`, `database/proposed-schema/relacionamentos.md`, `database/migrations/README.md`
- `README.md`, `apps/api/README.md`, `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_13_integridade_composta_do_membro_responsavel.md`, `Docs/05_sessions/session_11_fundacao_do_finanhouse/06_prompts/prompt_bloco_13_integridade_composta_do_membro_responsavel.md` (preenchidos — estavam com placeholders)

## 6. Arquivos Removidos

- Nenhum arquivo permanente. Três scripts de diagnóstico/recuperação temporários foram criados e removidos dentro desta mesma execução, nunca commitados: um para reexecutar isoladamente o statement que falhou (capturar o erro real do MySQL), um para verificar o estado após a recuperação, e um para aplicar os 4 statements de reversão — nenhum chegou a ser versionado.

## 7. Comandos Executados

```
npx ddae-engine block create "Integridade composta do membro responsável" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_13_integridade_composta_do_membro_responsavel --session session_11_fundacao_do_finanhouse
npx ddae-engine feedback create --block bloco_13_integridade_composta_do_membro_responsavel --session session_11_fundacao_do_finanhouse
npx drizzle-kit generate --name responsible_member_household_integrity   # executado duas vezes (SET NULL, depois RESTRICT)
npx drizzle-kit check
npm ci
npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run typecheck:api-scripts
npm run test
npx ddae-engine validate
npx ddae-engine audit
npm audit --omit=dev
npm audit
npm ls mysql2 drizzle-orm drizzle-kit react-router react-router-dom
npm run db:check                                    # múltiplas execuções, somente leitura
npm run db:audit:schema -- --phase=after             # somente leitura
npm run db:audit:responsible-member -- --phase=before   # executado 3 vezes (pré-flight, pós-recuperação, imediatamente antes da reaplicação)
CONFIRM_DATABASE_MIGRATION=true npm run db:migrate   # 1ª tentativa (falhou) + 2ª tentativa (sucesso, migration corrigida)
npm run db:audit:responsible-member -- --phase=after # somente leitura, pós-migration
git status / git status --short / git diff --stat / git diff --name-only
git check-ignore -v apps/api/.env.local
git check-ignore -v ca.pem
git check-ignore -v aiven-ca.pem
```

## 8. Testes Realizados

- **Automatizados (novos):** 12 testes em `migration-0001.test.ts` (SQL da migration incremental, migration inicial intacta); 20 em `responsible-member-integrity-audit.test.ts` (estados before/after, DELETE_RULE RESTRICT aceito/SET NULL e CASCADE rejeitados, ausência de vazamento de dados sensíveis); 10 em `connection-safety.test.ts` (regressão do incidente de conexão, cobrindo os 5 scripts de banco); mais 4 novos em `schema.test.ts` (líquido, após substituir o teste antigo de FK simples). Total: 42 testes novos.
- **Automatizados (suíte completa):** 555 testes no monorepo (151 `apps/api` + 251 `apps/web` + 153 `packages/domain`), todos aprovados — os 509 testes anteriores ao bloco permanecem intactos.
- **Manual/real (somente leitura):** `db:check` e `db:audit:schema -- --phase=after` confirmaram repetidamente TLS ativo e schema pós-Bloco-12 estável.
- **Manual/real (execução única por tentativa válida):** `db:migrate` executado duas vezes — a primeira falhou de forma sanitizada no 5º statement (documentado como incidente, não como reexecução cega); a segunda, com a migration corrigida, teve sucesso.
- **Manual/real (diagnóstico e recuperação, autorizados separadamente):** reexecução isolada de um statement (para capturar o erro real) e reversão de 4 statements — ambos únicos, sanitizados quando possível, e confirmados por auditoria somente leitura antes de qualquer nova escrita.

## 9. Validações Executadas

- `npm ci` — OK.
- `npm run build` — OK (`domain`, `api`, `web`).
- `npm run verify:runtime` — OK, sem leitura de `.env.local`, sem conexão de banco.
- `npm run lint` — OK, sem warnings.
- `npm run typecheck` — OK (`api`, `web`, `domain`).
- `npm run typecheck:api-scripts` — OK.
- `npm run test` — OK, 555/555 testes.
- `npx drizzle-kit check` — "Everything's fine" (para a migration corrigida).
- `npx ddae-engine validate` — Status OK, 0 warnings, 0 errors.
- `npx ddae-engine audit` — Status OK, 0 errors (9 warnings antes deste feedback: 7 gates + 2 P2 legítimas não relacionadas; após este feedback, a P2 do membro responsável some da lista).
- `npm audit --omit=dev` — 0 vulnerabilidades.
- `npm audit` — 4 vulnerabilidades moderadas, cadeia de desenvolvimento `drizzle-kit`→`esbuild`, inalterado.
- `npm ls mysql2 drizzle-orm drizzle-kit react-router react-router-dom` — `mysql2@3.23.1`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `react-router@8.3.0`; `react-router-dom` ausente.
- `packages/domain/dist/index.js` — confirmado existente após o build final.

## 10. Decisões Técnicas

- **DT-09 registrada** (`Docs/02_architecture/decisoes_tecnicas.md`): integridade composta do membro responsável, incluindo o desvio de `SET NULL` para `RESTRICT` e o incidente completo.
- **RESTRICT em vez de SET NULL** — não estava no plano original; forçado pelo erro MySQL `3823`. Decisão tomada com o proprietário, não unilateralmente (ver seção "Problemas Encontrados").
- Auditor de integridade reaproveita `EXPECTED_APPLICATION_TABLES`, `SchemaAuditError`, `parseAuditPhase` e `assertAuditEnvironmentAllowed` de `schema-audit.ts` em vez de duplicar — mesmo padrão de composição já usado desde o Bloco 12.

## 11. Problemas Encontrados

1. **Migration falhou no 5º de 6 statements** (erro MySQL `3823`) — ver Resumo Executivo e DT-09 para a análise completa.
2. **DDL não é transacional no MySQL/InnoDB** — a "transação" do migrator do Drizzle é uma abstração JS; cada `ALTER TABLE`/`CREATE INDEX` individual já é permanentemente commitado pelo MySQL, então uma falha no meio de uma migration multi-statement deixa alterações parciais reais no banco, não revertidas automaticamente.
3. **Defeito de segurança pré-existente descoberto durante o pré-flight:** `mysql.createConnection(...)` chamado fora do `try/catch` nos 5 scripts de banco (existente desde o Bloco 11) — uma falha de conexão real (`ENOTFOUND`, serviço Aiven temporariamente desligado) imprimiu o hostname real no terminal antes de qualquer sanitização.

## 12. Correções Aplicadas Durante o Bloco

- Schema alterado de `ON DELETE SET NULL` para `ON DELETE RESTRICT` na FK composta; migration regenerada do zero (arquivo e snapshot antigos removidos, journal restaurado) antes de qualquer nova tentativa.
- Os 5 scripts de banco corrigidos para estabelecer a conexão dentro do `try` e fechar com `connection?.end()` — nenhuma falha de conexão futura deve mais escapar sem sanitização.
- Estado parcial de `finanhouse_dev` revertido com 4 statements de recuperação, autorizados separadamente e confirmados por auditoria antes de prosseguir.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._ A P2 histórica de `financial_entries.responsible_member_id` (Blocos 03/04) está **encerrada** — ver DT-09. Persistência real completa (repositórios Drizzle, endpoints de API, integração do frontend) não é uma pendência nova deste bloco — é o que resta do RF-05 original, tratado como roadmap funcional (não uma condição bloqueadora encontrada aqui).

### P3 — Melhoria Recomendada

- Smoke-test de `db:seed:dev` contra o schema completo (`0000`+`0001`) continua recomendado antes do primeiro uso.
- 4 vulnerabilidades moderadas conhecidas na cadeia de desenvolvimento de `drizzle-kit` seguem sem correção não-breaking disponível — mesmo status de blocos anteriores.

### P4 — Opcional

- Avaliar, em bloco futuro, se o padrão de scripts de diagnóstico/recuperação temporários (criados, executados, removidos, nunca versionados) usado neste incidente deveria virar uma convenção documentada formalmente para futuras correções de schema.

## 14. Riscos Restantes

- Qualquer tabela nova (ex.: `category_budgets`) exigirá uma migration incremental futura, gerada e revisada da mesma forma — nunca edição manual de `0000` ou `0001`.
- Qualquer futuro `DELETE` físico de um `household_member` referenciado por alguma movimentação será bloqueado pelo banco (RESTRICT) — comportamento novo, documentado em DT-09 para não ser redescoberto por acidente.

## 15. Evidências

- Diagnóstico do incidente: `code: ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN`, `errno: 3823`, `sqlMessage: Column 'responsible_member_id' cannot be used in a check constraint 'financial_entries_responsible_member_household_check': needed in a foreign key constraint 'financial_entries_responsible_member_household_fk' referential action.`
- Auditoria pós-recuperação (`--phase=before`, segunda vez): `FK simples antiga presente: sim` · `Coluna auxiliar presente: não` — confirma o retorno ao estado pós-Bloco-12.
- Auditoria pós-migration corrigida (`--phase=after`): `Migrations registradas: 2` · `Coluna auxiliar presente e nullable: sim` · `FK composta presente, DELETE_RULE=RESTRICT: sim` · `CHECK constraint presente: sim`.
- `npm run test` (raiz): `Test Files 13 passed (13)` / `Tests 151 passed (151)` em `apps/api`; `Test Files 31 passed (31)` / `Tests 251 passed (251)` em `apps/web`; `Test Files 8 passed (8)` / `Tests 153 passed (153)` em `packages/domain` — total 555.
- `npx ddae-engine validate`: `Status: OK · Warnings: 0 · Errors: 0`.
- `npm audit --omit=dev`: `found 0 vulnerabilities`.
- Hash SHA-256 da migration quebrada (nunca aplicada com sucesso, nunca versionada): `daf84eb4dd75e6ece7c7ad49a0f109eb5f6480035ae4d51ad42c0efe460a65f5`.
- Hash SHA-256 da migration corrigida (aplicada e versionada): `7633a51b8d541182619a98e91415b46b4051645d0187ed67a54c56ac32990f57`.

## 16. Resultado Final

- [ ] Bloco concluído conforme escopo
- [x] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Nenhum bloco novo deve ser criado nesta sessão como consequência direta deste — por instrução explícita do proprietário. O próximo passo natural, quando autorizado, é um bloco de implementação de repositórios Drizzle reais e endpoints de API sobre o schema completo (`0000`+`0001`) agora em `finanhouse_dev`, substituindo gradualmente os repositórios em memória.

## 18. Commit Semântico Sugerido

```
feat(database): garantir integridade do membro responsável
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário. Já confirmado explicitamente pelo proprietário nesta sessão (duas autorizações separadas: recuperação do estado parcial e aplicação da migration corrigida)._
