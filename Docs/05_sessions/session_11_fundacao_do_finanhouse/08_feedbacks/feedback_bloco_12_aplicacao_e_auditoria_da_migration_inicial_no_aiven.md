# Feedback — Bloco 12: Aplicação e auditoria da migration inicial no Aiven

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-31

## 1. Resumo Executivo

Este bloco aplicou, de forma controlada e com checkpoint humano obrigatório, a migration inicial versionada (gerada e revisada desde o Bloco 03) ao banco de desenvolvimento real `finanhouse_dev` no Aiven. Antes de qualquer escrita remota, foi implementado um script reutilizável de auditoria de schema somente leitura (`apps/api/scripts/db-audit-schema.ts` + módulo puro `apps/api/src/db/schema-audit.ts`, 17 testes unitários sem conexão real), usado para confirmar o estado do banco antes e depois da migration. A migration só foi executada após o proprietário responder exatamente a frase de autorização "AUTORIZO MIGRATION FINANHOUSE_DEV", em resposta a um relatório de checkpoint apresentado com todas as validações locais e o pré-flight real (somente leitura) já aprovados.

A migration foi aplicada uma única vez (`CONFIRM_DATABASE_MIGRATION=true npm run db:migrate`) e concluída com sucesso. A auditoria pós-migration confirmou as seis tabelas esperadas (`users`, `households`, `household_members`, `categories`, `monthly_periods`, `financial_entries`), o journal do Drizzle (`__drizzle_migrations`) com exatamente uma migration registrada, e **zero registros em todas as tabelas** — nenhum seed foi executado, nenhum dado real ou sintético foi inserido. `finanhouse_prod` continua inexistente; nenhuma alteração foi feita em produção.

A pendência P2 de aplicação da migration inicial (aberta desde o Bloco 04) está **encerrada**, registrada em DT-08. RF-05 **não** é declarado concluído: repositórios Drizzle reais, endpoints de API e integração do frontend com a API continuam pendentes — a aplicação em produção segue lendo/escrevendo apenas o estado em memória. Nenhuma credencial foi lida, exibida ou versionada; `apps/api/.env.local` e o certificado CA nunca foram abertos por este processo.

## 2. Objetivo do Bloco

Aplicar de forma controlada a migration inicial versionada no banco de desenvolvimento `finanhouse_dev`, auditar o schema resultante, registrar as evidências operacionais, encerrar a P2 referente à migration inicial e integrar o bloco à main.

## 3. Escopo Implementado

Implementado integralmente conforme planejado em `05_blocks/bloco_12_aplicacao_e_auditoria_da_migration_inicial_no_aiven.md`, sem divergência de escopo:

- Revisão estática da migration (6 `CREATE TABLE`, hash SHA-256, ausência de comandos destrutivos/dados) — nenhuma alteração no SQL, que já existia desde o Bloco 03.
- Módulo puro de auditoria de schema (`schema-audit.ts`) + script CLI somente leitura (`db-audit-schema.ts`), com 17 testes unitários (acima do piso de 14 pedido), sem nenhuma conexão real em nenhum teste.
- Checkpoint humano obrigatório antes de qualquer escrita remota — apresentado, aguardado, e autorizado explicitamente pelo proprietário.
- Aplicação única da migration versionada via `db:migrate`.
- Auditoria pós-migration confirmando schema completo e ausência de dados.
- Documentação: DT-08, contratos, READMEs, RF-05, encerramento exclusivo da P2 de migration.

## 4. Arquivos Criados

- `apps/api/src/db/schema-audit.ts`
- `apps/api/src/db/schema-audit.test.ts`
- `apps/api/scripts/db-audit-schema.ts`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_12_aplicacao_e_auditoria_da_migration_inicial_no_aiven.md` (este arquivo)

## 5. Arquivos Alterados

- `apps/api/package.json` (novo script `db:audit:schema`)
- `package.json` (raiz — novo script `db:audit:schema` com forwarding de `--phase`)
- `Docs/02_architecture/decisoes_tecnicas.md` (nova DT-08; seção 5 "Decisões Pendentes" — P2 de migration encerrada)
- `Docs/03_contracts/contrato_banco_dados.md` (estado atual, seção 3 e seção 12 atualizadas — schema aplicado em `finanhouse_dev`)
- `Docs/03_contracts/contrato_variaveis_ambiente.md` (seção 10 — pendência de migration encerrada)
- `Docs/01_product/requisitos_funcionais.md` (RF-05 — persistência real em andamento, não concluída)
- `README.md` (raiz — estado atual do Bloco 12)
- `apps/api/README.md` (novo script `db:audit:schema`, status atualizado)
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md` (novo parágrafo do Bloco 12, tabela de blocos, riscos)
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_12_aplicacao_e_auditoria_da_migration_inicial_no_aiven.md` (preenchido — estava com placeholders)
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/06_prompts/prompt_bloco_12_aplicacao_e_auditoria_da_migration_inicial_no_aiven.md` (preenchido — estava com placeholders)

