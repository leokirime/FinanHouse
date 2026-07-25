# Levantamento Inicial

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Preencha isto antes de planejar blocos. O objetivo é capturar o que se sabe (e o que não se sabe) antes de comprometer um plano de execução.

## 1. Contexto

Pedido direto do proprietário do projeto: iniciar o Finanhouse, um controle financeiro doméstico pessoal, sob a metodologia DDAE, começando pela fundação (governança + monorepo) antes de qualquer código de aplicação.

## 2. Necessidades Levantadas

- Repositório e pasta local já existentes (`C:\Users\leoki\FinanHouse`, remote `origin` já apontando para `https://github.com/leokirime/FinanHouse.git`), sem commits ainda.
- Estrutura de governança DDAE inicializada e primeira sessão criada oficialmente (não numerada manualmente).
- Fundação de um monorepo com frontend (React/Vite/TS) e backend (Node.js) via npm workspaces.
- Persistência futura em MySQL hospedado na Clever Cloud, sem conexão real nesta sessão.
- Deploy futuro na Vercel (fora do escopo desta sessão).
- Preservação de eventual logo oficial do Finanhouse em `assets/brand/`, sem redesenho.

## 3. Perguntas Abertas

- Existe uma logo oficial do Finanhouse já produzida, e em qual caminho ela está?
- O banco MySQL na Clever Cloud já foi provisionado, ou isso é uma sessão futura?
- Qual será o gerenciador de pacotes definitivo para os workspaces (npm já está definido; confirmar se permanece assim para toda a stack)?

## 4. Fontes Consultadas

- `npm view ddae-engine` (version, description, dist-tags, readme) — comandos oficiais do CLI.
- `git status`, `git branch --show-current`, `git remote -v` no repositório local.
- Saída real de `ddae-engine init` e `ddae-engine session create`.

## 5. Primeiras Hipóteses de Escopo

**Entra nesta sessão:** inicialização do DDAE, criação desta sessão, estrutura de pastas do monorepo, arquivos-base (`package.json` com workspaces, `README.md`, `.env.example`, `.gitignore`, `.editorconfig`).

**Fica fora:** bootstrap do React/Vite e da API Node.js (Bloco 4), schema/migrations/seeds reais do banco (Bloco 5), conexão com banco real, deploy, commit/push.

## 6. Decisões Pendentes

- Definir se a logo oficial existe e onde está armazenada (ver Pergunta Aberta acima).
- Inspecionar o banco MySQL existente na Clever Cloud (somente leitura) antes de qualquer schema/migration — não presumir banco vazio.
- Definir se o schema existente será reaproveitado integralmente, adaptado por migrations incrementais, ou substituído por migração controlada — decisão a ser tomada somente após a inspeção.
- Definir a biblioteca de acesso ao MySQL e a estratégia de migrations (ex.: Drizzle + mysql2 vs. mysql2 puro) — **somente após o inventário do banco existente**. Ver `Docs/04_governance/registro_decisoes.md`.
