# Feedback — Bloco 18: Persistência real de limites mensais por categoria

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-08-04

## 1. Resumo Executivo

Persistidos de verdade os limites mensais por categoria (`CategoryBudget`), completando o Planejamento que o Bloco 17 deixou apenas com contas previstas reais. O domínio (regras, cálculos) já existia desde o Bloco 09 e foi reaproveitado sem alteração; este bloco adicionou a tabela `category_budgets` (FKs compostas para `monthly_periods`/`categories`, mesmo padrão de isolamento por household de `financial_entries`, DT-09), o repositório Drizzle (`save()` "nunca upsert", mesmo padrão de `MonthlyPeriodRepository`), os serviços de aplicação, os endpoints `GET`/`PUT`/`DELETE .../periods/:referenceMonth/budgets`, e a integração real no frontend (hook dedicado `usePeriodBudgets`, fora de `FinanceProvider`, e uma UI nova na Planejamento — nunca em memória). Um script de auditoria e um script de smoke-test dedicados foram criados especificamente para este bloco, porque os equivalentes dos Blocos 12-16 assumem banco vazio, o que deixou de ser verdade desde o bootstrap estrutural do Bloco 17. Após um checkpoint com validações completas e pré-flight somente leitura aprovados, o proprietário autorizou explicitamente (`AUTORIZO MIGRATION CATEGORY_BUDGETS FINANHOUSE_DEV`) e a migration `0002_category_budgets.sql` foi aplicada uma única vez a `finanhouse_dev`. Auditoria pós-migration e smoke-test transacional (rollback intencional) aprovados; validação funcional confirmou o endpoint respondendo corretamente contra a competência real do household (`GET .../budgets` → `{"data":[]}`, sem nenhum dado permanente criado). RF-07 está concluído.

## 2. Objetivo do Bloco

Persistir de verdade (Aiven MySQL, `finanhouse_dev`) os limites mensais por categoria (`CategoryBudget`), completando o Planejamento que o Bloco 17 deixou funcional apenas para contas previstas.

## 3. Escopo Implementado

Igual ao planejado em `05_blocks/bloco_18_persistencia_real_de_limites_mensais_por_categoria.md`, seção 4 — sem divergência de escopo. Um item adicional foi necessário e não estava no escopo original: um smoke-test transacional dedicado (`db-smoke-category-budgets.ts`), porque `db-smoke-repositories.ts`/`db-smoke-http.ts` (Bloco 14/16) exigem as seis tabelas estruturais vazias — pré-condição que não é mais verdade desde o bootstrap do Bloco 17. Sem esse script novo, não havia como validar a persistência real com rollback antes da conferência funcional.

## 4. Arquivos Criados

- `apps/api/src/db/schema/category-budgets.ts`, `database/migrations/0002_category_budgets.sql` (+ `meta/0002_snapshot.json`)
- `apps/api/src/application/ports/category-budget-repository.ts`, `apps/api/src/application/services/category-budget-services.ts` (+ `.test.ts`)
- `apps/api/src/infrastructure/repositories/drizzle/drizzle-category-budget-repository.ts`, `mappers/category-budget-mapper.ts` (+ `.test.ts` de ambos)
- `apps/api/src/infrastructure/repositories/memory/in-memory-category-budget-repository.ts`
- `apps/api/src/http/routes/category-budgets.ts` (+ `.test.ts`), `schemas/category-budget-schemas.ts`, `mappers/category-budget-dto.ts`
- `apps/api/src/db/category-budgets-audit.ts` (+ `.test.ts`), `apps/api/scripts/db-audit-category-budgets.ts`, `apps/api/scripts/db-smoke-category-budgets.ts`
- `apps/web/src/hooks/use-period-budgets.ts` (+ `.test.tsx`)
- `apps/web/src/components/planning/{BudgetFormDialog,BudgetProgress,BudgetSummaryCards,CategoryBudgetList}.tsx`
- `Docs/05_sessions/.../05_blocks/bloco_18_...md`, `06_prompts/prompt_bloco_18_...md`

