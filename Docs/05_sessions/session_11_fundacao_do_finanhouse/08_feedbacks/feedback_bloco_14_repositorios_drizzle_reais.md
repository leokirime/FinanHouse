# Feedback — Bloco 14: Repositórios Drizzle reais

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-31

## 1. Resumo Executivo

Implementados os adaptadores Drizzle reais das quatro portas de repositório já existentes na camada de aplicação (`FinancialEntryRepository`, `MonthlyPeriodRepository`, `CategoryRepository`, `HouseholdMemberRepository`), conectando a arquitetura já modelada ao schema aplicado no Aiven (DT-08/DT-09). Durante o checkpoint pré-escrita, o proprietário identificou uma falha real de isolamento: a implementação inicial de `save()` usava `INSERT ... ON DUPLICATE KEY UPDATE`, que no MySQL pode ser acionado por qualquer índice único (não só a chave primária) e não fica limitado por `household_id` — corrigido para checagem explícita de existência/household antes de decidir entre `INSERT` simples e `UPDATE` escopado. Durante a primeira execução autorizada do smoke-test, um segundo bug real foi encontrado e corrigido: o Drizzle envolve todo erro de query em `DrizzleQueryError`, cujo `code`/`sqlMessage` reais ficam em `.cause` — a tradução de erros só olhava o nível superior, fazendo violações de FK/CHECK caírem no fallback genérico em vez da categoria específica de isolamento por household. Após as duas correções, o smoke-test transacional foi aprovado em todos os passos, com rollback confirmado e zero dado residual. RF-05 avança (infraestrutura + schema + repositórios concluídos) mas não é declarada concluída — endpoints de API HTTP e integração do frontend continuam pendentes.

## 2. Objetivo do Bloco

Implementar os adaptadores reais de persistência MySQL/Drizzle para as portas de repositório já existentes no domínio e na camada de aplicação, conectando a arquitetura existente ao schema aplicado no Aiven, preservando isolamento por household, tipos monetários, integridade do membro responsável e ausência de efeitos colaterais durante importação, build e testes unitários.

## 3. Escopo Implementado

- `DrizzleFinancialEntryRepository`, `DrizzleMonthlyPeriodRepository`, `DrizzleCategoryRepository`, `DrizzleHouseholdMemberRepository` + fábrica `createDrizzleRepositories(db)`.
- Mapeadores de dados (dinheiro, datas, enums) entre linhas MySQL e entidades de domínio.
- Tratamento interno da coluna auxiliar `responsible_member_household_id` (DT-09), nunca aceita como entrada nem exposta ao domínio.
- Escrita (`save`) escopada explicitamente por `household_id`, sem upsert (corrigido durante o checkpoint).
- Tradução sanitizada de erros de driver (`persistence-errors.ts`), incluindo o unwrap de `DrizzleQueryError` (corrigido após o primeiro smoke-test).
- Relocação de `categorizeConnectionError` de `apps/api/scripts/lib/` para `apps/api/src/db/sanitize-error.ts` (necessário para reúso a partir de `src/`).
- 99 testes unitários novos, sem conexão real.
- Script de smoke-test transacional (`apps/api/scripts/db-smoke-repositories.ts`, `db:smoke:repositories`), com checkpoint humano obrigatório.
- Documentação: DT-10, RF-05, contrato de banco de dados (seções "Estado atual", "Erros Esperados", "Decisões Pendentes"), READMEs (raiz, `apps/api`, `application`, `infrastructure`), README da sessão.

Não implementado (fora de escopo, conforme o prompt): endpoints HTTP, integração do frontend, porta de repositório para `users`/`households`.

## 4. Arquivos Criados

