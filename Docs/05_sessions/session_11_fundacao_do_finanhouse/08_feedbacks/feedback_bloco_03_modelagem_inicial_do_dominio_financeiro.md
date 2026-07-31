# Feedback — Bloco 03: Modelagem inicial do domínio financeiro

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Resumo Executivo

Com o banco confirmado vazio no Bloco 02, o proprietário aprovou Drizzle ORM + mysql2 como estratégia de persistência (ADR-001). Este bloco modelou as 6 tabelas da fundação do domínio financeiro (`users`, `households`, `household_members`, `categories`, `monthly_periods`, `financial_entries`) como schema Drizzle tipado, gerou a migration inicial via `drizzle-kit generate` (comando estático, sem conexão ao banco) e a revisou manualmente.

Após uma primeira revisão do proprietário, quatro correções foram aplicadas antes do commit: (1) a pendência P2 do Bloco 02 sobre ORM/modelagem foi formalmente encerrada, já resolvida pelo ADR-001; (2) o vocabulário de status de `financial_entries` foi corrigido de `paid`/`payment_date` (linguagem de despesa) para `realized`/`realization_date` (neutro entre receita e despesa); (3) foram implementadas foreign keys **compostas** para `period_id` e `category_id`, garantindo no próprio MySQL que uma movimentação só usa período/categoria do mesmo household — `responsible_member_id` não pôde receber o mesmo tratamento porque o MySQL proíbe `ON DELETE SET NULL` em FK composta com coluna `NOT NULL`, documentado como pendência P2; (4) a migration foi regenerada com nome semântico (`0000_initial_financial_domain.sql`, antes `0000_curvy_masque.sql`) e as vulnerabilidades moderadas de desenvolvimento do `drizzle-kit` foram documentadas como P3 (zero em produção).

A migration não foi aplicada — o banco real na Clever Cloud permanece vazio. Build, lint, typecheck e 26 testes automatizados passam. Trabalho feito na branch `feat/session-11-bloco-03-modelagem-dominio`.

## 2. Objetivo do Bloco

Definir o primeiro modelo de dados do Finanhouse, formalizar a estratégia de persistência (Drizzle + mysql2), implementar o schema tipado e gerar uma migration inicial revisável, sem aplicá-la ao MySQL.

## 3. Escopo Implementado

- Correção da dependência de `database/inspection` (agora workspace próprio com `mysql2` declarado explicitamente, não mais hoisting incidental via `apps/api`).
- Instalação de `drizzle-orm` (dependency) e `drizzle-kit` (devDependency) em `apps/api`.
- ADR-001 (`Docs/02_architecture/adr_001_persistencia_drizzle_mysql2.md`) e atualização de `decisoes_tecnicas.md`, `contrato_banco_dados.md`, `registro_decisoes.md`.
- Modelagem das 6 tabelas em `apps/api/src/db/schema/`, com `relations.ts` e `types.ts`.
- `apps/api/drizzle.config.ts` (sem credenciais, `generate`/`check` não conectam ao banco).
- Migration inicial gerada com nome semântico (`database/migrations/0000_initial_financial_domain.sql`) e validada estaticamente (`drizzle-kit check`).
- Foreign keys compostas `(period_id, household_id)` e `(category_id, household_id)` em `financial_entries`, com `unique(id, household_id)` correspondente em `monthly_periods` e `categories`.
- Vocabulário de status de `financial_entries` corrigido: `planned`/`pending`/`realized`/`cancelled`; `payment_date` renomeado para `realization_date`.
- Documentação do schema proposto em `database/proposed-schema/` (modelo lógico, relacionamentos, extensões futuras).
- Tipos de domínio independentes de framework em `packages/domain/src/` (`category.ts`, `monthly-period.ts`, `financial-entry.ts`).
- Pendência P2 do Bloco 02 (ORM/modelagem) encerrada formalmente no feedback daquele bloco, referenciando este ADR/bloco.
- Vulnerabilidades de desenvolvimento do `drizzle-kit` documentadas como P3 em `database/migrations/README.md`, com evidência de `npm audit --omit=dev` (zero) e `npm audit` (4 moderadas, apenas dev).
- 26 testes automatizados no total: 16 sobre a estrutura do schema Drizzle (tabelas, índices únicos, checks, FKs simples e compostas, vocabulário de status), 8 sobre a migration e o `drizzle.config.ts` (SQL sem comandos destrutivos/credenciais, DECIMAL correto, vocabulário corrigido, FKs compostas no SQL gerado), mais os 2 testes pré-existentes (`/health` da API e tela inicial do web).

## 4. Arquivos Criados

