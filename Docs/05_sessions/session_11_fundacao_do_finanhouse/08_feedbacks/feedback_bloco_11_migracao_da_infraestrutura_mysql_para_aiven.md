# Feedback — Bloco 11: Migração da infraestrutura MySQL para Aiven

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-30

## 1. Resumo Executivo

Este bloco preparou código e arquitetura do Finanhouse para o Aiven for MySQL, substituindo a Clever Cloud como infraestrutura de dados ativa, sem estabelecer nenhuma conexão real, sem aplicar nenhuma migration e sem receber nenhuma credencial. Foi implementado um módulo de configuração central e puro (`resolveDatabaseConfig`) que valida provider, ambiente, host/porta/usuário/senha/banco, modo SSL e certificado CA antes de qualquer tentativa de conexão; uma resolução de CA por caminho de arquivo ou Base64 (exatamente uma origem); uma factory de pool `mysql2` com TLS estrito criada apenas sob demanda; e três scripts reais, porém não executados, para verificação, migration e seed de desenvolvimento. Drizzle ORM, `mysql2` e o schema de 6 tabelas do Bloco 03 foram preservados sem alteração; nenhuma migração para PostgreSQL.

54 novos testes automatizados foram adicionados (12 de resolução de CA, 37 de configuração central, 5 da factory de pool), elevando o total do monorepo de 438 para 492 testes, todos aprovados, sem nenhuma conexão real em nenhum teste. Build, lint, typecheck (incluindo os novos scripts), `verify:runtime`, `ddae-engine validate`/`audit` e auditoria de dependências passaram sem regressão: zero vulnerabilidades de produção, 4 vulnerabilidades moderadas conhecidas apenas em dependências de desenvolvimento (cadeia `drizzle-kit` → `esbuild`), `react-router@8.3.0` preservado e `react-router-dom` ausente.

A pendência P2 de TLS (aberta desde o Bloco 04, contra a Clever Cloud) foi reconciliada — não duplicada — para o novo alvo (Aiven) em `Docs/02_architecture/decisoes_tecnicas.md` (DT-07) e `Docs/03_contracts/contrato_banco_dados.md`. **Atualização (2026-07-30):** o proprietário executou manualmente `npm run db:check` contra o Aiven e confirmou TLS ativo (MySQL `8.4.8`, banco `finanhouse_dev`, usuário `finanhouse_dev_app`) — ver seção 19. A pendência P2 de TLS está **encerrada**; a pendência P2 de aplicação da migration inicial **continua aberta**, sem nenhuma migration aplicada até o momento.

## 2. Objetivo do Bloco

Preparar código e arquitetura do Finanhouse para o Aiven for MySQL (configuração centralizada, TLS estrito, separação dev/prod, scripts protegidos), sem conectar ao banco real, sem aplicar migrations e sem receber nenhuma credencial.

## 3. Escopo Implementado

Implementado integralmente conforme planejado em `05_blocks/bloco_11_migracao_da_infraestrutura_mysql_para_aiven.md`, sem divergência de escopo:

- Módulo de configuração central e puro (`database-config.ts` + `database-ca.ts`).
- Resolução de CA por caminho **ou** Base64, exatamente uma origem.
- TLS estrito (`rejectUnauthorized: true`, `minVersion: 'TLSv1.2'`, sem override de `checkServerIdentity`).
- Factory de pool `mysql2` sob demanda.
- Scripts reais e não executados: `db:check`, `db:migrate`, `db:seed:dev`.
- `.env.example`/`.gitignore` atualizados.
- 54 testes automatizados (acima do piso de ~43 pedido).
- Documentação: DT-07, contratos, READMEs, reconciliação da P2 dos Blocos 03/04, RF-05/RF-06/RF-08.

## 4. Arquivos Criados

