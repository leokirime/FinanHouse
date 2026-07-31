# Bloco 11 — Migração da infraestrutura MySQL para Aiven

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-30

## 1. Objetivo

Preparar código e arquitetura do Finanhouse para o Aiven for MySQL (configuração centralizada, TLS estrito, separação dev/prod, scripts protegidos), sem conectar ao banco real, sem aplicar migrations e sem receber nenhuma credencial.

## 2. Contexto

A Clever Cloud (Blocos 02–04) teve seu TLS diagnosticado como incompatível com a política de produção (`rejectUnauthorized: true` falhando com `HANDSHAKE_SSL_ERROR`) e nunca corrigido — pendência P2 em aberto desde o Bloco 04. O proprietário criou externamente um projeto Aiven (`finanhouse`, serviço `finanhouse-mysql`, MySQL 8.4, plano Free) com banco de desenvolvimento (`finanhouse_dev`) e usuário de aplicação (`finanhouse_dev_app`) e decidiu trocar de provedor em vez de continuar tentando corrigir o TLS na Clever Cloud. Ver `Docs/02_architecture/decisoes_tecnicas.md` (DT-07) e RF-05 em `Docs/01_product/requisitos_funcionais.md`.

## 3. Problema que Este Bloco Resolve

O projeto não tinha nenhuma configuração de conexão, TLS ou scripts preparados para o novo provedor (Aiven) — sem isso, não é possível sequer tentar uma conexão real de forma segura (com CA, `rejectUnauthorized: true`, separação dev/prod) no próximo bloco.

## 4. Escopo

- Módulo de configuração centralizado e puro (`apps/api/src/config/database-config.ts` + `database-ca.ts`), com todas as validações antes de qualquer conexão.
- Resolução de certificado CA por caminho de arquivo ou Base64 (exatamente uma origem).
- TLS estrito (`rejectUnauthorized: true`, `minVersion: 'TLSv1.2'`, sem override de `checkServerIdentity`).
- Factory de pool `mysql2` sob demanda (`apps/api/src/db/pool.ts`), sem conexão na importação.
- Scripts reais porém não executados: `db:check`, `db:migrate` (exige `CONFIRM_DATABASE_MIGRATION=true`), `db:seed:dev` (bloqueado fora de `development`/`finanhouse_dev`).
- `.env.example` e `.gitignore` atualizados para a nova estrutura de variáveis.
- ~43 testes automatizados cobrindo validação, TLS e CA, sem conexão real.
- Documentação: DT-07, `contrato_banco_dados.md`, `contrato_variaveis_ambiente.md`, READMEs, README da sessão, reconciliação da pendência P2 dos Blocos 03/04.

## 5. Fora de Escopo

- Qualquer conexão real com o Aiven, aplicação de migration ou execução de seed — fica para um bloco futuro, após revisão deste.
- Preenchimento de `apps/api/.env.local` com credenciais reais — feito manualmente pelo proprietário após revisão deste relatório.
- Qualquer feature de produto, alteração de layout ou remoção de teste existente.
- Criação de um novo bloco após este.

## 6. Arquivos e Pastas Envolvidos