- `Docs/02_architecture/adr_001_persistencia_drizzle_mysql2.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_03_modelagem_inicial_do_dominio_financeiro.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/06_prompts/prompt_bloco_03_modelagem_inicial_do_dominio_financeiro.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_03_modelagem_inicial_do_dominio_financeiro.md` (este arquivo)
- `apps/api/drizzle.config.ts`
- `apps/api/src/db/schema/{users,households,household-members,categories,monthly-periods,financial-entries,index}.ts`
- `apps/api/src/db/relations.ts`, `apps/api/src/db/types.ts`
- `apps/api/src/db/schema/schema.test.ts`, `apps/api/src/db/migration.test.ts`
- `database/migrations/0000_initial_financial_domain.sql`, `database/migrations/meta/0000_snapshot.json`, `database/migrations/meta/_journal.json`
- `database/proposed-schema/{README,modelo-logico,relacionamentos,extensoes-futuras}.md`
- `packages/domain/package.json`, `packages/domain/tsconfig.json`
- `packages/domain/src/{category,monthly-period,financial-entry,index}.ts`

## 5. Arquivos Alterados

- `apps/api/package.json` — `drizzle-orm`, `mysql2` (dependencies); `drizzle-kit` (devDependency)
- `database/inspection/package.json` — `mysql2` declarado explicitamente
- `database/inspection/README.md` — nota sobre a correção de dependência
- `database/migrations/README.md` — status atualizado (migration gerada, não aplicada)
- `packages/domain/README.md` — descrição atualizada
- `package.json` (raiz) — `database/inspection` adicionado a `workspaces`
- `Docs/02_architecture/decisoes_tecnicas.md` — DT-01 registrada (decisão tomada, não mais pendente); nova pendência de TLS
- `Docs/03_contracts/contrato_banco_dados.md` — modelo de dados proposto preenchido, seções de migrações/formatos/decisões pendentes atualizadas
- `Docs/04_governance/registro_decisoes.md` — RD-01 registrada (aprovação do proprietário)
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md` — Bloco 03 registrado, correções pós-revisão refletidas
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_02_inventario_seguro_do_banco_existente.md` — pendência P2 encerrada formalmente (resolvida pelo Bloco 03)
- `apps/api/src/db/schema/financial-entries.ts` — vocabulário `realized`/`realization_date`; FKs compostas para `period_id`/`category_id`; `period_id`/`category_id` sem `.references()` single-column
- `apps/api/src/db/schema/categories.ts`, `apps/api/src/db/schema/monthly-periods.ts` — `unique(id, household_id)` adicionado
- `packages/domain/src/financial-entry.ts` — vocabulário `realized`/`realizationDate`
- `apps/api/src/db/schema/schema.test.ts`, `apps/api/src/db/migration.test.ts` — testes de vocabulário e FKs compostas
- `database/proposed-schema/{modelo-logico,relacionamentos,README}.md`, `database/proposed-schema/extensoes-futuras.md` — vocabulário, FKs compostas, nome da migration
- `database/migrations/README.md` — nome da migration, seção de vulnerabilidades P3

## 6. Arquivos Removidos

- `database/migrations/0000_curvy_masque.sql`, `database/migrations/meta/0000_snapshot.json`, `database/migrations/meta/_journal.json` — removidos antes de regenerar (nunca commitados, nunca aplicados) e substituídos por `0000_initial_financial_domain.sql` e novos metadados.

## 7. Comandos Executados

```
git switch -c feat/session-11-bloco-03-modelagem-dominio
npx ddae-engine block create "Modelagem inicial do domínio financeiro" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_03_modelagem_inicial_do_dominio_financeiro --session session_11_fundacao_do_finanhouse
npm install   (para registrar database/inspection e packages/domain como workspaces)
npm install drizzle-orm && npm install -D drizzle-kit   (dentro de apps/api)
npx drizzle-kit generate   (dentro de apps/api — estático, sem conexão; primeira geração)
npx drizzle-kit check      (dentro de apps/api — estático, sem conexão)
npx ddae-engine audit      (confirmar pendência P2 do Bloco 02 fechada corretamente)
git status --short database/migrations/*.sql   (confirmar untracked antes de remover)
rm database/migrations/0000_curvy_masque.sql && rm -rf database/migrations/meta
npx drizzle-kit generate --name initial_financial_domain   (regeneração com nome semântico)
npx drizzle-kit check      (revalidar consistência sql/snapshot/journal)
npx tsc --noEmit -p apps/api/tsconfig.json
npx tsc -p packages/domain/tsconfig.json
npx oxlint apps/api database/inspection packages/domain
npm run test
npm audit --omit=dev
npm audit
npx ddae-engine feedback create --block bloco_03_modelagem_inicial_do_dominio_financeiro --session session_11_fundacao_do_finanhouse
```

