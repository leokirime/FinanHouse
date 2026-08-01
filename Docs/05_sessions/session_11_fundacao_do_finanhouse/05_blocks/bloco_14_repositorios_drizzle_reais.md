# Bloco 14 — Repositórios Drizzle reais

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-31

## 1. Objetivo

Implementar os adaptadores Drizzle reais para as portas de repositório já existentes (`FinancialEntryRepository`, `MonthlyPeriodRepository`, `CategoryRepository`, `HouseholdMemberRepository`), conectando a arquitetura de aplicação já modelada ao schema real aplicado no Aiven.

## 2. Contexto

DT-08 (Bloco 12) aplicou o schema inicial e DT-09 (Bloco 13) corrigiu a integridade composta do membro responsável — ambos deixaram RF-05 explicitamente incompleta, apontando repositórios Drizzle reais como a próxima peça. Este bloco fecha essa peça específica, sem tocar em endpoints HTTP nem no frontend.

## 3. Problema que Este Bloco Resolve

A aplicação só lê/escreve os repositórios em memória (`apps/api/src/infrastructure/repositories/memory/`) — nenhum adaptador real conecta as portas já existentes ao banco `finanhouse_dev`, mesmo com o schema completo e íntegro já aplicado.

## 4. Escopo

- Inspeção da arquitetura existente (portas, serviços, repositórios em memória, schema) antes de implementar.
- Adaptadores Drizzle reais para as quatro portas existentes, recebidos por injeção de dependência.
- Fábrica `createDrizzleRepositories(db)`.
- Mapeadores dedicados (dinheiro, datas, enums) entre linhas do MySQL e entidades de domínio.
- Tratamento correto da coluna auxiliar `responsible_member_household_id` (DT-09) — derivada internamente, nunca aceita/exposta.
- Escrita (`save`) escopada explicitamente por household, sem upsert.
- Tradução de erros de driver para uma hierarquia sanitizada.
- Testes unitários sem conexão real (mapeadores, erros, repositórios via double).
- Script de smoke-test transacional contra `finanhouse_dev`, com checkpoint humano obrigatório e rollback intencional.
- Documentação (DT-10, RF-05, contrato de banco, READMEs, bloco/prompt/feedback).

## 5. Fora de Escopo

- Endpoints HTTP (fica para um bloco futuro).
- Integração do frontend com a API real — o modo demonstrativo em memória é preservado.
- Seed, migration nova, alteração de schema.
- Repositório para `users`/`households` — nenhuma porta existe hoje; lacuna registrada (DT-10), não preenchida.

## 6. Arquivos e Pastas Envolvidos

- `apps/api/src/infrastructure/repositories/drizzle/` (novo)
- `apps/api/src/db/sanitize-error.ts` (relocado de `apps/api/scripts/lib/`)
- `apps/api/src/db/smoke-repositories-guard.ts` (novo)
- `apps/api/scripts/db-smoke-repositories.ts` (novo)
- `apps/api/scripts/db-check.ts`, `db-migrate.ts`, `db-seed-dev.ts`, `db-audit-schema.ts`, `db-audit-responsible-member-integrity.ts` (import atualizado)
- `apps/api/package.json`, `package.json` (raiz) — novo script `db:smoke:repositories`
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-10), `Docs/01_product/requisitos_funcionais.md`, `Docs/03_contracts/contrato_banco_dados.md`
- `README.md`, `apps/api/README.md`, `apps/api/src/application/README.md`, `apps/api/src/infrastructure/README.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md` e os documentos deste bloco

## 7. Dependências

- DT-08 (migration inicial aplicada) e DT-09 (integridade do membro responsável) — ambas concluídas.
- Serviço Aiven `finanhouse-mysql` em execução (Powered on).

## 8. Plano de Implementação

1. Inspecionar portas, serviços, repositórios em memória e schema existentes.
2. Implementar mapeadores, tradução de erros e os quatro repositórios Drizzle + fábrica.
3. Escrever testes unitários sem conexão real.
4. Implementar o script de smoke-test transacional.
5. Validar localmente (build, lint, typecheck, testes, `drizzle-kit check`, DDAE, `npm audit`).
6. Pré-flight somente leitura contra o Aiven.
7. Apresentar checkpoint e aguardar autorização explícita.
8. Executar o smoke-test autorizado; auditar novamente após.
9. Documentar (DT-10 e demais); criar feedback DDAE.
10. Validações finais, revisão de segurança, commit, push, merge.

## 9. Critérios de Aceite

- [x] As quatro portas existentes têm adaptador Drizzle real, sem porta nova criada.
- [x] Nenhuma conexão é aberta durante a importação dos módulos.
- [x] Escrita (`save`) sempre escopada por `household_id`, sem upsert.
- [x] Coluna auxiliar do membro responsável nunca é aceita como entrada nem exposta ao domínio.
- [x] Smoke-test transacional aprovado, com rollback confirmado e zero dado residual.
- [x] Nenhuma migration nova, nenhum seed, nenhum dado real inserido.
- [x] RF-05 atualizado sem ser declarado concluído.

## 10. Validações Obrigatórias

- [x] `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts`
- [x] `npm run test` (suíte completa)
- [x] `npx drizzle-kit check`
- [x] `npx ddae-engine validate` / `npx ddae-engine audit`
- [x] `npm audit --omit=dev`
- [x] `npm run db:check`, `db:audit:schema -- --phase=after`, `db:audit:responsible-member -- --phase=after` (antes e depois do smoke)

## 11. Segurança

Nenhuma credencial, host, porta ou Service URI é impressa pelos repositórios ou pelo smoke-test — erros de driver são sempre traduzidos via `translatePersistenceError`/`categorizeConnectionError` antes de qualquer log. O smoke-test usa exclusivamente dados sintéticos com domínio `.invalid` e executa `ROLLBACK` incondicional. Um bug real de isolamento por household foi encontrado e corrigido durante o próprio checkpoint (upsert sem escopo) — ver DT-10.

## 12. Performance

Não aplicável — nenhuma consulta nova de alto volume; `nextId()` via `information_schema` tem custo desprezível para o volume de dados deste projeto (documentado como não adequado a concorrência real de produção).

## 13. Design System / UX

Não aplicável — nenhuma alteração de interface. A visualização local do frontend (seção 30 do prompt) serve apenas para confirmar ausência de regressão.

## 14. Riscos

- `nextId()` via `information_schema.TABLES.AUTO_INCREMENT` não é atômico sob múltiplos escritores concorrentes — aceitável no escopo atual (aplicação de um único usuário), documentado explicitamente no código como limitação, não como solução definitiva.
- Ausência de porta/repositório para `users`/`households` pode exigir revisão arquitetural quando um bloco futuro precisar criá-los/editá-los diretamente.

## 15. Pendências Esperadas

- P3/roadmap: endpoints de API HTTP e integração do frontend continuam pendentes (RF-05) — não é uma P2, é o próximo passo natural do roadmap.
- P4: formalizar a convenção de scripts de diagnóstico temporários (usada em Blocos 13 e 14) em algum lugar da documentação de processo, se isso se repetir novamente.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_14_repositorios_drizzle_reais --session session_11_fundacao_do_finanhouse` — ver `08_feedbacks/feedback_bloco_14_repositorios_drizzle_reais.md`.

## 17. Commit Semântico Sugerido

```
feat(api): implementar repositórios Drizzle reais
```