## 6. Arquivos Removidos

- Nenhum.

## 7. Comandos Executados

```
npx ddae-engine block create "Aplicação e auditoria da migration inicial no Aiven" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_12_aplicacao_e_auditoria_da_migration_inicial_no_aiven --session session_11_fundacao_do_finanhouse
npx ddae-engine feedback create --block bloco_12_aplicacao_e_auditoria_da_migration_inicial_no_aiven --session session_11_fundacao_do_finanhouse
npx vitest run src/db/schema-audit.test.ts
npx tsc -p tsconfig.scripts.json
npm ci
npm run clean
npm run build
npm run verify:runtime
npm run lint
npm run typecheck
npm run typecheck:api-scripts
npm run test
npx drizzle-kit check
npx ddae-engine validate
npx ddae-engine audit
npm audit --omit=dev
npm audit
npm ls mysql2 drizzle-orm drizzle-kit react-router react-router-dom
npm run db:check                              # pré-flight (antes) e pós-migration (depois) — real, somente leitura
npm run db:audit:schema -- --phase=before      # real, somente leitura — executado duas vezes (pré-flight e revalidação pós-autorização)
CONFIRM_DATABASE_MIGRATION=true npm run db:migrate   # real, execução única, após autorização explícita
npm run db:audit:schema -- --phase=after       # real, somente leitura, pós-migration
git status / git status --short / git diff --stat / git diff --name-only
git check-ignore -v apps/api/.env.local
git check-ignore -v ca.pem
git check-ignore -v aiven-ca.pem
```

## 8. Testes Realizados

- **Automatizados (novos):** 17 testes em `schema-audit.test.ts` — fase inválida rejeitada, `--phase=before`/`after` aceitas; ambiente/banco permitido (`development`/`finanhouse_dev`) aceito, `production`/banco errado rejeitados; estado `before` vazio aceito, tabela parcial rejeitada, journal já existente rejeitado; estado `after` completo aceito, tabela ausente rejeitada, journal ausente rejeitado, tabela com dados rejeitada; mensagens de erro nunca mencionam host/porta/usuário/senha; script `db-audit-schema.ts` nunca contém comando destrutivo (DDL/DML) e sempre fecha a conexão em `finally`.
- **Automatizados (suíte completa):** 509 testes no monorepo (105 `apps/api` + 251 `apps/web` + 153 `packages/domain`), todos aprovados — os 492 testes anteriores ao bloco permanecem intactos.
- **Manual/real (somente leitura, antes da autorização):** `db:check` e `db:audit:schema -- --phase=before` executados duas vezes contra o Aiven real (pré-flight inicial e revalidação imediatamente após a autorização) — ambos confirmaram TLS ativo, banco `finanhouse_dev` vazio, journal ausente.
- **Manual/real (execução única, após autorização):** `db:migrate` executado uma única vez, com sucesso. `db:check` e `db:audit:schema -- --phase=after` executados uma vez cada, confirmando o schema completo e vazio.

## 9. Validações Executadas

- `npm ci` — OK.
- `npm run build` — OK (`domain`, `api`, `web`).
- `npm run verify:runtime` — OK, sem leitura de `.env.local`, sem conexão de banco.
- `npm run lint` — OK, sem warnings.
- `npm run typecheck` — OK (`api`, `web`, `domain`).
- `npm run typecheck:api-scripts` — OK (inclui `db-audit-schema.ts`).
- `npm run test` — OK, 509/509 testes.
- `npx drizzle-kit check` — "Everything's fine" (dentro de `apps/api`).
- `npx ddae-engine validate` — Status OK, 0 warnings, 0 errors.
- `npx ddae-engine audit` — Status OK, 0 errors (11 warnings antes da migration: 7 gates + P2 blocos 03/04/11 já conhecidas + aviso esperado "bloco sem feedback", resolvido ao criar este arquivo).
- `npm audit --omit=dev` — 0 vulnerabilidades.
- `npm audit` — 4 vulnerabilidades moderadas, todas na cadeia de desenvolvimento `drizzle-kit` → `esbuild`, inalterado.
- `npm ls mysql2 drizzle-orm drizzle-kit react-router react-router-dom` — `mysql2@3.23.1`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `react-router@8.3.0`; `react-router-dom` ausente.
- `packages/domain/dist/index.js` — confirmado existente após o build final.

## 10. Decisões Técnicas

