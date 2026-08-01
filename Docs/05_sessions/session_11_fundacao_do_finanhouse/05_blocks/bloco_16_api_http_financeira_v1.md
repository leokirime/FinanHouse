# Bloco 16 — API HTTP financeira v1

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-31

## 1. Objetivo

Criar a camada HTTP da API do FinanHouse, conectando os serviços de aplicação e os repositórios Drizzle reais (Bloco 14) — uma API local testável para competências, movimentações, categorias e membros do household, sem integrar o frontend nem implementar autenticação real.

## 2. Contexto

DT-10 (Bloco 14) deixou explícito que endpoints de API HTTP e integração do frontend eram o próximo passo pendente de RF-05. Este bloco fecha a parte de endpoints; a integração do frontend fica para um bloco futuro.

## 3. Problema que Este Bloco Resolve

A API só tinha `GET /health` sobre `node:http` puro, sem framework, sem roteador, sem validação de corpo — nenhuma forma de expor os serviços de aplicação já existentes (movimentações, competências) via HTTP.

## 4. Escopo

- Fastify como camada HTTP (`apps/api/src/http/`), fábrica pura + bootstrap runtime separados.
- 21 rotas sob `/api/v1/households/:householdId/...` (categorias, membros, competências, movimentações e suas transições).
- Validação de entrada via JSON Schema (AJV), DTOs explícitos, tratamento central de erros.
- Isolamento por household em toda rota financeira.
- Bind local, CORS restrito, recusa de `production` sem autenticação.
- Testes (`app.inject()`) sem conexão real; smoke-test transacional contra `finanhouse_dev`.
- Documentação (DT-11, contrato da API, RF-05, READMEs).

## 5. Fora de Escopo

- Integração do frontend com a API — modo demonstrativo preservado.
- Autenticação real.
- Deploy, migration nova, seed, persistência permanente no Aiven.
- Endpoints de escrita para `users`/`households` (sem porta/repositório — DT-10).

## 6. Arquivos e Pastas Envolvidos

- `apps/api/src/http/**` (app.ts, server.ts, routes/, schemas/, mappers/, errors/, plugins/, test-support/)
- `apps/api/src/index.ts` (substitui o antigo `server.ts` sobre `node:http`)
- `apps/api/scripts/db-smoke-http.ts`
- `apps/api/package.json`, `package.json` (raiz) — dependência `fastify`, scripts `db:smoke:http`
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-11), `Docs/03_contracts/contrato_api_http.md` (novo), `Docs/01_product/requisitos_funcionais.md`
- `README.md`, `apps/api/README.md`, README/bloco/prompt/feedback da sessão

## 7. Dependências

DT-10 (Bloco 14) — repositórios Drizzle reais concluídos e validados.

## 8. Plano de Implementação

1. Inspecionar arquitetura existente (serviços, portas, fábrica de repositórios, config, erros de persistência).
2. Adicionar Fastify; construir `app.ts` (fábrica pura) e `server.ts` (bootstrap).
3. Implementar schemas/mappers/DTOs, error handler central, rotas.
4. Implementar CORS restrito, bind local, recusa de `production`.
5. Escrever testes (`app.inject()`, repositórios em memória).
6. Implementar o smoke-test HTTP transacional.
7. Validar localmente; pré-flight; checkpoint; aguardar autorização.
8. Executar o smoke autorizado; auditar novamente.
9. Documentar; criar feedback DDAE.
10. Validações finais, revisão de segurança, commit, push, merge.

## 9. Critérios de Aceite

- [x] 21 rotas implementadas, reaproveitando os serviços de aplicação existentes.
- [x] Isolamento por household em toda rota financeira.
- [x] Dinheiro como string decimal; coluna auxiliar nunca exposta em DTO.
- [x] Bind local, CORS restrito, recusa de `production` sem autenticação.
- [x] Smoke-test transacional aprovado, rollback confirmado, zero dado residual.
- [x] RF-05 atualizado sem ser declarado concluído.

## 10. Validações Obrigatórias

- [x] `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts` / `test`
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine validate` / `npx ddae-engine audit`
- [x] `npm audit --omit=dev`

## 11. Segurança

API sem autenticação real: `createHttpApp` recusa `runtimeMode: 'production'`; bind hardcoded em `127.0.0.1`; CORS restrito a duas origens locais explícitas, nunca wildcard; `removeAdditional: false` no AJV para nunca descartar silenciosamente campos desconhecidos (ex.: `householdId` concorrente no corpo); erros sempre sanitizados (nunca host/senha/URI/SQL/stack trace ao cliente).

## 12. Performance

Não aplicável — API local, sem carga de produção; consultas delegadas aos repositórios já existentes e testados (Bloco 14).

## 13. Design System / UX

Não aplicável a este bloco — nenhuma alteração de interface visual (a correção retrospectiva do hero/sidebar foi tratada como trabalho intercalado, documentada separadamente em `identidade_visual.md` e no feedback do Bloco 15).

## 14. Riscos

- `nextId()` (herdado do Bloco 14) não é atômico sob concorrência real — mesmo risco já documentado, agora também exposto via HTTP.
- Nenhuma porta para `users`/`households` limita quais operações a API pode expor sem uma decisão arquitetural futura.

## 15. Pendências Esperadas

- P3/roadmap: integração do frontend com esta API e autenticação real — próximos passos naturais, não pendências deste bloco.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_16_api_http_financeira_v1 --session session_11_fundacao_do_finanhouse` — ver `08_feedbacks/feedback_bloco_16_api_http_financeira_v1.md`.

## 17. Commit Semântico Sugerido

```
feat(api): implementar API HTTP financeira v1
```
