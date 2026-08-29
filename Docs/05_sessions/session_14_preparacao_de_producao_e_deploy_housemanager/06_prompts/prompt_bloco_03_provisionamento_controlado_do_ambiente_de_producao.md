# Prompt — Bloco 03: Provisionamento controlado do ambiente de produção

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_14_preparacao_de_producao_e_deploy_housemanager/05_blocks/bloco_03_provisionamento_controlado_do_ambiente_de_producao.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Executar exclusivamente a FASE A (Aiven) do provisionamento controlado: confirmar ou criar `finanhouse_prod` no serviço Aiven existente, sem tocar em Render, Vercel, migrations ou bootstrap.

## 3. Escopo

Inspeção somente-leitura de privilégio (`SHOW GRANTS`) e existência (`SHOW DATABASES`); criação condicional de `finanhouse_prod` apenas se não existir e o privilégio for confirmado; verificação TLS/`DATABASE_ENV` end-to-end sem aplicar migrations; reconfirmação de que `finanhouse_dev` permanece intacto; documentação do resultado sem expor credenciais.

## 4. Fora de Escopo

Render (criação de serviço, conexão GitHub, variáveis reais), Vercel (projeto, conexão GitHub, `vercel.json` com URL real), migrations reais, bootstrap de dados reais, qualquer feature de produto, qualquer commit/push/merge.

## 5. Arquivos Permitidos

- Nenhum arquivo de código-fonte do projeto (FASE A é puramente operacional sobre infraestrutura Aiven).
- Scripts diagnósticos temporários fora do controle de versão, removidos antes do fim da rodada.
- Documentação DDAE do próprio bloco/prompt (feedback reservado para depois de FASE B/C).

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Nunca imprimir/versionar/documentar valores de credenciais — apenas nomes de variáveis e resultados booleanos derivados.
- Preferir inspeção somente-leitura (`SHOW GRANTS`) a qualquer tentativa cega de `CREATE DATABASE`; se a permissão não puder ser confirmada com segurança, parar e pedir ação manual no painel Aiven.
- Nome do banco de produção deve ser exatamente `finanhouse_prod` — nenhuma variação.
- Nunca alterar `apps/api/.env.local`.
- Nenhuma ação `CREATE`/`ALTER`/`DROP`/`INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`/migration/seed/bootstrap em `finanhouse_dev`.
- Nenhuma migration aplicada em `finanhouse_prod` nesta rodada, mesmo após criação.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Nunca imprimir: `DATABASE_PASSWORD`, host completo, connection string, certificado CA, usuário+senha combinados, conteúdo de `.env.local`. Relatório final mostra apenas `CONFIGURADO`/`NÃO CONFIGURADO` ou nomes de variáveis — nunca valores. TLS `verify_identity` deve permanecer a única forma aceita de conexão (sem alteração de `database-config.ts`/`database-ca.ts`).

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Checkpoint de git; worktree isolado a partir de `origin/main`; preservar scaffold do Bloco 03.
2. Localizar fonte local de credenciais Aiven acessível (sem copiar/expor).
3. `npm ci` no worktree isolado.
4. Inspeção somente-leitura: `SHOW DATABASES` (existência) e `SHOW GRANTS FOR CURRENT_USER()` (privilégio `CREATE`).
5. Se `finanhouse_prod` não existir e privilégio for confirmado: `CREATE DATABASE finanhouse_prod` com charset/collation de `finanhouse_dev`; verificar vazio.
6. Verificar `DATABASE_ENV=production` aceita `finanhouse_prod` (TLS, `SELECT 1`) e continua rejeitando `finanhouse_dev`.
7. Reconfirmar `finanhouse_dev` inalterado (contagem de tabelas).
8. Remover todos os scripts diagnósticos temporários.
9. Rodar suíte completa de validação local.
10. Documentar evidência no bloco; registrar classificações; não gerar feedback; não versionar nada.

## 11. Critérios de Aceite

- [x] Privilégio confirmado sem tentativa cega.
- [x] `finanhouse_prod` criado e vazio.
- [x] `finanhouse_dev` intacto.
- [x] Guarda `DATABASE_ENV`/`DATABASE_NAME` intacta.
- [x] Nenhuma migration aplicada.
- [x] Nenhuma credencial exposta.
- [x] Nenhum código alterado; nenhum versionamento executado.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `npm run build`
- [x] `npm run verify:runtime`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run typecheck:api-scripts`
- [x] `npm run test` (API 704 / Web 467 / Domain 214 — total 1385, sem regressão)
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine audit`

## 13. Feedback Final Obrigatório

**Não gerado nesta rodada** — por decisão explícita do usuário, reservado para depois de FASE B (Render) e FASE C (migrations reais + Vercel + deploy) também estarem concluídas.

## 14. Validação Final

FASE A: **AIVEN PHASE COMPLETE.** Classificações: `AIVEN_PROD_DATABASE_CREATED`, `BACKUP_MANUAL_CONFIRMATION_REQUIRED`, `MIGRATIONS_READY_FOR_PRODUCTION`. Ver seção 18 do bloco.

FASE B: **`RENDER_PHASE_COMPLETE`.** Usuário criou o Web Service manualmente seguindo a tabela documentada na seção 19 do bloco e reportou `RENDER_API_URL=https://finanhouse.onrender.com`. Verificado independentemente por este agente (chamada HTTP pública, sem credenciais): `/health` → 200, `/ready` → 200 com `ready:true` e `tlsActive:true` (confirma conexão real com `finanhouse_prod` via TLS). `MIGRATIONS_APPLIED_TO_PROD` confirmado.

FASE C: **`VERCEL_PROXY_CONFIGURED`.** `apps/web/vercel.json` atualizado com a regra real `/api/:path*` → `https://finanhouse.onrender.com/api/:path*` como primeira entrada de `rewrites`, antes do fallback de SPA. `apps/web/vercel.config.test.ts` com 3 testes novos (destino real, ordem das regras, URL resolvível) + 4 preexistentes, todos passando. Same-origin preservado — nenhuma alteração em `VITE_API_BASE_URL`/cookie/CORS. Ver seção 20 do bloco.

## 15. Commit Semântico Sugerido

Não aplicável nesta rodada — nenhum código foi alterado e o usuário determinou explicitamente nenhum versionamento nesta rodada.

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Nesta rodada, nenhum commit foi sugerido nem executado — a rodada é puramente operacional sobre a infraestrutura Aiven.