- `apps/api/src/config/database-ca.ts`
- `apps/api/src/config/database-ca.test.ts`
- `apps/api/src/config/database-config.ts`
- `apps/api/src/config/database-config.test.ts`
- `apps/api/src/db/pool.ts`
- `apps/api/src/db/pool.test.ts`
- `apps/api/scripts/db-check.ts`
- `apps/api/scripts/db-migrate.ts`
- `apps/api/scripts/db-seed-dev.ts`
- `apps/api/scripts/lib/sanitize-error.ts`
- `apps/api/tsconfig.scripts.json`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_11_migracao_da_infraestrutura_mysql_para_aiven.md` (este arquivo)

## 5. Arquivos Alterados

- `apps/api/package.json` (scripts `db:check`, `db:migrate`, `db:seed:dev`, `typecheck:scripts`)
- `package.json` (raiz — scripts `db:check`, `db:migrate`, `db:seed:dev`, `typecheck:api-scripts`)
- `.env.example` (raiz — nova estrutura de variáveis Aiven)
- `.gitignore` (raiz — adicionado `*.crt`, `secrets/`)
- `Docs/02_architecture/decisoes_tecnicas.md` (nova DT-07; seção 5 "Decisões Pendentes" reconciliada)
- `Docs/03_contracts/contrato_banco_dados.md` (estado atual, seção 12 "Decisões Pendentes" reconciliada)
- `Docs/03_contracts/contrato_variaveis_ambiente.md` (seções 2, 3, 4, 5, 7, 8, 9, 10 preenchidas)
- `Docs/01_product/requisitos_funcionais.md` (RF-05, RF-06, RF-08 atualizados)
- `README.md` (raiz — stack e seção "Banco de dados")
- `apps/api/README.md` (novos scripts e seção "Banco de dados (Aiven for MySQL)")
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md` (novo parágrafo do Bloco 11, tabela de blocos, riscos)
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_11_migracao_da_infraestrutura_mysql_para_aiven.md` (preenchido — estava com placeholders)

## 6. Arquivos Removidos

- Nenhum.

## 7. Comandos Executados

```
npx ddae-engine block create "Migração da infraestrutura MySQL para Aiven" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_11_migracao_da_infraestrutura_mysql_para_aiven --session session_11_fundacao_do_finanhouse
npx ddae-engine feedback create --block bloco_11_migracao_da_infraestrutura_mysql_para_aiven --session session_11_fundacao_do_finanhouse
npx vitest run src/config src/db/pool.test.ts   # iterações locais durante o desenvolvimento
npx tsc -p tsconfig.scripts.json                # typecheck dos novos scripts
npm ci
npm run clean
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
git status / git status --short / git diff --stat / git diff --name-only
git check-ignore -v apps/api/.env.local
git check-ignore -v ca.pem
git check-ignore -v aiven-ca.pem
```

## 8. Testes Realizados

- **Automatizados (novos):** 54 testes — 12 em `database-ca.test.ts` (resolução de CA: origem única, ambas presentes, ausência, arquivo inexistente/vazio/inválido, Base64 vazio/inválido, mensagens de erro sem vazar caminho/valor); 37 em `database-config.test.ts` (provider, ambiente, nome de banco por ambiente incluindo `defaultdb` e cruzamento dev/prod, SSL mode, CA, TLS resultante, porta, campos obrigatórios, ausência de vazamento de dados sensíveis em erros); 5 em `pool.test.ts` (nenhuma conexão na importação, `rejectUnauthorized`/`minVersion` corretos, ausência de `checkServerIdentity`, senha só no objeto passado ao driver mockado).
- **Automatizados (suíte completa):** 492 testes no monorepo (88 `apps/api` + 251 `apps/web` + 153 `packages/domain`), todos aprovados — os 438 testes anteriores ao bloco permanecem intactos.
- **Manual:** nenhum — nenhum script de banco (`db:check`/`db:migrate`/`db:seed:dev`) foi executado, por restrição explícita do escopo. Nenhuma conexão real com o Aiven foi tentada.

## 9. Validações Executadas

- `npm ci` — OK, 0 vulnerabilidades reportadas na instalação.
- `npm run clean` — OK (executado antes do build final, não depois).
- `npm run build` — OK (`domain`, `api`, `web`).
- `npm run verify:runtime` — OK, sem leitura de `.env.local`, sem conexão de banco.
- `npm run lint` — OK, sem warnings (oxlint nas 3 workspaces).
- `npm run typecheck` — OK (`api`, `web`, `domain`).
- `npm run typecheck:api-scripts` — OK (novo: `apps/api/src/` + `apps/api/scripts/`).
- `npm run test` — OK, 492/492 testes.
- `npx ddae-engine validate` — Status OK, 0 warnings, 0 errors.
- `npx ddae-engine audit` — Status OK, 0 errors, 9 warnings (mesmos warnings conhecidos: 7 quality gates ainda pendentes de execução formal + 2 pendências P2 já registradas dos Blocos 03/04 — nenhum warning novo introduzido por este bloco).
- `npm audit --omit=dev` — 0 vulnerabilidades.
- `npm audit` — 4 vulnerabilidades moderadas, todas na cadeia de desenvolvimento `drizzle-kit` → `@esbuild-kit/*` → `esbuild` (fix disponível apenas via downgrade breaking de `drizzle-kit`, não aplicado).
- `npm ls mysql2 drizzle-orm drizzle-kit react-router react-router-dom` — `mysql2@3.23.1`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `react-router@8.3.0`; `react-router-dom` ausente.
- `packages/domain/dist/index.js` — confirmado existente após o build final.

## 10. Decisões Técnicas

- **DT-07 registrada** (`Docs/02_architecture/decisoes_tecnicas.md`): Aiven for MySQL como infraestrutura de dados ativa, substituindo a Clever Cloud.
- Erros de resolução de CA (`DatabaseCaResolutionError`) são reencapsulados como `DatabaseConfigError` dentro de `resolveDatabaseConfig`, para que todo consumidor (aplicação, pool, scripts) trate um único tipo de erro de configuração — decisão de implementação, não registrada como DT por ser reversível e local a um módulo.
- Scripts de banco (`db:check`/`db:migrate`/`db:seed:dev`) foram colocados em `apps/api/scripts/` (workspace `api`) em vez de `database/inspection/` — porque dependem diretamente do schema Drizzle e da configuração de `apps/api`, diferente dos scripts de inspeção somente leitura da Clever Cloud, que são deliberadamente independentes de qualquer workspace de aplicação.

## 11. Problemas Encontrados

- Imports relativos nos arquivos novos inicialmente usaram extensão `.ts` (convenção de `apps/web`), mas `apps/api` usa `moduleResolution: NodeNext` e exige extensão `.js` em imports relativos (convenção já usada em `apps/api/src/db/schema/*.ts`) — causou erro `TS5097` no typecheck.
- `DatabaseCaResolutionError` lançado por `resolveCaCertificate` não era capturado pelos testes que esperavam `DatabaseConfigError` em `resolveDatabaseConfig` — os dois tipos de erro não tinham relação entre si.
- Mock de `mysql2/promise` em `pool.test.ts` referenciava uma constante declarada após a chamada de `vi.mock` (que o Vitest hoisting move para o topo do arquivo), causando erro de acesso antes da inicialização.

## 12. Correções Aplicadas Durante o Bloco

- Todos os imports relativos novos corrigidos de `.ts` para `.js`, alinhando com a convenção já estabelecida em `apps/api`.
- `resolveDatabaseConfig` passou a capturar `DatabaseCaResolutionError` e relançar como `DatabaseConfigError` com a mesma mensagem, preservando um único tipo de erro público para todos os consumidores.
- `pool.test.ts` reescrito usando `vi.hoisted()` para declarar o mock antes de `vi.mock`, com tipagem explícita no mock para eliminar erros de inferência do TypeScript.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

- ~~Verificação real de TLS contra o Aiven~~ — **encerrada em 2026-07-30.** Ver seção 19 (Atualização) para a evidência operacional completa.
- **Aplicação da migration inicial (Bloco 03)** — a pendência de TLS que a bloqueava foi encerrada (item acima), mas a migration em si **continua não aplicada** a nenhum banco real. Permanece em aberto até uma execução real e auditada de `db:migrate`, com autorização explícita separada.

### P3 — Melhoria Recomendada

- `apps/api/scripts/db-seed-dev.ts` verifica idempotência apenas no nível da execução completa (usuário de seed já existe → não insere nada); um smoke-test manual contra `finanhouse_dev` real é recomendado antes do primeiro uso, para confirmar o comportamento de `$returningId()` do Drizzle nesta versão contra o MySQL 8.4 do Aiven.
- 4 vulnerabilidades moderadas conhecidas na cadeia de desenvolvimento de `drizzle-kit` (`esbuild` via `@esbuild-kit/*`) seguem sem correção não-breaking disponível — mesmo status de blocos anteriores, sem regressão.

### P4 — Opcional

- Avaliar, em bloco futuro, se `apps/api/scripts/` deveria expor uma flag `--dry-run` para `db:migrate`, permitindo listar as migrations pendentes sem exigir `CONFIRM_DATABASE_MIGRATION=true`.

## 14. Riscos Restantes

- Plano Free do Aiven não possui SLA formal e pode apresentar indisponibilidade por inatividade (documentado em DT-07, aceito como risco conhecido).
- A ausência de uma conexão real testada nesta etapa significa que problemas específicos do Aiven (ex.: formato exato do certificado CA fornecido, comportamento de `SHOW SESSION STATUS LIKE 'Ssl_cipher'`) só serão descobertos na primeira execução real de `db:check`.

## 15. Evidências

- `npm run test` (raiz): `Test Files 9 passed (9)` / `Tests 88 passed (88)` em `apps/api`; `Test Files 31 passed (31)` / `Tests 251 passed (251)` em `apps/web`; `Test Files 8 passed (8)` / `Tests 153 passed (153)` em `packages/domain` — total 492.
- `npx ddae-engine validate`: `Status: OK · Warnings: 0 · Errors: 0`.
- `npx ddae-engine audit`: `Status: OK · Warnings: 9 · Errors: 0` (gates pendentes de execução formal + P2 já conhecida dos Blocos 03/04).
- `npm audit --omit=dev`: `found 0 vulnerabilities`.
- `npm ls mysql2 drizzle-orm drizzle-kit react-router react-router-dom`: confirma `mysql2@3.23.1`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `react-router@8.3.0`, `react-router-dom` ausente.
- `packages/domain/dist/index.js` presente após o build final (não removido por `clean` posterior).

## 16. Resultado Final

- [ ] Bloco concluído conforme escopo
- [x] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

A validação de TLS foi concluída (ver seção 19). O próximo passo recomendado é um **bloco separado** para aplicar e auditar a migration inicial no banco `finanhouse_dev` (`db:migrate`, com `CONFIRM_DATABASE_MIGRATION=true` e autorização explícita), e só então avaliar `db:seed:dev`. Este bloco (11) não deve ser reaberto para isso; nenhum bloco novo foi criado nesta execução.

## 18. Commit Semântico Sugerido

```
refactor(database): preparar infraestrutura MySQL para Aiven
docs(database): registrar validação TLS do Aiven
```

_Lembrete: nenhum commit é executado automaticamente sem confirmação explícita do usuário — ambos já foram confirmados explicitamente pelo proprietário nesta sessão._

## 19. Atualização — Evidência Operacional de Conexão Real (2026-07-30)

O proprietário executou manualmente, na branch `feat/session-11-bloco-11-aiven-database`, com `apps/api/.env.local` preenchido com a configuração local do Aiven e o usuário definitivo da aplicação (`finanhouse_dev_app`):

```
npm run db:check
```

Resultado sanitizado confirmado pelo proprietário:

```
Provider: aiven
Ambiente: development
Banco configurado: finanhouse_dev
Conectividade: sucesso
Versão do MySQL: 8.4.8
Banco ativo corresponde ao configurado: sim
TLS ativo: sim
Verificação concluída com sucesso.
```

Essa execução usou o certificado CA oficial do serviço, `DATABASE_SSL_MODE=verify_identity`, preservou `rejectUnauthorized: true` e a verificação padrão de hostname, conectou a `finanhouse_dev` com `finanhouse_dev_app`, não aplicou migration, não executou seed, não criou tabelas, não modificou dados, não usou MySQLx, não usou `defaultdb` nem `avnadmin` como usuário definitivo. Esta execução (a que gerou este feedback) não teve acesso a `.env.local` nem a nenhuma credencial — a saída acima é evidência operacional fornecida diretamente pelo proprietário, não reproduzida nem verificada por uma nova tentativa de conexão.

**Efeito sobre pendências:** a P2 de verificação de TLS (seção 13) está encerrada a partir desta data. A P2 de aplicação da migration inicial permanece aberta — nenhuma migration foi aplicada nesta verificação.

**Notas operacionais registradas** (`apps/api/README.md`, seção "Notas operacionais"): o serviço Aiven precisa estar *Powered on / Running* antes de qualquer script de banco; o projeto usa a conexão MySQL tradicional (`mysql2` + Drizzle), não MySQLx; `defaultdb`/`avnadmin`/`DATABASE_SSL=false`/`rejectUnauthorized: false` nunca devem ser usados; variáveis de ambiente já definidas no processo do terminal podem prevalecer sobre um `.env.local` atualizado depois — documentado o procedimento de limpeza (`Remove-Item Env:...` no PowerShell) antes de repetir `db:check`.
