# Feedback — Bloco 01: Bootstrap técnico do monorepo

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Resumo Executivo

`apps/web` (React + Vite + TypeScript) e `apps/api` (Node.js + TypeScript) foram inicializados dentro do monorepo existente, com npm workspaces reconhecendo ambos. O front-end exibe uma tela mínima com o nome "Finanhouse" e o slogan "Casa, evolução e equilíbrio"; a API expõe `GET /health`, testado manualmente e retornando o payload esperado. Build, lint, typecheck e testes automatizados passam nas duas aplicações. Nenhuma conexão com o MySQL existente foi feita, nenhum ORM/driver de banco foi instalado, e nenhuma credencial foi criada. Status: concluído conforme escopo.

## 2. Objetivo do Bloco

Inicializar as aplicações React e Node.js do Finanhouse, configurar os workspaces e deixar front-end e API executáveis localmente, sem acessar o banco existente.

## 3. Escopo Implementado

- `apps/web`: scaffold Vite (`react-ts`), tela inicial substituída pelo boilerplate padrão por uma tela mínima (nome + slogan), assets não usados removidos.
- `apps/api`: aplicação Node.js/TypeScript mínima com `http` nativo (sem framework), endpoint `GET /health` e handler 404 padrão para demais rotas.
- Scripts em ambos: `dev`, `build`, `lint` (oxlint), `typecheck`, `test` (vitest).
- Scripts agregados no `package.json` raiz: `dev:web`, `dev:api`, `build`, `lint`, `typecheck`, `test`, todos via `--workspaces --if-present`.
- Teste automatizado mínimo em cada app: `apps/web/src/App.test.tsx` (renderiza `<App />` e verifica nome/slogan) e `apps/api/src/health.test.ts` (valida o payload de `getHealthStatus()`).
- Comunicação web↔API não foi implementada além do endpoint `/health` isolado — ver Pendências (P3).

## 4. Arquivos Criados

- `apps/web/` — scaffold completo do Vite (`react-ts`): `index.html`, `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/App.test.tsx`, `src/index.css`, `public/`
- `apps/api/` — `package.json`, `tsconfig.json`, `.oxlintrc.json`, `src/index.ts`, `src/server.ts`, `src/health.ts`, `src/health.test.ts`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_01_bootstrap_tecnico_do_monorepo.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/06_prompts/prompt_bloco_01_bootstrap_tecnico_do_monorepo.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/08_feedbacks/feedback_bloco_01_bootstrap_tecnico_do_monorepo.md` (este arquivo)
- `database/inspection/README.md`

## 5. Arquivos Alterados

- `apps/web/README.md`, `apps/api/README.md` — documentação de execução
- `package.json` (raiz) — scripts `dev:web`, `dev:api`, `build`, `lint`, `typecheck`, `test`
- `database/current-schema/README.md`, `database/migrations/README.md`, `database/seeds/README.md` — corrigidos para refletir que o banco já existe
- `README.md` (raiz) — árvore de `database/`, nova seção "Banco de dados"
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md`, `01_intake/levantamento_inicial.md`, `04_planning/plano_execucao.md` — contexto do banco corrigido, bloco oficial registrado
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/04_governance/registro_decisoes.md`, `Docs/03_contracts/contrato_banco_dados.md` — decisão pendente de ORM/driver e regras do banco existente

## 6. Arquivos Removidos

- `apps/web/src/assets/react.svg`, `apps/web/src/assets/vite.svg`, `apps/web/src/assets/hero.png` — boilerplate do template não usado pela tela mínima
- `database/schema/` (renomeado para `database/current-schema/`)

## 7. Comandos Executados

```
npx ddae-engine block create "Bootstrap técnico do monorepo" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_01_bootstrap_tecnico_do_monorepo --session session_11_fundacao_do_finanhouse
npm create vite@latest . -- --template react-ts   (dentro de apps/web)
npm install
npm run build
npm run lint
npm run typecheck
npm run test
npm run build --workspace=api && node apps/api/dist/index.js   (teste manual do /health)
npm run dev --workspace=web -- --port 5173   (teste manual do dev server)
npx ddae-engine feedback create --block bloco_01_bootstrap_tecnico_do_monorepo --session session_11_fundacao_do_finanhouse
```

## 8. Testes Realizados

- Automatizado: `apps/web` — `vitest run` → 1 arquivo, 1 teste, passou (renderiza `<App/>` e confere texto "Finanhouse" e "Casa, evolução e equilíbrio").
- Automatizado: `apps/api` — `vitest run` → 1 arquivo, 1 teste, passou (`getHealthStatus()` retorna `{status:"ok", service:"finanhouse-api"}`).
- Manual: API compilada e executada (`node apps/api/dist/index.js`); `curl http://localhost:3001/health` retornou `{"status":"ok","service":"finanhouse-api"}` (HTTP 200); `curl` em rota inexistente retornou HTTP 404. Processo encerrado após o teste.
- Manual: `apps/web` rodado com `vite --port 5173`; `curl` na raiz retornou HTTP 200. Processo encerrado após o teste; portas confirmadas livres depois (`netstat` mostrou apenas conexões `TIME_WAIT`, sem processo ativo).