## 5. Arquivos Alterados

- `apps/api/src/db/schema/index.ts`, `db/types.ts`, `application/ports/index.ts`, `application/services/index.ts`
- `apps/api/src/infrastructure/repositories/drizzle/{create-drizzle-repositories,index}.ts` (+ `.test.ts`), `test-support/fake-drizzle-db.ts` (novo método `delete()`)
- `apps/api/src/infrastructure/repositories/memory/index.ts`
- `apps/api/src/http/{app,test-support/build-test-app}.ts`, `schemas/common.ts`
- `apps/api/package.json`, `package.json` (raiz) — scripts `db:audit:category-budgets`, `db:smoke:category-budgets`
- `apps/api/scripts/connection-safety.test.ts`
- `database/migrations/meta/_journal.json`
- `apps/web/src/api/{financial-api,financial-api.types,financial-api.mappers,api-client}.ts` (+ `financial-api.mappers.test.ts`)
- `apps/web/src/pages/PlanningPage.tsx` (+ `.test.tsx`), `apps/web/src/App.test.tsx`
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-13), `Docs/03_contracts/{contrato_api_http,contrato_frontend_backend,contrato_banco_dados}.md`, `Docs/01_product/requisitos_funcionais.md` (RF-06, RF-07)
- `README.md`, `apps/api/README.md`, `apps/web/README.md`

## 6. Arquivos Removidos

- `apps/web/src/components/planning/CategoryDistributionList.tsx` (substituído por `CategoryBudgetList.tsx`)

## 7. Comandos Executados

```
git switch -c feat/session-11-bloco-18-category-budgets-real
npx ddae-engine block create "Persistência real de limites mensais por categoria" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_18_persistencia_real_de_limites_mensais_por_categoria --session session_11_fundacao_do_finanhouse
cd apps/api && npx drizzle-kit generate && npx drizzle-kit check
npm run build / verify:runtime / lint / typecheck / typecheck:api-scripts / test (múltiplas iterações)
npx ddae-engine validate / audit
npm audit --omit=dev / npm audit
npm run db:check
npm run db:audit:category-budgets -- --phase=before   (pré-flight, somente leitura)
CONFIRM_DATABASE_MIGRATION=true npm run db:migrate   (1 execução, autorizada, aplicou 0002_category_budgets.sql)
npm run db:audit:category-budgets -- --phase=after
CONFIRM_CATEGORY_BUDGETS_SMOKE=true npm run db:smoke:category-budgets   (script novo, rollback intencional)
npm run dev:api / npm run dev --workspace=web -- --host 127.0.0.1 --port 5173   (validação funcional local)
npx ddae-engine feedback create --block bloco_18_persistencia_real_de_limites_mensais_por_categoria --session session_11_fundacao_do_finanhouse
```

## 8. Testes Realizados

