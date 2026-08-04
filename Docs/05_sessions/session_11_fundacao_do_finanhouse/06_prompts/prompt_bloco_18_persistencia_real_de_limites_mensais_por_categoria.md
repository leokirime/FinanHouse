# Prompt — Bloco 18: Persistência real de limites mensais por categoria

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_11_fundacao_do_finanhouse/05_blocks/bloco_18_persistencia_real_de_limites_mensais_por_categoria.md`
- `Docs/03_contracts/contrato_api_http.md`, `contrato_frontend_backend.md`, `contrato_banco_dados.md` e `Docs/02_architecture/decisoes_tecnicas.md` (DT-09, DT-10, DT-12)

## 2. Objetivo

Persistir de verdade os limites mensais por categoria (`CategoryBudget`) em `finanhouse_dev`, completando o Planejamento que o Bloco 17 deixou apenas com contas previstas reais.

## 3. Escopo

Tabela `category_budgets` + migration `0002` (gerada, revisada e aplicada a `finanhouse_dev` com autorização explícita); porta + repositórios (Drizzle e em memória); serviços de aplicação; endpoints HTTP `.../periods/:referenceMonth/budgets`; script de auditoria e smoke-test dedicados (banco não-vazio); hook `usePeriodBudgets` e UI real na Planejamento (sem fallback em memória).

## 4. Fora de Escopo

Autenticação real; aplicação da migration sem autorização explícita; qualquer alteração em `financial_entries`; recorrência de limites entre competências.

## 5. Arquivos Permitidos

- `apps/api/src/db/schema/category-budgets.ts`, `schema/index.ts`, `db/types.ts`
- `database/migrations/0002_category_budgets.sql`, `meta/_journal.json`, `meta/0002_snapshot.json`
- `apps/api/src/application/ports/category-budget-repository.ts`, `ports/index.ts`, `application/services/category-budget-services.ts`, `services/index.ts`
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-category-budget-repository.ts`, `mappers/category-budget-mapper.ts`, `create-drizzle-repositories.ts`, `index.ts`, `test-support/fake-drizzle-db.ts`
- `apps/api/src/infrastructure/repositories/memory/in-memory-category-budget-repository.ts`, `index.ts`
- `apps/api/src/http/routes/category-budgets.ts`, `schemas/category-budget-schemas.ts`, `schemas/common.ts`, `mappers/category-budget-dto.ts`, `app.ts`, `test-support/build-test-app.ts`
- `apps/api/src/db/category-budgets-audit.ts`, `apps/api/scripts/db-audit-category-budgets.ts`, `apps/api/scripts/db-smoke-category-budgets.ts`, `apps/api/package.json`, `package.json` (raiz), `scripts/connection-safety.test.ts`
- `apps/web/src/api/**`, `apps/web/src/hooks/use-period-budgets.ts`, `apps/web/src/components/planning/**`, `apps/web/src/pages/PlanningPage.tsx`, `apps/web/src/App.test.tsx`
- `Docs/02_architecture/decisoes_tecnicas.md`, `Docs/03_contracts/contrato_api_http.md`, `contrato_frontend_backend.md`, `contrato_banco_dados.md`, `Docs/01_product/requisitos_funcionais.md`
- `README.md`, `apps/web/README.md`, `apps/api/README.md`, documentos deste bloco/sessão

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem necessidade real (nenhuma foi adicionada neste bloco).
- Checkpoint humano obrigatório antes de qualquer escrita real (aplicação da migration) — nunca `drizzle-kit push`, nunca `drizzle-kit migrate` sem a frase de autorização exata.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

API sem autenticação real permanece; bind local, CORS restrito (herdados dos Blocos 16/17). Isolamento por household reforçado no banco via FKs compostas (mesmo padrão de `financial_entries`, DT-09). Script de auditoria nunca imprime dado financeiro/pessoal, apenas nomes de tabela e contagens. Nunca acessar ou criar `finanhouse_prod`.

## 8. Restrições de Performance

Não aplicável — API e frontend locais, dataset pessoal pequeno. `usePeriodBudgets` escopado à página, não adiciona chamada de rede a páginas que não usam limites.

## 9. Restrições de Design System

Reaproveitar tokens/componentes existentes (`fh-card`, `fh-badge`, `EntryDialog`); `BudgetProgress` recuperado do histórico do Bloco 09 apenas como referência visual, sem religar a nenhum estado em memória.

## 10. Tarefas

1. Confirmar estado inicial; criar branch e bloco/prompt DDAE.
2. Inspecionar domínio/frontend/API/schema/migrations/repositórios existentes.
3. Modelar `category_budgets`; gerar migration `0002` (sem aplicar); registrar DT-13.
4. Implementar porta + repositórios (Drizzle e em memória).
5. Implementar serviços de aplicação.
6. Implementar rotas HTTP; atualizar `contrato_api_http.md`; testes de cada camada.
7. Criar o script de auditoria dedicado.
8. Integrar o frontend (cliente HTTP, hook, componentes reais da Planejamento).
9. Escrever testes de frontend (mapper, hook, `PlanningPage`, `App.test.tsx`).
10. Rodar validações completas sem aplicar a migration; pré-flight somente leitura do banco.
11. Atualizar documentação (contratos, READMEs, RF, decisões técnicas).
12. Preencher o conteúdo real deste bloco/prompt.
13. Apresentar checkpoint e aguardar a frase de autorização exata.

## 11. Critérios de Aceite

- [x] Tabela/migration modeladas com isolamento por household (FKs compostas, mesmo padrão de DT-09) — migration aplicada a `finanhouse_dev` com autorização explícita, auditada e validada por smoke-test transacional.
- [x] Repositório Drizzle segue o padrão "nunca upsert".
- [x] Endpoints idempotentes, isolados por household (409 para outro household, nunca 404).
- [x] Frontend nunca mantém limite só em memória.
- [x] Suíte de testes ampliada sem reduzir a base anterior (834 testes ao final: 391 API + 290 web + 153 domínio).

## 12. Validações Locais Obrigatórias

- [x] `ddae-engine validate` / `ddae-engine audit`
- [x] `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts` / `test`
- [x] `npx drizzle-kit check`
- [x] `npm audit --omit=dev` / `npm audit`
- [x] Pré-flight somente leitura do banco (`db:check`, `db:audit:category-budgets -- --phase=before`) antes do checkpoint
- [x] Autorização recebida; migration aplicada (`db:migrate`); `db:audit:category-budgets -- --phase=after` aprovado; `db:smoke:category-budgets` (script novo, dedicado) aprovado com rollback e zero dado residual

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_18_persistencia_real_de_limites_mensais_por_categoria --session session_11_fundacao_do_finanhouse
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Status: **Aprovado.** Implementação completa (domínio reaproveitado, persistência, serviços, HTTP, frontend, testes, documentação) validada localmente; autorização explícita recebida (`AUTORIZO MIGRATION CATEGORY_BUDGETS FINANHOUSE_DEV`); migration `0002_category_budgets.sql` aplicada uma única vez a `finanhouse_dev` em 2026-08-04; auditoria pós-migration e smoke-test transacional dedicado aprovados, sem dado residual.

## 15. Commit Semântico Sugerido

```
feat(api,web): persistir limites mensais por categoria (category_budgets)
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
