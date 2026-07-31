# Bloco 12 — Aplicação e auditoria da migration inicial no Aiven

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-31

## 1. Objetivo

Aplicar de forma controlada a migration inicial versionada no banco de desenvolvimento `finanhouse_dev` do Aiven, auditar o schema resultante e encerrar a P2 de aplicação da migration inicial.

## 2. Contexto

O Bloco 11 (DT-07) migrou a infraestrutura MySQL do Finanhouse para o Aiven e validou TLS real (`db:check`, 2026-07-30), encerrando a P2 de TLS. Restava apenas a P2 de aplicação da migration inicial (gerada e revisada desde o Bloco 03), nunca aplicada a nenhum banco real. Ver RF-05 em `Docs/01_product/requisitos_funcionais.md` e DT-07 em `Docs/02_architecture/decisoes_tecnicas.md`.

## 3. Problema que Este Bloco Resolve

O schema do domínio financeiro (6 tabelas, FKs compostas, checks) existia apenas como código/SQL revisado — nenhum banco real possuía essas tabelas, impedindo qualquer persistência real (RF-05).

## 4. Escopo

- Inspeção da migration versionada, hash SHA-256, revisão estática (6 `CREATE TABLE`, ausência de comandos destrutivos/dados).
- Script reutilizável de auditoria somente leitura do schema remoto (`apps/api/scripts/db-audit-schema.ts` + módulo puro `apps/api/src/db/schema-audit.ts`), com testes unitários sem conexão real.
- Checkpoint humano obrigatório antes de qualquer escrita remota.
- Aplicação única da migration versionada via `db:migrate` (`CONFIRM_DATABASE_MIGRATION=true`), após autorização explícita (`AUTORIZO MIGRATION FINANHOUSE_DEV`).
- Auditoria pós-migration (schema completo, journal registrado, todas as tabelas vazias).
- Documentação: DT-08, contratos, READMEs, RF-05, encerramento da P2 de migration.

## 5. Fora de Escopo

- Seed de dados sintéticos (`db:seed:dev`).
- Repositórios Drizzle reais, endpoints de API, integração do frontend.
- `category_budgets` ou qualquer tabela nova além das seis já aprovadas.
- Criação de `finanhouse_prod` ou qualquer alteração em produção.
- Qualquer novo bloco após este.

## 6. Arquivos e Pastas Envolvidos

- `apps/api/scripts/db-audit-schema.ts` (novo), `apps/api/src/db/schema-audit.ts` (novo) + teste
- `apps/api/package.json`, `package.json` (raiz) — novo script `db:audit:schema`
- `Docs/02_architecture/decisoes_tecnicas.md` (nova DT-08), `Docs/03_contracts/contrato_banco_dados.md`, `Docs/03_contracts/contrato_variaveis_ambiente.md`, `Docs/01_product/requisitos_funcionais.md` (RF-05)
- `README.md`, `apps/api/README.md`, `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`
- Nenhum arquivo de schema Drizzle nem migration SQL alterado (a migration já existia, versionada, desde o Bloco 03).

## 7. Dependências

- Bloco 11 integrado (`e64de2c`), TLS validado, `resolveDatabaseConfig`/`createDatabasePool`/`db-check.ts`/`db-migrate.ts` já existentes e reaproveitados sem duplicação.
- Migration inicial já gerada e revisada desde o Bloco 03 (`database/migrations/0000_initial_financial_domain.sql`).

## 8. Plano de Implementação

1. Confirmar estado real do repositório (branch `main` em `ad11181`).
2. Criar branch, bloco e prompt DDAE oficiais do Bloco 12.
3. Inspecionar migration, scripts existentes e documentação antes de qualquer conexão.
4. Revisão estática da migration (6 tabelas, hash SHA-256, ausência de comandos destrutivos).
5. Implementar `schema-audit.ts` (lógica pura) + `db-audit-schema.ts` (script) + testes.
6. Rodar validações locais completas (build/lint/typecheck/test/drizzle-kit check/ddae/audit).
7. Pré-flight real somente leitura: `db:check` + `db:audit:schema -- --phase=before`.
8. Apresentar checkpoint obrigatório e aguardar a frase exata de autorização.
9. Após autorização: revalidar estado, aplicar a migration uma única vez (`CONFIRM_DATABASE_MIGRATION=true npm run db:migrate`).
10. Auditoria pós-migration: `db:check` + `db:audit:schema -- --phase=after`.
11. Atualizar documentação (DT-08, contratos, READMEs, RF-05), encerrar exclusivamente a P2 de migration.
12. Criar e preencher o feedback DDAE do Bloco 12.
13. Validações finais da branch, revisão de segurança, commit e push.
14. Integrar à `main` (`--no-ff`), validar a main integrada, push final.

## 9. Critérios de Aceite

- [x] Migration aplicada uma única vez, somente em `finanhouse_dev`.
- [x] Seis tabelas criadas, todas com zero registros.
- [x] Journal do Drizzle (`__drizzle_migrations`) criado, com exatamente uma migration registrada.
- [x] Nenhum seed executado, nenhum dado real inserido.
- [x] Nenhuma credencial acessada, exibida ou versionada.
- [x] P2 de migration encerrada; P2 de repositórios/API/frontend permanece aberta.

## 10. Validações Obrigatórias

- [x] `npm ci`, `npm run build`, `npm run verify:runtime`, `npm run lint`, `npm run typecheck`, `npm run typecheck:api-scripts`, `npm run test`.
- [x] `npx drizzle-kit check` (dentro de `apps/api`).
- [x] `npx ddae-engine validate`, `npx ddae-engine audit`, `npm audit --omit=dev`, `npm audit`, `npm ls mysql2 drizzle-orm drizzle-kit react-router react-router-dom`.

## 11. Segurança

Ponto central deste bloco. Checkpoint humano obrigatório antes de qualquer escrita remota; `apps/api/.env.local` e o certificado CA nunca lidos ou exibidos por este processo; TLS estrito preservado (`rejectUnauthorized: true`, verificação padrão de hostname); usuário de aplicação (`finanhouse_dev_app`) usado em vez de `avnadmin`; banco `finanhouse_dev` usado em vez de `defaultdb`/`finanhouse_prod`; `drizzle-kit push` nunca usado; migration aplicada exatamente uma vez, sem SQL manual.

## 12. Performance

Não aplicável — uma única migration DDL aplicada uma vez; nenhuma consulta de aplicação introduzida.

## 13. Design System / UX

Não aplicável — nenhuma alteração de interface.

## 14. Riscos

- Migration falhar a meio caminho, deixando o schema parcial — mitigado por `db:migrate` rodar dentro de uma transação (`session.transaction`) no migrator do Drizzle, e por auditoria pós-migration detectar qualquer tabela ausente.
- Confundir `finanhouse_dev` com `finanhouse_prod` — mitigado por `resolveDatabaseConfig` e por `assertAuditEnvironmentAllowed`, que rejeitam qualquer banco diferente de `finanhouse_dev` em `development`.

## 15. Pendências Esperadas

- **P2** — Repositórios Drizzle reais, endpoints de API e integração do frontend com a API continuam pendentes; RF-05 não é declarado concluído neste bloco.
- **P3** — Smoke-test de `db:seed:dev` contra o schema real agora aplicado continua recomendado antes do primeiro uso.
- **P3** — Refinamento visual (backlog de design) permanece pendente, sem relação com este bloco.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_12_aplicacao_e_auditoria_da_migration_inicial_no_aiven --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
chore(database): aplicar migration inicial no Aiven DEV
```