- 69 testes adicionados no conjunto do trabalho, elevando o total de 765 (fim do Bloco 17) para **834**: API 337→391 (+54: mapper, repositório Drizzle, serviços de aplicação, rotas HTTP, guards de auditoria), web 275→290 (+15: mapper `categoryBudgetFromDto`, hook `usePeriodBudgets` com StrictMode/cancelamento/mutações/execução obsoleta/desmontagem, reescrita de `PlanningPage.test.tsx`), domain inalterado (153).
- Testes automatizados cobrem: `save()` "nunca upsert" e rejeição de household divergente do registro existente; isolamento por household nas quatro combinações (leitura/escrita × mesmo/outro household); idempotência do `PUT` (201 criação / 200 atualização); 409 `DOMAIN_CONFLICT` (nunca 404) para categoria/período de outro household, mesmo padrão de `financial_entries` (DT-09); bloqueio de competência fechada; categoria inativa/de receita rejeitada; hook `usePeriodBudgets` em `React.StrictMode` sem `mountedRef` compartilhado, cancelamento por `AbortController` por execução, execução obsoleta não sobrescrevendo a mais recente, desmontagem cancelando a carga em andamento, duplo envio de mutação impedido por `pendingActionRef`.
- **Validação funcional manual (real, não simulada):** API (`npm run dev:api`) e frontend (`npm run dev --workspace=web`) iniciados localmente contra `finanhouse_dev` pós-migration. Confirmado via HTTP real: `GET /health` 200, `GET /ready` 200 (TLS/pool/conexão ok), `GET /api/v1/households/11/periods` retornou a competência real (`id:6, referenceMonth:2026-08-01, status:open`), `GET /api/v1/households/11/periods/2026-08-01/budgets` retornou `{"data":[]}` — endpoint novo funcionando contra a tabela real recém-criada, sem nenhum limite permanente criado. `curl http://127.0.0.1:5173/` retornou 200. API e frontend deixados em execução em background para conferência visual do proprietário.

## 9. Validações Executadas

- `ddae-engine validate`: OK, 0 warnings/erros.
- `ddae-engine audit`: OK, 0 pendências P1/P2 (warnings esperados de quality gates pendentes, mesma linha de base de blocos anteriores).
- `npm run build` / `verify:runtime` / `lint` / `typecheck` / `typecheck:api-scripts` / `test`: todos aprovados (build corrigido após um import relativo `.ts`→`.js` incorreto em `category-budgets-audit.test.ts`).
- `npx drizzle-kit check`: "Everything's fine".
- `npm audit --omit=dev`: 0 vulnerabilidades. `npm audit`: 4 moderadas, dev-only (`drizzle-kit`/`esbuild`), já documentadas em blocos anteriores, não corrigidas por instrução explícita do proprietário.
- Pré-flight (antes da migration): Aiven, development, `finanhouse_dev`, TLS ativo, 6/6 tabelas estruturais, `category_budgets` ausente, 2 migrations, contagens `households:1, users:2, household_members:2, categories:7, monthly_periods:1, financial_entries:0`.
- Pós-migration: 7/7 tabelas da aplicação presentes, `category_budgets` vazia, 3 migrations registradas, contagens das seis tabelas estruturais idênticas ao pré-flight.
- Smoke-test transacional: repositório (criação, leitura após escrita, atualização "nunca upsert", rejeição de household divergente) e rotas HTTP (`PUT` idempotente, listagem, isolamento por household → 409, `DELETE`) aprovados; rollback intencional confirmado, zero dado residual em todas as tabelas, incluindo `category_budgets`.

## 10. Decisões Técnicas

Registrada em `Docs/02_architecture/decisoes_tecnicas.md`, DT-13 — tabela `category_budgets` com FKs compostas (mesmo padrão de DT-09), validação de tipo/status de categoria na aplicação (não no banco), reaproveitamento integral das regras de domínio do Bloco 09, script de auditoria dedicado para migration aplicada sobre banco não-vazio. Uma decisão adicional, não antecipada no bloco original: um script de smoke-test dedicado (`db-smoke-category-budgets.ts`) segue o mesmo raciocínio da auditoria dedicada — reaproveita `assertNoResidualData`/`assertSmokeEnvironmentAllowed`/`assertSmokeMigrationsPresent` de `smoke-repositories-guard.ts`, mas não usa `assertSmokeStartingEmpty` (não aplicável pós-bootstrap).

## 11. Problemas Encontrados

