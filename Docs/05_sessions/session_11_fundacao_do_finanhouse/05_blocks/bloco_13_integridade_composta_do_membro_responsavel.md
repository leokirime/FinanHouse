# Bloco 13 — Integridade composta do membro responsável

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-31

## 1. Objetivo

Eliminar a pendência P2 relacionada a `financial_entries.responsible_member_id`, garantindo diretamente no MySQL que o membro responsável pertence ao mesmo household da movimentação.

## 2. Contexto

Desde o Bloco 03, `responsible_member_id` tinha apenas FK simples para `household_members.id` — a consistência "pertence ao mesmo household" dependia inteiramente da camada de serviço, registrada como pendência P2 nos feedbacks dos Blocos 03 e 04. Com o Bloco 12 (DT-08) aplicando a migration inicial e o Bloco 11 (DT-07) validando TLS real, essa era a única pendência estrutural restante antes de iniciar repositórios reais. Ver RF-05 em `Docs/01_product/requisitos_funcionais.md`.

## 3. Problema que Este Bloco Resolve

Um bug em um futuro repositório poderia associar a uma movimentação um `household_member` de outro household, e o MySQL não acusaria nada — a única salvaguarda era disciplina de código, não uma garantia estrutural.

## 4. Escopo

- Coluna auxiliar nullable `responsible_member_household_id` em `financial_entries`.
- FK composta `(responsible_member_id, responsible_member_household_id) → household_members(id, household_id)`.
- `CHECK` garantindo a coluna auxiliar sincronizada com `household_id`.
- `unique(id, household_id)` em `household_members` como alvo da FK.
- Migration incremental versionada, sem alterar a migration inicial.
- Auditoria de schema somente leitura específica (`db-audit-responsible-member-integrity.ts`), com testes unitários.
- Checkpoint humano obrigatório antes de qualquer escrita remota.
- Encerramento da P2 nos Blocos 03/04; nova decisão técnica (DT-09).

## 5. Fora de Escopo

- Repositórios Drizzle reais, endpoints de API, integração do frontend.
- `category_budgets` ou qualquer tabela nova.
- `finanhouse_prod` ou qualquer alteração em produção.
- Seed de dados sintéticos.
- Criação de um Bloco 14.

## 6. Arquivos e Pastas Envolvidos

- `apps/api/src/db/schema/financial-entries.ts`, `household-members.ts` (+ testes)
- `apps/api/src/db/responsible-member-integrity-audit.ts` (novo) + teste
- `apps/api/scripts/db-audit-responsible-member-integrity.ts` (novo)
- `database/migrations/0001_responsible_member_household_integrity.sql` (novo, gerado)
- `Docs/02_architecture/decisoes_tecnicas.md` (nova DT-09), `Docs/03_contracts/contrato_banco_dados.md`, `Docs/01_product/requisitos_funcionais.md`
- `database/proposed-schema/modelo-logico.md`, `database/proposed-schema/relacionamentos.md`, `database/migrations/README.md`
- `README.md`, `apps/api/README.md`, `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`
- Correção incidental de segurança: `apps/api/scripts/db-check.ts`, `db-migrate.ts`, `db-seed-dev.ts`, `db-audit-schema.ts` (conexão estabelecida fora do `try/catch` — corrigido).
- Nenhuma alteração em `database/migrations/0000_initial_financial_domain.sql`.

## 7. Dependências

- Bloco 12 integrado (`6f3bb64`), migration inicial aplicada, TLS validado (Bloco 11, DT-07).
- Reconciliação documental pós-migration integrada (`docs/reconciliar-pendencias-pos-migration`).

## 8. Plano de Implementação

