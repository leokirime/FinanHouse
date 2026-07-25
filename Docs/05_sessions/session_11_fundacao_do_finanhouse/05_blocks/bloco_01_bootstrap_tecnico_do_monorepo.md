# Bloco 01 — Bootstrap técnico do monorepo

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Objetivo

Inicializar as aplicações React e Node.js do Finanhouse, configurar os workspaces e deixar front-end e API executáveis localmente, sem acessar o banco existente.

## 2. Contexto

Sessão 11 (fundação do Finanhouse) já tem governança DDAE inicializada e a estrutura de pastas do monorepo criada (Bloco 3). Este bloco formaliza, como unidade de trabalho oficial da sessão, o bootstrap técnico que estava planejado para o "Bloco 4" do fluxo operacional. Depende da correção de contexto sobre o banco MySQL já existente na Clever Cloud (ver `Docs/03_contracts/contrato_banco_dados.md` e `Docs/02_architecture/decisoes_tecnicas.md`, seção 5) — este bloco não toca o banco.

## 3. Problema que Este Bloco Resolve

Sem front-end e API executáveis localmente, não há como validar a estrutura do monorepo na prática nem iterar sobre features reais nos próximos blocos. É o primeiro ponto em que "a estrutura existe no papel" vira "a estrutura roda".

## 4. Escopo

- React
- Vite
- TypeScript
- Node.js
- TypeScript na API
- npm workspaces
- Scripts de desenvolvimento
- Scripts de build
- Lint
- Typecheck
- Teste mínimo
- Endpoint de saúde (`GET /health`)
- Comunicação local básica entre web e API, se puder ser feita sem aumentar desnecessariamente o escopo
- Documentação de execução (como iniciar cada aplicação)

## 5. Fora de Escopo

- Conexão com MySQL (fica para o Bloco 5, após inspeção do banco existente)
- Instalação de ORM ou driver de banco
- Migrations
- Seeds
- Autenticação
- Dashboard completo
- Regras financeiras
- Componentes finais de UI
- Gráficos
- Deploy
- Acesso à Clever Cloud
- Dados fictícios tratados como dados reais

## 6. Arquivos e Pastas Envolvidos

- `apps/web/` — aplicação React + Vite + TypeScript
- `apps/api/` — aplicação Node.js + TypeScript
- `package.json` (raiz) — scripts de dev/build/lint/typecheck/test
- `README.md` (raiz) — documentação de execução, se precisar de ajuste
- Nenhum arquivo em `database/`, `Docs/03_contracts/contrato_banco_dados.md` (leitura apenas), ou credenciais deve ser criado/alterado por este bloco

## 7. Dependências

- Bloco 3 (estrutura do monorepo) concluído
- `Docs/03_contracts/contrato_banco_dados.md` — regras de não-acesso ao banco existente respeitadas
- `Docs/02_architecture/decisoes_tecnicas.md` — decisão de ORM/driver permanece pendente e não é tomada neste bloco

## 8. Plano de Implementação

1. Inicializar `apps/web` com Vite (template React + TypeScript), preservando a estrutura do monorepo (sem segunda raiz de projeto).
2. Criar tela inicial mínima em `apps/web` exibindo o nome "Finanhouse" e o slogan "Casa, evolução e equilíbrio", sem dashboard, gráficos ou dados financeiros fictícios.
3. Inicializar `apps/api` com Node.js + TypeScript, estrutura mínima de aplicação.
4. Criar endpoint `GET /health` em `apps/api` retornando `{ "status": "ok", "service": "finanhouse-api" }`.
5. Configurar `package.json` raiz com scripts que permitam rodar dev/build/lint/typecheck/test de `apps/web` e `apps/api` via npm workspaces.
6. Instalar dependências (`npm install` na raiz).
7. Rodar dev, build, lint, typecheck e teste mínimo em ambas as aplicações; testar o endpoint `/health`.
8. Gerar e preencher o feedback oficial do bloco.

## 9. Critérios de Aceite

- [ ] `apps/web` inicia localmente
- [ ] `apps/api` inicia localmente
- [ ] O front-end usa React, Vite e TypeScript
- [ ] A API usa Node.js e TypeScript
- [ ] Existe endpoint `GET /health`
- [ ] O endpoint retorna JSON com estado da API
- [ ] Os workspaces são reconhecidos pelo npm
- [ ] Existe script para executar web e API
- [ ] Build do web passa
- [ ] Compilação da API passa
- [ ] Lint passa
- [ ] Typecheck passa
- [ ] Teste mínimo passa
- [ ] Nenhuma conexão com banco foi realizada
- [ ] Nenhuma credencial foi criada ou exposta
- [ ] Documentação e código permanecem sincronizados

## 10. Validações Obrigatórias

- [ ] `npm install` (raiz)
- [ ] Scripts de dev de `apps/web` e `apps/api` executam sem erro
- [ ] Build de `apps/web` passa
- [ ] Build/compilação de `apps/api` passa
- [ ] Lint passa
- [ ] Typecheck passa
- [ ] Teste mínimo passa
- [ ] `GET /health` testado manualmente
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`

## 11. Segurança

Nenhuma credencial, autenticação ou entrada de usuário sensível é introduzida neste bloco. Nenhuma conexão com o banco MySQL existente é feita. `.env.example` já existe e não recebe valores reais.

## 12. Performance

Não aplicável — bootstrap mínimo, sem consultas, processamento pesado ou otimização de bundle relevante neste estágio.

## 13. Design System / UX

Tela inicial mínima usa apenas texto (nome "Finanhouse" e slogan "Casa, evolução e equilíbrio"), sem tokens ou componentes do design system, que ainda não foi definido (`Docs/07_design_system/`). Logo oficial não incluída — pendência já registrada.

## 14. Riscos

- Instalação de dependências (Vite/React/Node) pode divergir de versões futuras assumidas em `Docs/02_architecture/`.
- Risco de, por engano, algum scaffold de ORM/driver de banco ser incluído por template padrão do Vite/Node — deve ser verificado e removido se ocorrer.

## 15. Pendências Esperadas

- P3 — Logo oficial ainda não incorporada em `assets/brand/finanhouse-logo-primary.png`; tela inicial usa apenas texto.
- P3 — Comunicação real entre `apps/web` e `apps/api` (além do endpoint `/health`) não é aprofundada neste bloco.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_01_bootstrap_tecnico_do_monorepo --session session_11_fundacao_do_finanhouse`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
feat(bootstrap_tecnico_do_monorepo): _..._
```
