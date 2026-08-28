# Prompt — Bloco 01: Arquitetura HTTP e desbloqueio seguro do runtime de produção

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_14_preparacao_de_producao_e_deploy_housemanager/05_blocks/bloco_01_arquitetura_http_e_desbloqueio_seguro_do_runtime_de_producao.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Remover os três bloqueadores de código (portão de produção, bind de host, CORS) identificados na auditoria de deploy pós-Sessão 12, sem escolher provedor, sem deploy real.

## 3. Escopo

`config/cors-config.ts`, `config/http-bind-config.ts`, `http/plugins/cors.ts`, `http/app.ts`, `http/server.ts`, testes correspondentes, `apps/web/vercel.json` (só fallback de SPA), `.env.example`.

## 4. Fora de Escopo

Escolha de provedor de host, provisionamento de `finanhouse_prod`, backup, domínio/DNS, proxy real de `/api/*`, conversão para serverless, qualquer alteração de `SameSite`/`Domain` do cookie, deploy real, Aiven, migration.

## 5. Arquivos Permitidos

- `apps/api/src/config/cors-config.ts`, `cors-config.test.ts` (novos)
- `apps/api/src/config/http-bind-config.ts`, `http-bind-config.test.ts` (novos)
- `apps/api/src/http/plugins/cors.ts`
- `apps/api/src/http/app.ts`, `app.test.ts`
- `apps/api/src/http/server.ts`, `server.test.ts`
- `apps/web/vercel.json`, `vercel.config.test.ts` (novos)
- `.env.example`
- Documentação DDAE do próprio bloco/prompt/feedback

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Test-first: escreva o teste que prova a lacuna antes de tocar em cada bloqueador.
- Não enfraqueça nenhum teste anterior que esperava a recusa de produção — atualize-o para provar a nova política segura.
- Não substitua o portão de produção por um `throw` removido sem nada no lugar — precisa ser uma validação real de pré-condições, fail closed.

## 7. Restrições de Segurança

Nenhuma mensagem de erro nova pode expor segredo/credencial. CORS nunca `*` com `credentials`. Cookie de sessão preservado sem enfraquecimento (`Secure`/`HttpOnly` continuam garantidos).

## 8. Restrições de Performance

Não aplicável — validação de configuração síncrona, uma única vez no startup.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Escrever `cors-config.test.ts` (test-first), confirmar falha, implementar `cors-config.ts`.
2. Escrever `http-bind-config.test.ts` (test-first), confirmar falha, implementar `http-bind-config.ts`.
3. Atualizar `plugins/cors.ts` para receber origens por parâmetro.
4. Atualizar `app.ts`: `corsAllowedOrigins` opcional, portão de produção via `assertOriginsSafeForProduction`.
5. Atualizar `server.ts`: resolver bind/CORS do ambiente antes de qualquer conexão de banco.
6. Atualizar `app.test.ts`/`server.test.ts` para provar a nova política (não remover cobertura).
7. Escrever `vercel.config.test.ts` (test-first), confirmar falha, criar `apps/web/vercel.json`.
8. Documentar as novas variáveis em `.env.example`.
9. Rodar toda a suíte e validações obrigatórias.
10. Documentar evidência e criar o feedback.

## 11. Critérios de Aceite

- [x] `createHttpApp` constrói em produção com configuração válida; falha fechado sem ela.
- [x] Bind/CORS configuráveis, fail closed em produção nas mesmas condições de ausência/localhost.
- [x] Nenhum teste anterior enfraquecido.
- [x] Cookie de sessão sem alteração de código.
- [x] Modelo Fastify persistente preservado.
- [x] `vercel.json` com fallback de SPA que nunca captura `/api/*`.
- [x] Nenhuma migration, Aiven ou dado real.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

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

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_01_arquitetura_http_e_desbloqueio_seguro_do_runtime_de_producao --session session_14_preparacao_de_producao_e_deploy_housemanager
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Status: **Tecnicamente concluído — API_READY_FOR_PERSISTENT_NODE_HOST.** Ver seção 20 do bloco e o feedback para a classificação completa.

## 15. Commit Semântico Sugerido

```
feat(http): desbloquear runtime de producao com validacao real de pre-condicoes
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.

---

## 17. Executado — Evidência

Todas as tarefas (seção 10) executadas em ordem, test-first confirmado (cada novo módulo/arquivo teve seu teste escrito e falhando por ausência antes da implementação). Detalhe completo, incluindo trechos de código e contagem de testes, na seção 18–20 do bloco (`05_blocks/bloco_01_...md`).

Resumo: `config/cors-config.ts` e `config/http-bind-config.ts` novos (fail closed em produção, defaults preservados fora dela); `plugins/cors.ts`/`http/app.ts`/`http/server.ts` atualizados para usá-los; portão de produção agora é uma validação real, não um `throw` incondicional; `apps/web/vercel.json` criado com fallback de SPA que nunca captura `/api/*`; `.env.example` documentado.

Suíte final: API 668 → 699 (+31), Web 463 → 467 (+4), Domain 214 (inalterado). Total 1345 → 1380. Todas as validações da seção 12 passaram limpas.

**Classificação final: API_READY_FOR_PERSISTENT_NODE_HOST.** Nenhum commit, push ou merge foi realizado — aguardando nova aprovação explícita do usuário.