- `apps/api/src/infrastructure/repositories/drizzle/types.ts`
- `apps/api/src/infrastructure/repositories/drizzle/persistence-errors.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/mappers/enum-guard.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/mappers/financial-entry-mapper.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/mappers/monthly-period-mapper.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/mappers/category-mapper.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/mappers/household-member-mapper.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-category-repository.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-household-member-repository.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-monthly-period-repository.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-financial-entry-repository.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/create-drizzle-repositories.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/index.ts`
- `apps/api/src/infrastructure/repositories/drizzle/test-support/fake-drizzle-db.ts`
- `apps/api/src/db/sanitize-error.ts` (+ `.test.ts`)
- `apps/api/src/db/smoke-repositories-guard.ts` (+ `.test.ts`)
- `apps/api/scripts/db-smoke-repositories.ts`

## 5. Arquivos Alterados

- `apps/api/scripts/db-check.ts`, `db-migrate.ts`, `db-seed-dev.ts`, `db-audit-schema.ts`, `db-audit-responsible-member-integrity.ts` — import de `categorizeConnectionError` atualizado para `../src/db/sanitize-error.js`.
- `apps/api/package.json`, `package.json` (raiz) — script `db:smoke:repositories`.
- `apps/api/src/application/README.md`, `apps/api/src/infrastructure/README.md`.
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-10), `Docs/01_product/requisitos_funcionais.md` (RF-05), `Docs/03_contracts/contrato_banco_dados.md`.
- `README.md`, `apps/api/README.md`.
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`, `05_blocks/bloco_14_repositorios_drizzle_reais.md`, `06_prompts/prompt_bloco_14_repositorios_drizzle_reais.md`.

## 6. Arquivos Removidos

- `apps/api/scripts/lib/sanitize-error.ts` (relocado para `apps/api/src/db/sanitize-error.ts`).

## 7. Comandos Executados

```
npx ddae-engine block create "Repositórios Drizzle reais" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_14_repositorios_drizzle_reais --session session_11_fundacao_do_finanhouse
npm run build / verify:runtime / lint / typecheck / typecheck:api-scripts / test
npx drizzle-kit check
npx ddae-engine validate / audit
npm audit --omit=dev / npm audit
npm run db:check
npm run db:audit:schema -- --phase=after
npm run db:audit:responsible-member -- --phase=after
CONFIRM_REPOSITORY_SMOKE=true npm run db:smoke:repositories   (3 execuções: 2 diagnósticas autorizadas + 1 final aprovada)
npx ddae-engine feedback create --block bloco_14_repositorios_drizzle_reais --session session_11_fundacao_do_finanhouse
```

## 8. Testes Realizados

- 99 testes unitários novos, sem conexão real: mapeadores (dinheiro, datas, enums, round-trip), tradução de erros (incluindo o unwrap de `DrizzleQueryError`), repositórios via double (`FakeDrizzleDb`) cobrindo leitura, escrita escopada por household, rejeição de escrita cruzada, ausência de upsert, ausência de conexão durante importação.
- Smoke-test transacional real contra `finanhouse_dev`: leitura de categoria/membro via repositórios reais, criação de competência e movimentações via repositório, leitura após escrita, preenchimento interno da coluna auxiliar, rejeição de responsável de outro household, isolamento de leitura entre households, atualização suportada, rollback intencional, ausência de dado residual — todos aprovados na execução final.
- Suíte completa preservada: 654+ testes (api/web/domain), todos verdes após as correções.

## 9. Validações Executadas

- `ddae-engine validate`: OK, 0 warnings/erros.
- `ddae-engine audit`: OK, apenas os 7 quality gates pendentes (mais o feedback deste bloco, resolvido por este próprio documento) — 0 pendências P1/P2.
- `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts`: todos aprovados.
- `npx drizzle-kit check`: sem divergências.
- `npm audit --omit=dev`: 0 vulnerabilidades. `npm audit`: 4 moderadas, dev-only, já documentadas (P3 pré-existente).
- `db:check` / `db:audit:schema -- --phase=after` / `db:audit:responsible-member -- --phase=after`: aprovados antes e depois do smoke-test.

## 10. Decisões Técnicas

Registradas em `Docs/02_architecture/decisoes_tecnicas.md`, DT-10 — inclui a correção do upsert (isolamento explícito por household na escrita) e o bug do unwrap de `DrizzleQueryError`, ambos com narrativa completa do incidente.

## 11. Problemas Encontrados

1. **Upsert sem escopo de household** (encontrado no checkpoint, antes de qualquer escrita real): `save()` usava `ON DUPLICATE KEY UPDATE`, que no MySQL pode ser acionado por qualquer índice único e não fica limitado por `household_id` — risco real de sobrescrever silenciosamente um registro de outro household em caso de colisão de `id`, ou mascarar um conflito de unicidade legítimo como atualização.
2. **`DrizzleQueryError` não desembrulhado** (encontrado na primeira execução autorizada do smoke-test): `translatePersistenceError` só inspecionava o erro de nível superior; o Drizzle envolve todo erro de query real em `DrizzleQueryError`, cujo `code`/`sqlMessage` reais ficam em `.cause`. O cenário "responsável de outro household deve ser rejeitado" falhou porque a violação real da FK composta caía no fallback genérico (`UnexpectedPersistenceError`) em vez de `HouseholdScopeViolationError`.

## 12. Correções Aplicadas Durante o Bloco

1. `save()` de `DrizzleFinancialEntryRepository`/`DrizzleMonthlyPeriodRepository` reescrito: `SELECT` de existência/household → `INSERT` simples (novo registro) ou `UPDATE ... WHERE id = ? AND household_id = ?` (registro existente no household correto) → `HouseholdScopeViolationError` explícito quando o `id` pertence a outro household. Adicionados 8 testes novos (incluindo verificação estática de ausência de `onDuplicateKeyUpdate`) e ajustado o smoke-test para também verificar leitura de `categories`/`household_members` via seus repositórios reais (não só a inserção sintética direta).
2. `translatePersistenceError` ganhou `unwrapDriverError`, que desembrulha um nível de `.cause` quando o erro de topo não tem `code` mas sua causa tem. Diagnosticado com um log temporário e não commitado (autorizado explicitamente pelo proprietário, mesma exceção pontual de DT-09 para erros de schema/constraint sem credenciais), removido após confirmação da causa raiz. 4 testes de regressão adicionados simulando o formato `DrizzleQueryError`.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._

### P3 — Melhoria Recomendada

- Endpoints de API HTTP e integração do frontend com a API (RF-05) — próximo passo natural do roadmap, não uma pendência deste bloco.
- `nextId()` via `information_schema.TABLES.AUTO_INCREMENT` não é atômico sob múltiplos escritores concorrentes — documentado explicitamente no código; se o projeto algum dia precisar de concorrência real, reestruturar para usar `insertId` nativo do `INSERT`.

### P4 — Opcional

- Formalizar a convenção de scripts/logs de diagnóstico temporários (usada nos Blocos 13 e 14) em algum documento de processo, caso volte a se repetir.
- Avaliar se `users`/`households` precisam de porta de repositório própria quando um bloco futuro exigir persisti-los diretamente (hoje nenhum serviço de aplicação precisa disso).

## 14. Riscos Restantes

Nenhum risco novo introduzido pela camada de persistência real além dos já documentados (concorrência de `nextId()`, ausência de porta para `users`/`households`). O risco de isolamento por household na escrita (upsert) foi identificado e eliminado antes de qualquer escrita real acontecer.

## 15. Evidências

- Saída do smoke-test aprovado (execução final): todos os passos "aprovado"/"sim (esperado)", `Rollback intencional executado com sucesso — nenhum dado deve ter persistido.`, `Contagens finais: idênticas às iniciais (nenhum dado residual).`
- `db:audit:schema -- --phase=after` e `db:audit:responsible-member -- --phase=after` aprovados antes e depois do smoke, com as mesmas seis tabelas, duas migrations, zero registros, FK `RESTRICT` e `CHECK` presentes em ambas as auditorias.
- `ddae-engine audit`: 0 pendências P1/P2 antes e depois deste bloco.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo

## 17. Próximo Bloco Recomendado

Bloco 15 (não criado nesta sessão) — endpoints de API HTTP sobre os repositórios reais implementados aqui, como próximo passo de RF-05.

## 18. Commit Semântico Sugerido

```
feat(api): implementar repositórios Drizzle reais
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