## 8. Testes Realizados

- Automatizado (`apps/api/src/db/schema/schema.test.ts`, 16 testes): exatamente 6 tabelas; nomes corretos; nenhuma coluna FLOAT/DOUBLE; `financial_entries` usa `decimal(13,2)`; `users.email` único; índices únicos compostos em `household_members`, `monthly_periods`, `categories`; `unique(id, household_id)` em `categories`/`monthly_periods`; CHECK constraints presentes por tabela; FKs simples de `financial_entries` (household_id, created_by_user_id) com RESTRICT; FKs de `household_members` com CASCADE; FKs **compostas** de `period_id`/`category_id` apontando para `(id, household_id)` com RESTRICT; FK de `responsible_member_id` confirmada como simples (SET NULL, não composta); vocabulário de status sem `paid`; `realization_date` presente, `payment_date` ausente. Todos passaram.
- Automatizado (`apps/api/src/db/migration.test.ts`, 8 testes): migration sem `DROP`/`TRUNCATE`/`DELETE`/`INSERT`/`GRANT`/`REVOKE`; exatamente 6 `CREATE TABLE`; sem credenciais/host/nome de banco; sem `FLOAT`/`DOUBLE`, com `decimal(13,2)`; sem `paid`/`payment_date`, com `realized`/`realization_date`; FKs compostas de `period_id`/`category_id` presentes no SQL; `unique(id, household_id)` presente no SQL para `categories`/`monthly_periods`; `drizzle.config.ts` sem `dbCredentials` nem valores de conexão. Todos passaram.
- Manual: `npx drizzle-kit generate --name initial_financial_domain` executado e observado — não fez nenhuma tentativa de conexão de rede (comando estático). `npx drizzle-kit check` confirmou consistência ("Everything's fine") tanto na primeira geração quanto após a regeneração.
- Manual: leitura completa do SQL regenerado (`database/migrations/0000_initial_financial_domain.sql`) linha a linha, confirmando FKs simples e compostas, CHECKs, índices, vocabulário corrigido e ausência de comandos destrutivos.
- Manual: `grep` sobre a migration e sobre todos os documentos novos/alterados, confirmando ausência de host, usuário, senha, nome real do banco, e ausência de resíduos de `paid`/`payment_date`/`curvy_masque` fora dos próprios testes que verificam essa ausência.
- Manual: `git status --short database/migrations/*.sql` antes de remover os artefatos antigos, confirmando que nunca haviam sido commitados.

## 9. Validações Executadas

- `npm run build` — OK (api + web)
- `npm run lint` — OK (api + web, incluindo `database/inspection` e `packages/domain` via oxlint direto)
- `npm run typecheck` — OK (api + web); `tsc -p packages/domain/tsconfig.json` — OK
- `npm run test` — 26/26 testes passaram (25 em `apps/api`, 1 em `apps/web`)
- `npx drizzle-kit check` — "Everything's fine" após a regeneração
- `npm audit --omit=dev` — 0 vulnerabilidades
- `npm audit` — 4 moderadas, todas em `drizzle-kit`/`@esbuild-kit/*` (dependências de desenvolvimento)
- `npx ddae-engine validate` / `npx ddae-engine audit` — resultados no relatório final apresentado ao usuário

## 10. Decisões Técnicas

