# Finanhouse

## Natureza

Projeto pessoal e privado, sem relação com a LKTechnologiesBrasil. Uso restrito ao proprietário e à esposa.

## Objetivo

Controle financeiro doméstico por competência mensal: registro de movimentações, comparação entre períodos, planejamento e histórico.

## Stack

- React
- Vite
- TypeScript
- Node.js
- MySQL (Aiven for MySQL — ver `Docs/02_architecture/decisoes_tecnicas.md`, DT-07; Clever Cloud não é mais a infraestrutura ativa, permanece como registro histórico)
- Deploy futuro na Vercel
- npm workspaces (monorepo)

## Estrutura do monorepo

```
finanhouse/
├── apps/
│   ├── web/          # frontend (React + Vite + TS)
│   └── api/           # backend (Node.js)
├── packages/
│   ├── domain/        # regras de negócio e modelos de domínio
│   ├── ui/             # componentes de UI compartilhados
│   ├── config/         # configurações compartilhadas (lint, TS, build)
│   └── shared/         # utilitários e tipos compartilhados
├── database/
│   ├── current-schema/  # estado real do banco, documentado após inspeção
│   ├── inspection/      # scripts somente leitura de inspeção do banco
│   ├── migrations/      # mudanças incrementais futuras (banco já existe)
│   └── seeds/           # dados de desenvolvimento local/teste (nunca produção)
├── assets/
│   ├── brand/           # identidade visual oficial
│   └── images/          # imagens gerais
├── scripts/             # automação do monorepo
├── tests/                # testes de integração/E2E entre workspaces
├── Docs/                 # governança e documentação DDAE (fonte de verdade)
├── .editorconfig
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

A governança do projeto (visão de produto, arquitetura, contratos, decisões, sessões de trabalho) vive em [`Docs/`](Docs/) sob a metodologia [DDAE Engine](https://www.npmjs.com/package/ddae-engine). Antes de qualquer mudança relevante, consulte `Docs/` e os arquivos de regras para agentes (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`).

## Banco de dados

**Estado atual (Bloco 16):** a infraestrutura MySQL ativa do Finanhouse é o **Aiven for MySQL** (projeto `finanhouse`, serviço `finanhouse-mysql`, MySQL 8.4) — ver `Docs/02_architecture/decisoes_tecnicas.md` (DT-07, DT-08, DT-09, DT-10, DT-11) e `Docs/03_contracts/contrato_banco_dados.md`/`contrato_api_http.md`. A Clever Cloud (histórico abaixo) deixou de ser a infraestrutura ativa. Desenvolvimento e produção usam bancos e usuários totalmente separados (`finanhouse_dev`/`finanhouse_dev_app` e, no futuro, `finanhouse_prod`/usuário exclusivo); nenhuma instância local de MySQL é usada. Toda conexão exige TLS com certificado CA (`rejectUnauthorized: true`, `DATABASE_SSL_MODE=verify_identity`) — configuração centralizada e validada em `apps/api/src/config/database-config.ts`. Em 2026-07-30 o proprietário validou manualmente a conexão real com `npm run db:check` — TLS ativo confirmado (MySQL `8.4.8`, banco `finanhouse_dev`, usuário `finanhouse_dev_app`). Em 2026-07-31, com autorização explícita do proprietário, a migration inicial foi **aplicada** a `finanhouse_dev`: seis tabelas criadas (Bloco 12, DT-08). Ainda em 2026-07-31, uma migration incremental corrigiu a integridade referencial do membro responsável de uma movimentação — FK composta com `ON DELETE RESTRICT` + `CHECK` garantindo que ele pertence ao mesmo household (Bloco 13, DT-09). Ainda em 2026-07-31, os **repositórios Drizzle reais** foram implementados e validados por smoke-test transacional (rollback intencional, zero dado residual — Bloco 14, DT-10). Em 2026-08-01, a **API HTTP financeira v1** (Fastify) foi implementada sobre os repositórios reais e validada por smoke-test transacional (Bloco 16, DT-11) — execução exclusivamente local, sem autenticação real, nunca exposta publicamente. Todas as tabelas seguem auditadas com **zero registros** (nenhum seed executado, nenhum dado real inserido). **Persistência real ainda não está completa**: integração do frontend com a API e autenticação real continuam pendentes (RF-05).

Regras vigentes, válidas para qualquer provedor:

- Nenhuma migration, seed, `CREATE TABLE`, `DROP`, `TRUNCATE`, `ALTER`, `DELETE`, `UPDATE`, `INSERT` ou sincronização automática de schema (`drizzle-kit push`) sem autorização explícita e sem uma verificação de conectividade bem-sucedida antes.
- Credenciais do banco nunca entram no Git, logs, documentação ou saída pública; certificados CA nunca são versionados.
- Ambiente de desenvolvimento nunca aponta para o banco de produção, e vice-versa (validado antes de qualquer conexão).

**Histórico — Clever Cloud (Blocos 02–04):** o MySQL da Clever Cloud foi inspecionado (somente leitura) e confirmado vazio; um schema foi modelado (Drizzle + mysql2, ADR-001) e uma migration inicial foi gerada e revisada, mas nunca aplicada. A verificação de TLS/SSL da Clever Cloud foi diagnosticada como incompatível com a política de produção e nunca corrigida — essa foi a motivação direta da troca para o Aiven no Bloco 11.

## Estado atual

- DDAE Engine inicializado; sessão `session_11_fundacao_do_finanhouse` aberta; primeiro bloco oficial (`bloco_01_bootstrap_tecnico_do_monorepo`) concluído.
- Estrutura de pastas do monorepo criada.
- `package.json` raiz com npm workspaces (`apps/*`, `packages/*`) configurado, com scripts `dev:web`, `dev:api`, `build`, `lint`, `typecheck`, `test`.
- `apps/web` (React + Vite + TypeScript) e `apps/api` (Node.js + TypeScript, endpoint `GET /health`) inicializados e executáveis localmente.
- Dependências instaladas (`npm install`); build, lint, typecheck e testes passam nas duas aplicações.
- Nenhuma conexão com banco de dados real.
- Nenhum commit realizado ainda.

## Comandos ainda pendentes

- Inspeção somente leitura do MySQL existente na Clever Cloud (`database/inspection/`), para então documentar `database/current-schema/` e decidir a estratégia de migrations.
- Incorporar a logo oficial em `assets/brand/finanhouse-logo-primary.png` (ainda não encontrada no workspace).
- Primeiro commit e push (`git add`, `git commit`, `git push -u origin main`) — apenas mediante autorização.

## Próximos blocos

- **Bloco 5** — Banco de dados (inspeção somente leitura do MySQL existente), assets e documentação de contratos.
- **Bloco 6** — Validações (`ddae-engine validate` / `ddae-engine audit`) e fechamento da sessão.
