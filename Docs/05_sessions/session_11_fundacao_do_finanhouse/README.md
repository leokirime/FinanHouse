# Session 11 — Fundação do Finanhouse

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Este README é o ponto de entrada da sessão. Qualquer pessoa ou agente de IA deve conseguir, lendo só este arquivo, entender o que esta sessão faz, o que já está pronto e qual é o próximo passo — sem precisar abrir todas as subpastas.

## 1. Objetivo

Inicializar o projeto pessoal Finanhouse sob governança DDAE e criar sua fundação conceitual e técnica: registrar o contexto do produto, a stack aprovada e montar a base do monorepo (`apps/`, `packages/`, `database/`, `assets/`, `scripts/`, `tests/`) que sustentará as próximas sessões (arquitetura/contratos, design system, features, etc.).

## 2. Contexto

Sessão de abertura do projeto. Não há débito técnico anterior — é a primeira sessão real de trabalho (as sessões 01–10 são o esqueleto padrão gerado pelo `ddae-engine init` e ainda não foram iniciadas). O motivador é começar o Finanhouse com documentação como fonte de verdade antes de qualquer linha de código.

**Dados do repositório:**
- Caminho absoluto: `C:\Users\leoki\FinanHouse`
- Branch atual: `main`
- Remote oficial (`origin`): `https://github.com/leokirime/FinanHouse.git`
- Pasta oficial desta sessão: `Docs/05_sessions/session_11_fundacao_do_finanhouse/`
- Raiz da documentação DDAE: `Docs/`

**Contexto do produto:**
- Projeto: Finanhouse
- Natureza: projeto pessoal e privado, sem relação com a LKTechnologiesBrasil
- Usuários: proprietário e esposa
- Objetivo do produto: controle financeiro doméstico por competência mensal, com movimentações, comparação entre períodos, planejamento e histórico

**Stack aprovada:**
- React
- Vite
- TypeScript
- Node.js
- MySQL na Clever Cloud
- Deploy futuro na Vercel
- npm workspaces (monorepo)

**Banco de dados — correção registrada em 2026-07-25:**

O MySQL do Finanhouse **já existe** na Clever Cloud (não é um banco a ser criado). Regras vigentes desde o início da sessão:

- Não presumir banco vazio nem preenchido antes de inspecionar.
- Não criar outro banco; não recriar nem sobrescrever o existente.
- Nenhuma migration deve ser aplicada, nenhum seed executado em produção, e nenhum `DROP`/`TRUNCATE`/`ALTER`/`DELETE`/`UPDATE`/`INSERT`/`CREATE TABLE`/sincronização automática de schema (ORM push) antes do inventário.
- Credenciais do banco nunca entram no Git, logs, documentação ou saída pública.

**Inventário realizado em 2026-07-25 (`bloco_02_inventario_seguro_do_banco_existente`):** conexão somente leitura confirmada (MySQL 8.4.2-2), banco configurado corresponde ao banco ativo. Resultado: **o banco existe mas está estruturalmente vazio** (0 tabelas). Ver `database/current-schema/` para o inventário sanitizado completo.

**Persistência decidida em 2026-07-25 (`bloco_03_modelagem_inicial_do_dominio_financeiro`):** proprietário aprovou **Drizzle ORM + mysql2** (ADR-001, `Docs/02_architecture/adr_001_persistencia_drizzle_mysql2.md`). Schema inicial de 6 tabelas modelado (`apps/api/src/db/schema/`), com foreign keys **compostas** garantindo no banco que período e categoria de uma movimentação pertencem ao mesmo household. Migration gerada e revisada (`database/migrations/0000_initial_financial_domain.sql`) — **não aplicada**, banco real permanece vazio. Vocabulário de status corrigido para `planned`/`pending`/`realized`/`cancelled` (neutro entre receita e despesa). Pendências ativas: verificação de TLS/SSL entre Vercel e Clever Cloud (P2); consistência de `responsible_member_id` com o household, que o MySQL não permite proteger via FK composta com `SET NULL` (P2); vulnerabilidades moderadas na cadeia de desenvolvimento do `drizzle-kit`, zero em produção (P3).

**TLS/SSL investigado em 2026-07-25 (`bloco_04_validacao_tls_e_revisao_pre_migration`, branch `feat/session-11-bloco-04-validacao-tls`, ainda não integrada à `main`):** conexão real hoje não usa TLS. Teste suplementar mostrou que o servidor aceita TLS 1.3 com `rejectUnauthorized:false`, mas falha validação estrita (`rejectUnauthorized:true`, `HANDSHAKE_SSL_ERROR`). Causa raiz **não confirmada** — documentada como hipótese técnica (CA fora da cadeia padrão, hostname/SNI, endpoint, ou outra causa), nunca como fato. `rejectUnauthorized:false` foi rejeitado como configuração de produção. Pedido de suporte sanitizado preparado para a Clever Cloud. Bloco segue bloqueado até resposta do suporte — branch não mesclada, `main` inalterada.

**Regras de domínio e serviços financeiros em memória implementados em 2026-07-25 (`bloco_05_regras_de_dominio_e_servicos_financeiros`, branch `feat/session-11-bloco-05-domain-services`, ainda não integrada à `main`):** com o TLS ainda bloqueado, avançou-se a lógica de negócio **sem qualquer conexão real ao MySQL** — dinheiro como `bigint` em centavos, transições de status nomeadas (movimentação e competência mensal), cálculos de resumo mensal e comparação entre períodos, interfaces de repositório (`apps/api/src/application/ports/`), repositórios em memória (`apps/api/src/infrastructure/repositories/memory/`) e serviços de aplicação, todos cobertos por testes automatizados. Ver `Docs/02_architecture/regras_dominio_financeiro.md`. Nenhuma migration foi aplicada, nenhuma tabela criada, nenhuma credencial tocada.