- **DT-08 registrada** (`Docs/02_architecture/decisoes_tecnicas.md`): schema inicial versionado aplicado ao Aiven DEV; migration como única fonte de DDL; seed separado da migration; `category_budgets` e futuras tabelas exigem migrations incrementais.
- Script de auditoria colocado em `apps/api/scripts/db-audit-schema.ts` com lógica pura extraída para `apps/api/src/db/schema-audit.ts` — mesmo padrão de separação já usado por `database-config.ts`/`database-ca.ts` no Bloco 11, para permitir testes unitários sem qualquer conexão real.
- Restrição de ambiente da auditoria (`assertAuditEnvironmentAllowed`) é mais estrita que `resolveDatabaseConfig`: só aceita `development`/`finanhouse_dev`, nunca `test`/`production` — decisão de implementação local, não registrada como DT por ser reversível e contida a um script.

## 11. Problemas Encontrados

- Nenhum problema técnico foi encontrado durante a implementação, os testes locais ou a execução real (pré-flight, migration, auditoria pós-migration). A migration foi aplicada de primeira, sem erro.

## 12. Correções Aplicadas Durante o Bloco

- Nenhuma correção de código foi necessária durante a execução.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

- **Persistência real incompleta (RF-05)** — infraestrutura, TLS e schema já disponíveis no Aiven, mas repositórios Drizzle reais, endpoints de API e integração do frontend com a API continuam pendentes. Não é uma pendência nova relacionada à migration (essa está encerrada) — é o que resta do RF-05 original.

### P3 — Melhoria Recomendada

- Smoke-test de `db:seed:dev` contra o schema real agora aplicado (comportamento de `$returningId()` do Drizzle nunca foi confirmado contra um banco de verdade).
- Refinamento visual (backlog de design, P3 desde o Bloco 06) permanece pendente, sem relação com este bloco.
- 4 vulnerabilidades moderadas conhecidas na cadeia de desenvolvimento de `drizzle-kit` seguem sem correção não-breaking disponível — mesmo status de blocos anteriores.

### P4 — Opcional

- Avaliar, em bloco futuro, uma flag `--dry-run` para `db:migrate` que liste migrations pendentes sem exigir `CONFIRM_DATABASE_MIGRATION=true`.

## 14. Riscos Restantes

- Plano Free do Aiven não possui SLA formal e pode apresentar indisponibilidade por inatividade (risco já documentado em DT-07, inalterado).
- Qualquer tabela nova (ex.: `category_budgets`, para persistir o Planejamento) exigirá uma migration incremental futura, gerada e revisada da mesma forma — nunca uma edição manual da migration inicial já aplicada.

## 15. Evidências

- Pré-flight (`db:check`): `Conectividade: sucesso`, `Versão do MySQL: 8.4.8`, `Banco ativo corresponde ao configurado: sim`, `TLS ativo: sim`.
- Pré-flight (`db:audit:schema -- --phase=before`, executado duas vezes — antes e após a autorização): `Tabelas da aplicação presentes: 0/6`, `Journal de migration presente: não`, `Auditoria "before" aprovada: banco vazio, pronto para a migration inicial.`
- Execução (`db:migrate`): `Aplicando migrations versionadas em: aiven/development/finanhouse_dev` → `Migrations aplicadas com sucesso.`
- Pós-migration (`db:audit:schema -- --phase=after`): `Tabelas da aplicação presentes: 6/6`, `Migrations registradas no journal: 1`, `Todas as tabelas da aplicação com zero registros: sim`, `Auditoria "after" aprovada: schema completo, sem dados.`
- `npm run test` (raiz): `Test Files 10 passed (10)` / `Tests 105 passed (105)` em `apps/api`; `Test Files 31 passed (31)` / `Tests 251 passed (251)` em `apps/web`; `Test Files 8 passed (8)` / `Tests 153 passed (153)` em `packages/domain` — total 509.
- `npx ddae-engine validate`: `Status: OK · Warnings: 0 · Errors: 0`.
- `npm audit --omit=dev`: `found 0 vulnerabilities`.
- Hash SHA-256 da migration aplicada: `5036d7f978cbd09c88df59664978515d2c9b6cf038c4eac68f94b2a7c0a4c044` (`database/migrations/0000_initial_financial_domain.sql`, inalterado desde o Bloco 03).

## 16. Resultado Final

- [ ] Bloco concluído conforme escopo
- [x] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Nenhum bloco novo deve ser criado nesta sessão como consequência direta deste — por instrução explícita do proprietário. O próximo passo natural, quando autorizado, é um bloco de implementação de repositórios Drizzle reais e endpoints de API sobre o schema agora aplicado em `finanhouse_dev`, substituindo gradualmente os repositórios em memória — mas isso não deve começar automaticamente a partir deste feedback.

## 18. Commit Semântico Sugerido

```
chore(database): aplicar migration inicial no Aiven DEV
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário. Já confirmado explicitamente pelo proprietário nesta sessão (autorização "AUTORIZO MIGRATION FINANHOUSE_DEV" cobre a execução da migration; o commit documental que a registra segue a mesma instrução geral do bloco)._