1. **Import relativo com extensão incorreta:** `category-budgets-audit.test.ts` importava `./category-budgets-audit.ts` (extensão `.ts`), quebrando `npm run build` (`tsc -p tsconfig.json`, resolução `NodeNext` exige `.js` em imports relativos mesmo em arquivos `.ts` — convenção já usada em todo o resto do projeto). Corrigido para `.js`; nenhum outro arquivo novo tinha o mesmo problema (confirmado por busca).
2. **Teste próprio com expectativa errada:** um teste de `category-budgets.test.ts` esperava 404 para categoria de outro household referenciada no `PUT`; a API corretamente retorna 409 `DOMAIN_CONFLICT` (mesmo padrão de `financial_entries`, DT-09, confirmado em `contrato_api_http.md` seção 3). Corrigido o teste, não a implementação.
3. **Race no teste do hook sob carga:** um teste de `use-period-budgets.test.tsx` ("trocar de competência recarrega os limites") verificava `status === 'ready'` numa asserção síncrona separada de um `waitFor` anterior, criando uma janela onde `LOAD_START` já tinha zerado `budgets` mas o `fetch` da nova competência ainda não tinha resolvido — passava isolado, falhava sob paralelismo da suíte completa. Corrigido combinando as duas condições no mesmo `waitFor`.
4. **`App.test.tsx` desatualizado:** o teste de navegação para `/planejamento` buscava o texto `"Despesas previstas por categoria"` (heading antigo, removido na reescrita da `PlanningPage`); não relacionado a `usePeriodBudgets`/fetch, apenas texto obsoleto. Corrigido para `"Despesas previstas"` (heading atual de `PlanningEntries`).

## 12. Correções Aplicadas Durante o Bloco

1. Import `.ts` → `.js` em `category-budgets-audit.test.ts` (item 11.1).
2. Assertiva do teste de isolamento por household corrigida de 404 para 409 (item 11.2).
3. `waitFor` combinado no teste de troca de competência do hook (item 11.3).
4. Texto de asserção atualizado em `App.test.tsx` (item 11.4).

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._

### P3 — Melhoria Recomendada

- Autenticação real — `createdByUserId` continua resolvido como o primeiro membro `role: 'owner'`, não um usuário autenticado (mesma pendência de DT-12, não introduzida neste bloco).
- Validação funcional foi feita via chamadas HTTP reais (curl), não via navegador — recomenda-se ao proprietário abrir `http://127.0.0.1:5173/planejamento` para confirmação visual final (API e frontend deixados em execução em background ao final deste bloco).

### P4 — Opcional

- Recorrência de limites entre competências (copiar do mês anterior) — não solicitada, possível melhoria futura de UX.

## 14. Riscos Restantes

Nenhum risco novo além dos já documentados (DT-09, DT-11, DT-12). Isolamento por household reforçado no banco via FKs compostas idênticas ao padrão já validado de `financial_entries`. A API continua inacessível fora de `127.0.0.1` e recusa `production`.

## 15. Evidências

- Migration aplicada: `0002_category_budgets.sql`, journal com 3 migrations registradas (era 2).
- Auditoria pós-migration: `Tabelas da aplicação presentes: 7/7`, `category_budgets: vazia (esperado)`, `Contagens das seis tabelas estruturais: preservadas`.
- Smoke-test: `Smoke-test de category_budgets aprovado` — repositório e HTTP exercitados, rollback confirmado, `Contagens finais: idênticas às iniciais em todas as tabelas, incluindo category_budgets`.
- `GET /api/v1/households/11/periods/2026-08-01/budgets` real: `{"data":[]}` — endpoint funcional, sem nenhum limite permanente criado.
- 834 testes aprovados (391 API / 290 web / 153 domain); `ddae-engine audit`: 0 P1/P2.

## 16. Resultado Final

- [x] Bloco concluído conforme escopo

## 17. Próximo Bloco Recomendado

Autenticação real de usuário final — próximo passo natural do roadmap (RF-05), substituindo a resolução de `createdByUserId` pelo primeiro membro `owner` por um usuário autenticado de fato.

## 18. Commit Semântico Sugerido

```
feat(api,web): persistir limites mensais por categoria (category_budgets)
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