## 3. Escopo

- Inicialização oficial do DDAE Engine na raiz do projeto (`ddae-engine init`)
- Criação desta sessão (`ddae-engine session create`)
- Fundação do monorepo: estrutura de pastas (`apps/web`, `apps/api`, `packages/domain`, `packages/ui`, `packages/config`, `packages/shared`, `database/current-schema`, `database/inspection`, `database/migrations`, `database/seeds`, `assets/brand`, `assets/images`, `scripts/`, `tests/`)
- Bootstrap técnico mínimo de `apps/web` (React/Vite/TS) e `apps/api` (Node.js/TS), sem qualquer acesso ao banco
- Arquivos-base: `package.json` raiz com npm workspaces, `README.md`, `.env.example`, `.gitignore`, `.editorconfig`

## 4. Fora de Escopo

- Bootstrap técnico do React (Vite) e da API Node.js — fica para o Bloco 4
- Modelagem e criação de schema/migrations do banco — fica para o Bloco 5
- Conexão com o banco MySQL real na Clever Cloud
- Deploy na Vercel
- Commit e push no Git

## 5. Status

- [ ] Não iniciada
- [x] Em andamento
- [ ] Concluída
- [ ] Bloqueada

## 6. Documentos Obrigatórios Desta Sessão

Marque conforme forem preenchidos. Um agente retomando o trabalho deve checar esta lista antes de assumir que a sessão está pronta para revisão.

- [ ] `01_intake/levantamento_inicial.md`
- [ ] `02_analysis/` (funcional, técnica, arquitetural, riscos)
- [ ] `04_planning/plano_execucao.md`
- [ ] `05_blocks/` — ao menos um bloco criado
- [ ] `06_prompts/` — um prompt por bloco
- [ ] `08_feedbacks/` — um feedback por bloco concluído
- [ ] `09_validation/fechamento_sessao.md`

## 7. Blocos Planejados

Divisões operacionais do fluxo de trabalho (não confundir com blocos oficiais DDAE, registrados em `05_blocks/`):

| Etapa | Título | Status |
|---|---|---|
| 02 | Inicialização oficial do DDAE | Concluído |
| 03 | Estrutura do monorepo | Concluído |
| 04 | React (Vite/TS) e API Node.js | Concluído |
| 05 | Banco de dados, assets e documentação | Em andamento (inventário e modelagem concluídos; assets/logo pendente) |
| 06 | Validações | Em andamento |

Blocos oficiais DDAE desta sessão (`05_blocks/`):

| Bloco | Título | Status |
|---|---|---|
| `bloco_01_bootstrap_tecnico_do_monorepo` | Bootstrap técnico do monorepo | Concluído |
| `bloco_02_inventario_seguro_do_banco_existente` | Inventário seguro do banco existente | Concluído |
| `bloco_03_modelagem_inicial_do_dominio_financeiro` | Modelagem inicial do domínio financeiro | Concluído (migration gerada, não aplicada) |
| `bloco_04_validacao_tls_e_revisao_pre_migration` | Validação de TLS/SSL e revisão pré-migration | Bloqueado (branch própria, aguardando suporte Clever Cloud) |
| `bloco_05_regras_de_dominio_e_servicos_financeiros` | Regras de domínio e serviços financeiros (em memória) | Concluído (branch própria, sem persistência real) |

## 8. Riscos

- Divergência entre a estrutura oficial gerada pelo `ddae-engine` e a estrutura do monorepo criada manualmente, se não forem mantidas em pastas separadas (mitigado: `Docs/` é exclusivo da governança DDAE, o monorepo vive fora dela).
- Logo oficial do Finanhouse pode não estar disponível localmente ainda, impactando `assets/brand/`.
- Credenciais reais do MySQL (Clever Cloud) não devem vazar para `.env.example` nem para o Git — mitigado por `.gitignore` (confirmado em cada execução do inventário e da modelagem).
- ~~Banco MySQL já existente ser tratado erroneamente como vazio~~ — **resolvido**: inventário confirmou que o banco realmente está vazio (não era uma suposição), então não há risco de colisão com dados reais.
- **TLS/SSL entre a futura aplicação (Vercel) e o MySQL da Clever Cloud não verificado** — a inspeção do Bloco 02 usou `DATABASE_SSL=false` apenas para ler metadados; produção precisa de transporte seguro confirmado antes de qualquer dado real. Registrado como pendência P2 (ver ADR-001).
- Ausência total de schema significa que a primeira migration real definirá a base de todo o domínio financeiro — mitigado por revisão manual do SQL gerado (Bloco 03) antes de qualquer aplicação futura.

## 9. Dependências

Nenhuma sessão anterior — esta é a sessão fundacional do projeto. As sessões seguintes (arquitetura/contratos, design system, features, etc.) dependerão desta.

## 10. Resultado

_A preencher ao final da sessão (Bloco 6 — validações)._

## 11. Próxima Sessão

A definir após o Bloco 6, provavelmente uma sessão de arquitetura/contratos (banco, API, auth) equivalente ao padrão `session_02_architecture_contracts` já existente no esqueleto padrão.