1. Confirmar estado real do repositório (branch `main` em `e1db6dd`).
2. Criar branch, bloco e prompt DDAE oficiais do Bloco 13.
3. Inspecionar modelo atual (schema, migration, testes, contratos) antes de qualquer conexão.
4. Implementar coluna auxiliar, FK composta, CHECK e índice no schema Drizzle.
5. Gerar a migration incremental (`drizzle-kit generate`), revisão estática, `drizzle-kit check`.
6. Implementar o auditor específico de integridade (`responsible-member-integrity-audit.ts` + script + testes).
7. Validações locais completas; pré-flight real somente leitura.
8. Checkpoint obrigatório; aguardar autorização explícita.
9. Aplicar a migration — **primeira tentativa falhou** (erro MySQL 3823, `ON DELETE SET NULL` incompatível com a `CHECK`); diagnosticada com script temporário; corrigida para `ON DELETE RESTRICT`; estado parcial revertido (autorização separada); migration corrigida reaplicada com sucesso (segunda autorização).
10. Auditoria pós-migration; documentação (DT-09 incluindo o incidente completo); encerramento da P2.
11. Feedback DDAE, validações finais, revisão de segurança, commit, push, integração à `main`.

## 9. Critérios de Aceite

- [x] Migration inicial (`0000`) não alterada.
- [x] Migration incremental (`0001`) aplicada uma única vez com sucesso, somente em `finanhouse_dev`.
- [x] FK composta presente, `DELETE_RULE=RESTRICT`; `CHECK` presente; coluna auxiliar nullable.
- [x] Seis tabelas preservadas, todas com zero registros; journal com duas migrations.
- [x] P2 do membro responsável (Blocos 03/04) encerrada; RF-05 não declarado concluído.
- [x] Incidente da primeira tentativa documentado em DT-09 e no feedback deste bloco.

## 10. Validações Obrigatórias

- [x] `npm ci`, `npm run build`, `npm run verify:runtime`, `npm run lint`, `npm run typecheck`, `npm run typecheck:api-scripts`, `npm run test`.
- [x] `npx drizzle-kit check`.
- [x] `npx ddae-engine validate`, `npx ddae-engine audit`, `npm audit --omit=dev`, `npm audit`, `npm ls mysql2 drizzle-orm drizzle-kit react-router react-router-dom`.

## 11. Segurança

Ponto central deste bloco. Checkpoint humano obrigatório antes de qualquer escrita remota, solicitado duas vezes devido ao incidente. Um defeito de segurança real e pré-existente (desde o Bloco 11) foi descoberto e corrigido nesta execução: os scripts de banco estabeleciam a conexão `mysql.createConnection` fora do `try/catch`, fazendo uma falha de conexão (ex.: `ENOTFOUND`) escapar sem sanitização e imprimir o host real no terminal — corrigido nos 5 scripts, com 10 testes de regressão. Durante o diagnóstico do erro 3823, o texto bruto do erro do MySQL foi exibido uma vez, com autorização explícita e pontual do proprietário — exceção justificada porque erros de DDL/constraint não contêm host/usuário/senha. `apps/api/.env.local` e o certificado CA nunca foram abertos.

## 12. Performance

Não aplicável — duas migrations DDL aplicadas uma vez cada; nenhuma consulta de aplicação introduzida.

## 13. Design System / UX

Não aplicável — nenhuma alteração de interface.

## 14. Riscos

- DDL não ser transacional no MySQL — **materializou-se** nesta execução (a causa do estado parcial); mitigado com auditoria somente leitura antes/depois e recuperação controlada, ambas com autorização explícita separada.
- Diagnosticar uma falha real de banco sem violar a política de nunca exibir dados sensíveis — resolvido pedindo autorização pontual e explícita, específica para esse diagnóstico, e confirmando que erros de DDL/constraint não contêm credenciais.

## 15. Pendências Esperadas

- **P2** — Repositórios Drizzle reais, endpoints de API e integração do frontend com a API continuam pendentes; RF-05 não é declarado concluído.
- **P3** — Smoke-test de `db:seed:dev` contra o schema completo (0000+0001) continua recomendado antes do primeiro uso.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_13_integridade_composta_do_membro_responsavel --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
feat(database): garantir integridade do membro responsável
```