- **Persistência: Drizzle + mysql2** — formalizada em ADR-001, aprovada pelo proprietário. Ver `Docs/02_architecture/decisoes_tecnicas.md` (DT-01) e `Docs/04_governance/registro_decisoes.md` (RD-01).
- **Enums como VARCHAR + CHECK, não `ENUM` nativo do MySQL** — decisão do bloco original (instrução explícita do proprietário), implementada consistentemente em todas as 6 tabelas via `check()` do `drizzle-orm/mysql-core`, para facilitar evolução futura sem `ALTER TYPE`.
- **IDs como `BIGINT UNSIGNED AUTO_INCREMENT`, `mode: 'number'`** — seguindo a preferência inicial do bloco; aceitável para a escala de um sistema de 2 usuários (bem abaixo do limite seguro de `Number.MAX_SAFE_INTEGER`).
- **`database/inspection` promovido a workspace npm próprio** — a forma mais simples entre as três sugeridas (dependência explícita na raiz / workspace próprio / mover para outro workspace) para eliminar a dependência de hoisting incidental do `mysql2`, sem duplicar a dependência desnecessariamente (Drizzle e o script de inspeção continuam usando a mesma versão do driver).
- **Testes de schema usam `getTableConfig` do próprio `drizzle-orm/mysql-core`** em vez de re-parsear o SQL gerado, para validar a fonte de verdade (TypeScript) diretamente.
- **Vocabulário `realized`/`realization_date` em vez de `paid`/`payment_date`** — `financial_entries` representa tanto receitas quanto despesas; "pago" só faz sentido para despesas. `realized` é neutro e alinhado aos conceitos "previsto"/"realizado" já definidos no domínio.
- **Foreign keys compostas para `period_id` e `category_id`, mas não para `responsible_member_id`** — MySQL/InnoDB proíbe `ON DELETE SET NULL` em qualquer FK composta que inclua uma coluna `NOT NULL` (`household_id` é `NOT NULL` em `financial_entries`). Como `responsible_member_id` precisa de `SET NULL` (é opcional), a FK composta foi descartada para essa coluna especificamente; `period_id` e `category_id` são `NOT NULL`, então `RESTRICT` composto funciona sem conflito. Documentado em `database/proposed-schema/relacionamentos.md`.
- **`created_by_user_id` e `closed_by_user_id` permanecem sem validação de household no banco** — decisão explícita (instrução do proprietário): um usuário pode pertencer a múltiplos households, então essa consistência fica na camada de serviço por ora.
- **Migration regenerada em vez de renomeada manualmente** — renomear apenas o arquivo `.sql` deixaria `meta/_journal.json` e `meta/0000_snapshot.json` inconsistentes (o journal referencia o nome do arquivo). A forma correta é remover os três artefatos gerados (nunca commitados) e rodar `drizzle-kit generate --name <nome>` de novo, o que o Drizzle já suporta nativamente via flag `--name`.

## 11. Problemas Encontrados

- Import de módulos internos (`./schema/categories.ts` etc.) inicialmente escrito com extensão `.ts`, que o `tsconfig.json` de `apps/api` (module `NodeNext`, com emissão real de `.js`) rejeita — TypeScript exige extensão `.js` nos specifiers mesmo apontando para arquivos `.ts` fonte. Corrigido em todos os arquivos novos antes do primeiro typecheck limpo.
- Teste inicial de índices únicos usava `getTableConfig().uniqueConstraints`, que só cobre `UNIQUE` declarado via `unique()` em coluna/constraint — `uniqueIndex()` (usado no schema) aparece em `getTableConfig().indexes` com `config.unique = true`. Corrigido lendo a estrutura correta.
- Na primeira versão do schema, `responsible_member_id` foi inicialmente cogitado para FK composta com `SET NULL` — MySQL rejeitaria essa definição na aplicação real (erro de constraint por coluna `NOT NULL` em ação `SET NULL`). Identificado antes de gerar SQL inválido; resolvido mantendo FK simples para essa coluna e documentando a limitação.

## 12. Correções Aplicadas Durante o Bloco

- Extensões de import corrigidas de `.ts` para `.js` em todos os arquivos de `apps/api/src/db/`.
- Teste de índices únicos reescrito para inspecionar `indexes` (não `uniqueConstraints`) do `getTableConfig`.
- `database/inspection` promovido a workspace com dependência própria (ver Decisões Técnicas).
- Pendência P2 do Bloco 02 encerrada formalmente (era falsa pendência aberta — a decisão já havia sido tomada por este bloco).
- Vocabulário `paid`→`realized`, `payment_date`→`realization_date` corrigido em schema, tipos de domínio, testes, migration e toda a documentação (`contrato_banco_dados.md`, `modelo-logico.md`, `relacionamentos.md`).
- Foreign keys compostas implementadas para `period_id`/`category_id`; limitação de `responsible_member_id` documentada como P2 em vez de "silenciada".
- Migration regenerada com nome semântico (`0000_initial_financial_domain.sql`), artefatos antigos removidos (confirmado untracked antes).
- Vulnerabilidades de desenvolvimento do `drizzle-kit` documentadas como P3, sem `npm audit fix --force`.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

- `financial_entries.responsible_member_id` não tem FK composta protegendo a consistência com `household_id` — MySQL proíbe `ON DELETE SET NULL` em FK composta com coluna `NOT NULL`. Consistência permanece responsabilidade da camada de serviço (ver `database/proposed-schema/relacionamentos.md`). Única pendência P2 deste bloco ainda aberta — ver histórico abaixo para os itens já encerrados.

### P3 — Melhoria Recomendada

