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
- MySQL (Clever Cloud)
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

O MySQL do Finanhouse **já existe** na Clever Cloud — não é um banco a ser criado do zero. Ele é tratado como **não descartável e potencialmente contendo estrutura ou dados**, ainda não inspecionados nesta sessão. Regras vigentes até que uma inspeção somente leitura seja realizada:

- Não presumir banco vazio nem preenchido.
- Não criar outro banco.
- Não recriar nem sobrescrever o banco existente.
- Nenhuma migration, seed, `CREATE TABLE`, `DROP`, `TRUNCATE`, `ALTER`, `DELETE`, `UPDATE`, `INSERT` ou sincronização automática de schema (ORM push) antes do inventário do estado atual.
- Credenciais do banco nunca entram no Git, logs, documentação ou saída pública.
- A escolha da biblioteca de acesso (ORM vs. driver puro, ex.: Drizzle + mysql2 vs. mysql2 puro) é uma **decisão pendente**, registrada em `Docs/04_governance/registro_decisoes.md`, a ser tomada somente após o inventário do banco existente.

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
