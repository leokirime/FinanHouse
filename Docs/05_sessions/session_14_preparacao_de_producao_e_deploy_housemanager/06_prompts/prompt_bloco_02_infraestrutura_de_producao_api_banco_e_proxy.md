# Prompt — Bloco 02: Infraestrutura de produção: API, banco e proxy

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_14_preparacao_de_producao_e_deploy_housemanager/05_blocks/bloco_02_infraestrutura_de_producao_api_banco_e_proxy.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Validar e preparar tecnicamente o HouseManager para a arquitetura de custo zero (Vercel Free + Render Free + Aiven existente), sem provisionar nada real.

## 3. Escopo

Validação da estrutura da API para Render, correção test-first de qualquer lacuna real encontrada, documentação de Render/Vercel/Aiven/migrations/bootstrap/ordem de deploy — sem executar nada externo.

## 4. Fora de Escopo

Provisionamento real (Render/Vercel/Aiven), conexão GitHub↔plataformas, migration real, bootstrap real, qualquer feature de produto, URL fictícia de proxy.

## 5. Arquivos Permitidos

- `apps/api/src/http/server.ts`, `server.test.ts` (só se lacuna real)
- `.node-version`, `apps/api/src/node-version.test.ts` (novos, só se lacuna real)
- Documentação DDAE do próprio bloco/prompt/feedback

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Test-first: escreva o teste que prova a lacuna antes de corrigir.
- Não implemente feature de produto neste bloco — é infraestrutura.
- Não invente URL real de Render/Vercel.
- Registre toda pendência com prioridade P1–P4.

## 7. Restrições de Segurança

Nenhuma credencial real tocada. Preferir `DATABASE_CA_CERT_BASE64` a `DATABASE_CA_PATH` para Render.

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Checkpoint de git; worktree isolado a partir de `origin/main`; preservar scaffold do Bloco 02.
2. Inspecionar a estrutura real da API para Render (root, build, start, health, Node).
3. Escrever teste (test-first) provando a lacuna de `.env.local` em produção; confirmar falha.
4. Corrigir `loadLocalEnv`.
5. Escrever teste (test-first) provando a ausência de `.node-version`; confirmar falha.
6. Criar `.node-version`.
7. Inspecionar migrations/bootstrap/CA/DATABASE_ENV — documentar sem executar.
8. Rodar suíte e validações obrigatórias.
9. Documentar evidência, criar feedback.

## 11. Critérios de Aceite

- [x] Estrutura da API mapeada para Render.
- [x] `.env.local` ausente em produção não é mais fatal, testado.
- [x] `.node-version` criado e testado.
- [x] `DATABASE_ENV=production` continua protegido (sem alteração).
- [x] CORS/cookie/proxy same-origin documentados sem URL fictícia.
- [x] Ordem operacional do deploy documentada.
- [x] Nenhuma infraestrutura real tocada.

## 12. Validações Locais Obrigatórias

- [x] `ddae-engine validate`
- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test`
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine audit`

## 13. Feedback Final Obrigatório

```
ddae-engine feedback create --block bloco_02_infraestrutura_de_producao_api_banco_e_proxy --session session_14_preparacao_de_producao_e_deploy_housemanager
```

## 14. Validação Final

Status: **RENDER_READY_FOR_CONFIGURATION / AIVEN_READY_FOR_PRODUCTION_DATABASE / VERCEL_READY_FOR_CONFIGURATION.** Ver seção 25 do bloco.

## 15. Commit Semântico Sugerido

```
fix(http): tolerar ausencia de .env.local em producao e declarar versao do node
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.**

---

## 17. Executado — Evidência

Achado real: `loadLocalEnv()` era fatal em qualquer `runtimeMode` quando `.env.local` não existia — no Render, esse arquivo nunca existe (env vars injetadas pela plataforma). Corrigido test-first: fatal preservado fora de produção, tolerado em produção. `.node-version` (24) criado — nenhuma versão de Node estava declarada em lugar nenhum do repositório. Estrutura real da API mapeada para Render (root `.`, build `npm ci && npm run build:domain && npm run build --workspace=api`, start `node apps/api/dist/index.js`, health `/health`). `DATABASE_ENV=production`/`finanhouse_prod` confirmado protegido sem alteração. Proxy `/api/*` documentado sem URL fictícia — formato exato registrado para quando a URL real do Render existir.

Suíte: API 699 → 704 (+5), Web 467 (inalterado), Domain 214 (inalterado). Total 1380 → 1385.

**Classificações finais: `RENDER_READY_FOR_CONFIGURATION`, `AIVEN_READY_FOR_PRODUCTION_DATABASE`, `VERCEL_READY_FOR_CONFIGURATION`.** Nenhum commit, push ou merge foi realizado.