## 9. Validações Executadas

- `npm install` (raiz) — 148 pacotes instalados, 0 vulnerabilidades.
- `npm run build` (workspaces) — `api` e `web` passaram (web: `tsc -b && vite build` gerou `dist/` com sucesso).
- `npm run lint` (workspaces) — `oxlint` sem erros em `api` e `web`.
- `npm run typecheck` (workspaces) — `tsc --noEmit` (api) e `tsc -b` (web) sem erros.
- `npm run test` (workspaces) — 2/2 arquivos de teste passaram.
- `ddae-engine validate` e `ddae-engine audit` — executados na seção 9 abaixo (resultado consolidado no fechamento do bloco).

## 10. Decisões Técnicas

- API implementada com `http` nativo do Node.js, sem framework (Express etc.) — escopo mínimo do bloco não justificava a dependência extra.
- Testes com Vitest em ambos os workspaces (consistência de ferramenta), `@testing-library/react` + `jsdom` apenas em `apps/web` para o smoke test de UI.
- `vitest.config.ts` separado de `vite.config.ts` em `apps/web` — combinar `test` dentro de `vite.config.ts` via `vitest/config` causou conflito de tipos entre a instância de Vite hoisted na raiz e a instância interna do Vitest (`node_modules/vitest/node_modules/vite`), incompatibilidade de tipos de `Plugin`. Separar os arquivos evitou o conflito sem downgrade de versões. Decisão registrada aqui por ser específica da implementação, não arquitetural.

## 11. Problemas Encontrados

- `npm create vite@latest .` recusou rodar dentro de `apps/web` com o `README.md` já presente (prompt interativo cancelado em modo não interativo). Contornado movendo o `README.md` para fora temporariamente, rodando o scaffold em diretório vazio, e restaurando o conteúdo do README (mesclado com informações de execução) depois.
- Erro de tipos ao combinar `test` no `vite.config.ts` via `vitest/config` (ver Decisões Técnicas acima) — resolvido com `vitest.config.ts` separado.
- Um arquivo temporário (`README.web.bak.md`) ficou momentaneamente na raiz do projeto durante o contorno acima — identificado e removido antes da finalização do bloco.

## 12. Correções Aplicadas Durante o Bloco

- Ajuste do `vite.config.ts`/`vitest.config.ts` conforme acima.
- Remoção do arquivo temporário `README.web.bak.md` da raiz.
- Remoção dos assets de boilerplate não usados (`react.svg`, `vite.svg`, `hero.png`) após simplificar `App.tsx`.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência importante identificada._

### P3 — Melhoria Recomendada

- Logo oficial ainda não incorporada em `assets/brand/finanhouse-logo-primary.png` — pendência já registrada desde o Bloco 3 (não encontrada no workspace local).
- Comunicação real entre `apps/web` e `apps/api` (além do `/health` isolado) não foi aprofundada — fica para um bloco de features quando houver dados reais a trocar.

### P4 — Opcional

- Avaliar futuramente se `oxlint` cobre as necessidades de lint do projeto a longo prazo ou se será preciso migrar para ESLint com regras mais específicas.

## 14. Riscos Restantes

- Nenhuma conexão com o banco foi feita e nenhuma decisão de ORM/driver foi tomada — o risco de tratar o MySQL existente como vazio permanece mitigado apenas enquanto as regras registradas em `Docs/03_contracts/contrato_banco_dados.md` forem respeitadas nos próximos blocos.

## 15. Evidências

```
$ curl -s http://localhost:3001/health
{"status":"ok","service":"finanhouse-api"}

$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/nonexistent
404

$ npm run test
✓ src/health.test.ts (1 test)
✓ src/App.test.tsx (1 test)
Test Files  2 passed (2) · Tests  2 passed (2)

$ npm run build
web: vite build → dist/index.html, dist/assets/*.css, dist/assets/*.js — built in 136ms
api: tsc -p tsconfig.json → sem erros
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Inspeção somente leitura do MySQL existente na Clever Cloud (Bloco 5 do fluxo operacional): testar conectividade, identificar versão, listar schemas/tabelas/colunas/índices/relacionamentos, verificar presença de registros sem expor conteúdo sensível, e documentar o resultado em `database/current-schema/`. Só depois desse inventário a decisão de ORM/driver (`Docs/02_architecture/decisoes_tecnicas.md`) pode ser tomada.

## 18. Commit Semântico Sugerido

```
feat(bootstrap_tecnico_do_monorepo): inicializar apps/web (React+Vite+TS) e apps/api (Node+TS) com endpoint /health
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
