# Prompt — Bloco 16: API HTTP financeira v1

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_16_api_http_financeira_v1.md`
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-10) e `Docs/03_contracts/contrato_banco_dados.md`

## 2. Objetivo

Criar a camada HTTP da API do FinanHouse, conectando os serviços de aplicação e os repositórios Drizzle reais (Bloco 14) — uma API local testável, sem integrar o frontend nem implementar autenticação real.

## 3. Escopo

Fastify como camada HTTP; 21 rotas sob `/api/v1/households/:householdId/...`; validação via JSON Schema; DTOs explícitos; tratamento central de erros; isolamento por household; bind local; CORS restrito; testes; smoke-test transacional.

## 4. Fora de Escopo

Integração do frontend; autenticação real; deploy; migration nova; seed; endpoints para `users`/`households` (sem porta própria).

## 5. Arquivos Permitidos

- `apps/api/src/http/**`, `apps/api/src/index.ts`
- `apps/api/scripts/db-smoke-http.ts`
- `apps/api/package.json`, `package.json` (raiz)
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/03_contracts/contrato_api_http.md`, `Docs/01_product/requisitos_funcionais.md`
- `README.md`, `apps/api/README.md`, documentos deste bloco/sessão

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não duplique regra de domínio nos handlers — sempre reaproveitar os serviços de aplicação.
- Checkpoint humano obrigatório antes de qualquer escrita real (smoke-test).
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

API sem autenticação real: recusar `runtimeMode: 'production'`; bind exclusivo em `127.0.0.1`; CORS sem wildcard; nunca retornar erro bruto de driver/host/credencial; nunca expor a coluna auxiliar do membro responsável (DT-09) em DTO.

## 8. Restrições de Performance

Não aplicável — API local, sem carga de produção.

## 9. Restrições de Design System

Não aplicável a este bloco (nenhuma alteração de UI planejada originalmente — a correção retrospectiva do hero/sidebar foi tratada como trabalho intercalado, documentada separadamente).

## 10. Tarefas

1. Inspecionar arquitetura existente.
2. Implementar Fastify (`app.ts` fábrica pura + `server.ts` bootstrap).
3. Implementar schemas/mappers/DTOs/error handler/rotas.
4. Implementar CORS/bind/recusa de production.
5. Escrever testes; implementar smoke-test HTTP.
6. Validar; pré-flight; checkpoint; aguardar autorização.
7. Executar smoke autorizado; auditar; documentar; feedback.
8. Validações finais, revisão de segurança, commit, push, merge.

## 11. Critérios de Aceite

- [x] 21 rotas, sem duplicar regra de domínio.
- [x] Isolamento por household; dinheiro como string; coluna auxiliar nunca exposta.
- [x] Smoke-test aprovado com rollback e zero dado residual.

## 12. Validações Locais Obrigatórias

- [x] `ddae-engine validate`
- [x] `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts` / `test`
- [x] `npx drizzle-kit check`
- [x] `ddae-engine audit`
- [x] `npm audit --omit=dev`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_16_api_http_financeira_v1 --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Status: Aprovado — smoke-test HTTP transacional aprovado em todos os passos na primeira execução real, zero dado residual, 738+ testes preservados/novos aprovados.

## 15. Commit Semântico Sugerido

```
feat(api): implementar API HTTP financeira v1
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