- Extensões futuras (`recurrence_rules`, `installment_plans`, `category_budgets`, `period_status_history`) documentadas em `database/proposed-schema/extensoes-futuras.md`, mas não modeladas.
- `npm audit` reporta 4 vulnerabilidades moderadas, limitadas à cadeia de desenvolvimento do `drizzle-kit` (`esbuild` via `@esbuild-kit/core-utils`/`@esbuild-kit/esm-loader`, usado internamente pelo CLI). Dependências de produção: zero vulnerabilidades (`npm audit --omit=dev` retorna 0). Correção automática (`npm audit fix --force`) forçaria downgrade para `drizzle-kit@0.18.1` (breaking change) — não executada. Acompanhar atualização oficial do Drizzle sem aplicar downgrade quebrável. Documentado em `database/migrations/README.md`.
- `created_by_user_id`/`closed_by_user_id` não têm validação de household no banco (decisão explícita, ver Decisões Técnicas) — considerar revisitar se a camada de serviço não cobrir isso adequadamente.

### P4 — Opcional

_Nenhuma pendência opcional identificada._

## Histórico de Pendências Encerradas

_Seção adicionada em 2026-07-31 durante a reconciliação documental pós-Bloco 12. Os itens abaixo estavam registrados como pendências P2 abertas no momento em que este feedback foi originalmente escrito (2026-07-25); nenhum resultado é reescrito como se já fosse conhecido naquela data — apenas o encerramento é registrado agora, com a data real em que ocorreu._

- **Verificação de TLS/SSL entre a aplicação e o MySQL** — estava aberta neste bloco, investigada no Bloco 04 (TLS estrito não funcional contra a Clever Cloud) e **encerrada em 2026-07-30**, após a migração de infraestrutura para o Aiven (Bloco 11, DT-07) e validação real de `db:check`. Ver `Docs/02_architecture/decisoes_tecnicas.md` (DT-07) e `Docs/03_contracts/contrato_banco_dados.md`.
- **Aplicação da migration inicial (`0000_initial_financial_domain.sql`)** — estava pendente de revisão e autorização explícita, bloqueada pela pendência de TLS acima. **Encerrada em 2026-07-31** (Bloco 12, DT-08): aplicada uma única vez ao banco `finanhouse_dev`, com autorização explícita do proprietário, seis tabelas criadas, journal registrado, todas as tabelas vazias.
- ~~Commit e push deste bloco dependem de nova autorização explícita~~ — resolvido ainda em 2026-07-25: branch `feat/session-11-bloco-03-modelagem-dominio` commitada, publicada e mesclada à `main` no commit `a73b610`.

## 14. Riscos Restantes

- Sem verificação de TLS, uma eventual conexão de produção pode trafegar dados financeiros sem criptografia — bloqueador antes de qualquer dado real, não apenas recomendação.
- A migration gerada reflete o entendimento atual do domínio; qualquer ajuste percebido durante a revisão do proprietário deve gerar uma nova migration (`drizzle-kit generate` novamente), nunca edição manual do SQL já gerado.

## 15. Evidências

```
$ npx drizzle-kit generate --name initial_financial_domain
6 tables
categories 7 columns 1 indexes 1 fks
financial_entries 16 columns 7 indexes 5 fks
household_members 7 columns 1 indexes 2 fks
households 7 columns 0 indexes 1 fks
monthly_periods 8 columns 1 indexes 2 fks
users 6 columns 0 indexes 0 fks
[✓] Your SQL migration file ➜ ..\..\database\migrations\0000_initial_financial_domain.sql 🚀

$ npx drizzle-kit check
Everything's fine 🐶🔥

$ npm run test
apps/api: Test Files 3 passed (3) · Tests 25 passed (25)
apps/web: Test Files 1 passed (1) · Tests 1 passed (1)

$ npm audit --omit=dev
found 0 vulnerabilities

$ npm audit
4 moderate severity vulnerabilities (esbuild via @esbuild-kit/* via drizzle-kit — dev only)

$ npx ddae-engine audit (após fechar a P2 do Bloco 02)
Pendências:
  - P2: .../feedback_bloco_03_modelagem_inicial_do_dominio_financeiro.md
(nenhuma P2 do Bloco 02 listada)
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Verificação de TLS/SSL entre a futura aplicação e o MySQL da Clever Cloud, seguida de revisão final do proprietário e, se aprovado, aplicação controlada da migration inicial (`drizzle-kit migrate`, mediante autorização explícita).

## 18. Commit Semântico Sugerido

```
feat(modelagem_inicial_do_dominio_financeiro): modelar schema Drizzle inicial e gerar migration (não aplicada)
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