- `apps/api/src/config/` (novo: `database-config.ts`, `database-ca.ts`, testes)
- `apps/api/src/db/pool.ts` (novo) + teste
- `apps/api/scripts/` (novo: `db-check.ts`, `db-migrate.ts`, `db-seed-dev.ts`, `lib/sanitize-error.ts`)
- `apps/api/tsconfig.scripts.json` (novo)
- `apps/api/package.json`, `package.json` (raiz), `.env.example`, `.gitignore`
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/03_contracts/contrato_banco_dados.md`, `Docs/03_contracts/contrato_variaveis_ambiente.md`, `Docs/01_product/requisitos_funcionais.md`
- `README.md` (raiz), `apps/api/README.md`, `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`

## 7. Dependências

- Blocos 02–04 (Clever Cloud: inventário, modelagem, diagnóstico de TLS) — contexto histórico que motiva a troca.
- Infraestrutura Aiven já criada externamente pelo proprietário (fora do escopo de código deste bloco).
- `drizzle-orm`, `drizzle-kit`, `mysql2` já instalados desde o Bloco 03.

## 8. Plano de Implementação

1. Confirmar estado real do repositório (branch, working tree) antes de qualquer alteração.
2. Criar branch `feat/session-11-bloco-11-aiven-database` e o bloco/prompt DDAE oficiais.
3. Inspecionar estrutura existente (`package.json`, `.env.example`, `.gitignore`, `drizzle.config.ts`, schema, scripts de inspeção da Clever Cloud) antes de escrever código novo.
4. Implementar `database-ca.ts` (resolução de CA) e `database-config.ts` (validação central), com testes.
5. Implementar a factory de pool `mysql2` com TLS estrito, com teste.
6. Implementar `db-check.ts`, `db-migrate.ts`, `db-seed-dev.ts` e o sanitizador de erro compartilhado.
7. Atualizar `package.json` (raiz e `apps/api`), `.env.example`, `.gitignore`.
8. Atualizar documentação (DT-07, contratos, READMEs, reconciliação da P2).
9. Gerar e preencher o feedback DDAE.
10. Rodar a suíte completa de validações.
11. Revisão de segurança pré-commit.
12. Commit e push apenas da branch (sem merge, sem push a `main`).

## 9. Critérios de Aceite

- [x] Nenhuma conexão real com o Aiven foi estabelecida.
- [x] Nenhuma migration foi aplicada, nenhum seed foi executado.
- [x] Nenhuma credencial real foi solicitada, lida ou exibida.
- [x] `resolveDatabaseConfig` falha antes de qualquer conexão para toda entrada inválida coberta pelos testes.
- [x] TLS estrito (`rejectUnauthorized: true`, `minVersion: 'TLSv1.2'`, sem `checkServerIdentity`) garantido por teste.
- [x] Scripts `db:check`/`db:migrate`/`db:seed:dev` existem, são reais, e não são executados automaticamente por nenhum outro comando.
- [x] Suíte de testes anterior (438) preservada + novos testes (54) passando.
- [x] `mysql2`, `drizzle-orm`, `drizzle-kit`, `react-router@8.3.0` preservados; `react-router-dom` ausente.

## 10. Validações Obrigatórias

- [x] `npm ci`, `npm run clean`, `npm run build`, `npm run verify:runtime`, `npm run lint`, `npm run typecheck`, `npm run typecheck:api-scripts`, `npm run test`.
- [x] `npx ddae-engine validate`, `npx ddae-engine audit`.
- [x] `npm audit --omit=dev` (zero vulnerabilidades), `npm audit` (4 moderadas, dev only).
- [x] `npm ls mysql2 drizzle-orm drizzle-kit react-router react-router-dom`.

## 11. Segurança

Ponto central deste bloco. Nenhuma credencial real é lida, solicitada ou exibida; `apps/api/.env.local` nunca é aberto; nenhum certificado é lido, copiado ou versionado; toda validação falha antes de qualquer tentativa de conexão; TLS nunca é enfraquecido (`rejectUnauthorized` sempre `true`, sem override de verificação de hostname); mensagens de erro nunca incluem host, porta, usuário, senha, caminho do certificado ou conteúdo do certificado — apenas o nome da variável ou regra violada.

## 12. Performance

Não aplicável — nenhum código deste bloco é executado em runtime de produção nesta etapa (scripts não são chamados automaticamente); o pool é criado sob demanda, não por requisição.

## 13. Design System / UX

Não aplicável — nenhuma alteração de interface, layout ou componente visual.

## 14. Riscos

- Preencher `apps/api/.env.local` incorretamente no futuro (ex.: banco errado por ambiente) — mitigado pelas validações de `resolveDatabaseConfig`, que falham antes de conectar.
- Plano Free do Aiven não ter SLA formal e apresentar indisponibilidade por inatividade — risco aceito, documentado em DT-07.
- Confiar que a preparação de código já garante TLS funcional contra o Aiven — mitigado por não declarar TLS validado nesta etapa; a validação real fica para `db:check` executado manualmente.

## 15. Pendências Esperadas

- ~~P2 — Verificação real de TLS contra o Aiven~~ — **encerrada em 2026-07-30** (`db:check` executado manualmente pelo proprietário, TLS ativo confirmado; ver seção 19 do feedback deste bloco).
- **P2** — Aplicação da migration inicial (Bloco 03) continua em aberto — a TLS que a bloqueava foi validada, mas nenhuma migration foi aplicada ainda.
- **P3** — `db:seed:dev` não é idempotente por linha (apenas por execução completa, verificando o usuário de seed); um smoke-test contra `finanhouse_dev` real é recomendado antes do primeiro uso.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_11_migracao_da_infraestrutura_mysql_para_aiven --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
refactor(database): preparar infraestrutura MySQL para Aiven
```
