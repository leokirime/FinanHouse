# Feedback — Bloco 05: Regras de domínio e serviços financeiros

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Resumo Executivo

Enquanto o Bloco 04 aguardava resposta da Clever Cloud sobre TLS, este bloco avançou a camada de domínio do Finanhouse de forma inteiramente independente do banco. Implementa: dinheiro em centavos (`bigint`); regras de movimentações financeiras (criação, edição, transições de status previstas/proibidas, validações de valor/data/categoria/membro/household); regras de competência mensal (abertura, revisão, fechamento, reabertura); cálculos de resumo mensal (previsto/realizado/pendente/saldos); comparação entre dois meses; interfaces de repositório e implementações em memória; serviços de aplicação orquestrando tudo isso. `packages/domain/` foi reestruturado em subpastas por conceito, e passou a ser consumido por `apps/api` via o pacote workspace `@finanhouse/domain`. 134 testes automatizados no total (99 em `packages/domain`, 34 em `apps/api`, 1 pré-existente em `apps/web`), todos passando. Nenhuma conexão com o banco, nenhum import de `mysql2`/`drizzle-orm`/`.env*` nos novos arquivos, nenhuma alteração no schema Drizzle ou na migration existente, e a branch do Bloco 04 permaneceu intocada durante a execução original.

**Reconciliação estrutural (mesma data, pós-revisão):** o Bloco 04 foi integrado à `main` antes deste bloco (merge `cad88c8`), a branch deste bloco foi atualizada com `main` (merge `4ed79d7`), e a identidade oficial DDAE deste bloco foi regularizada — os três arquivos originais (criados com o identificador `bloco_04` renomeado manualmente) foram removidos e recriados via `ddae-engine block create`/`prompt create`/`feedback create` já com o Bloco 04 presente na branch base, resultando corretamente em `bloco_05_regras_de_dominio_e_servicos_financeiros` sem intervenção manual. O conteúdo técnico original foi reaplicado aos templates oficiais sem inventar nova execução. Além disso, `packages/domain` passou a ter build real (`tsc` gerando `dist/` em CommonJS/ESM conforme configurado) para que `@finanhouse/domain` não dependa de arquivos `.ts` em runtime — ver seções 7, 9 e 15 para os comandos e evidências desta etapa.

## 2. Objetivo do Bloco

Implementar e testar as principais regras financeiras do Finanhouse sem utilizar banco de dados, migrations, Drizzle em runtime ou infraestrutura externa.

## 3. Escopo Implementado

- `packages/domain/src/` reestruturado em subpastas: `money/`, `category/`, `household-member/` (tipo novo), `financial-entry/`, `monthly-period/`, `summaries/`, `errors/`.
- Módulo `money`: centavos como `bigint`, `parseMoney`/`formatMoney`, aritmética, validação de positividade.
- `financial-entry-rules.ts`: criação, edição, 7 transições de status nomeadas (pending, realized, cancelled, estorno, correção, reativação), validações de household/categoria/membro/valores/datas, invariantes de realização.
- `monthly-period-rules.ts`: abertura, início de revisão, retorno de revisão, fechamento (validando movimentações), reabertura explícita.
- `summaries/monthly-summary.ts`: cálculo de previsto/realizado/pendente/planejado/saldos por competência.
- `summaries/compare-periods.ts`: comparação entre dois meses (receita/despesa/saldo realizado, categorias que mais variaram, categorias novas/encerradas, previsto vs. realizado do mês atual).
- `errors/domain-errors.ts`: 16 subclasses tipadas de `DomainError`.
- `apps/api/src/application/ports/`: 4 interfaces de repositório.
- `apps/api/src/infrastructure/repositories/memory/`: 4 implementações em memória, determinísticas, resetáveis.
- `apps/api/src/application/services/`: 14 serviços de aplicação (8 de movimentação, 4 de competência, 2 de resumo/comparação — cobrindo todos os 12 nomes pedidos e mais 2 operações de domínio adicionais).
- `@finanhouse/domain` conectado como dependência real de `apps/api` (antes só existia como workspace sem consumidor).
- Documentação: `Docs/02_architecture/regras_dominio_financeiro.md` (vocabulário, transições, cálculos, estratégia monetária, fronteira domínio/persistência); `Docs/01_product/requisitos_funcionais.md` atualizado; READMEs de `packages/domain`, `apps/api/src/application/`, `apps/api/src/infrastructure/`.
- 134 testes automatizados cobrindo tudo acima (ver seção 8).
- **Reconciliação estrutural**: `packages/domain` passou a ter build real (`tsc -p tsconfig.build.json` → `dist/` em ESM com `.d.ts`), com `main`/`types`/`exports` apontando para `dist/`, para que `apps/api` compilado nunca dependa de `.ts` do domínio em runtime. Ordem de build do monorepo explicitada (`domain` antes de `api`/`web`, via `npm run build:domain` + hooks `pretest`/`pretypecheck`/`predev:api`). Script `scripts/verify-runtime-imports.mjs` (`npm run verify:runtime`) valida em runtime, via `import` padrão do Node, que `@finanhouse/domain` e um serviço compilado de `apps/api` funcionam sem tocar em `.ts`, sem banco, sem `.env.local` e sem `mysql2`/`drizzle-orm` no grafo de imports.

## 4. Arquivos Criados

- `packages/domain/src/money/{money,money.test}.ts`
- `packages/domain/src/household-member/household-member.ts`
- `packages/domain/src/errors/domain-errors.ts`
- `packages/domain/src/financial-entry/{financial-entry-rules,financial-entry-rules.test}.ts`
- `packages/domain/src/monthly-period/{monthly-period-rules,monthly-period-rules.test}.ts`
- `packages/domain/src/summaries/{monthly-summary,monthly-summary.test,compare-periods,summaries.test}.ts`
- `apps/api/src/application/ports/{category-repository,financial-entry-repository,household-member-repository,monthly-period-repository,index}.ts`
- `apps/api/src/application/services/{financial-entry-services,financial-entry-services.test,monthly-period-services,monthly-period-services.test,summary-services,summary-services.test,index}.ts`
- `apps/api/src/infrastructure/repositories/memory/{in-memory-category-repository,in-memory-financial-entry-repository,in-memory-household-member-repository,in-memory-monthly-period-repository,index}.ts`
- `apps/api/src/application/README.md`, `apps/api/src/infrastructure/README.md`
- `Docs/02_architecture/regras_dominio_financeiro.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/{05_blocks,06_prompts,08_feedbacks}/*bloco_05*`
- `packages/domain/tsconfig.build.json` — tsconfig dedicado ao build de produção (emite `dist/`, exclui `*.test.ts`)
- `scripts/clean-build-artifacts.mjs` — remove `packages/domain/dist`, `apps/api/dist`, `apps/web/dist`
- `scripts/verify-runtime-imports.mjs` — verificação de runtime (ver seção 3)

## 5. Arquivos Alterados

- `packages/domain/src/index.ts` — exporta todos os novos módulos
- `packages/domain/src/{category/category,financial-entry/financial-entry,monthly-period/monthly-period}.ts` — movidos para subpastas (Bloco 03); `financial-entry.ts` passou a usar `Money` (bigint) em vez de `string` para valores
- `packages/domain/package.json` — `main`/`types`/`exports` apontando para `dist/` (antes apontava direto para `src/index.ts`); script `build`; dependências `vitest`/`oxlint`, scripts `lint`/`test`
- `packages/domain/tsconfig.json` — removido `allowImportingTsExtensions` (não mais necessário após padronizar extensões `.js`)
- `packages/domain/README.md` — reescrito para refletir a nova estrutura
- `apps/api/package.json` — dependência `@finanhouse/domain`
- `Docs/01_product/requisitos_funcionais.md` — requisitos RF-01 a RF-06 preenchidos
- `package.json` (raiz) — scripts `clean`, `build:domain`, `verify:runtime`; `build` reordenado para compilar `domain` antes de `api`/`web`; hooks `pretest`/`pretypecheck`/`predev:api` garantindo que `packages/domain` seja reconstruído antes de testes/typecheck/dev de `apps/api`

## 6. Arquivos Removidos

_Nenhum arquivo removido — apenas movidos (ver seção 5)._

## 7. Comandos Executados

```
git status / git branch --show-current / git log -1 --oneline   (confirmar Bloco 04 intacto)
git switch main && git pull --ff-only origin main
git switch -c feat/session-11-bloco-05-domain-services
npx ddae-engine block create "Regras de domínio e serviços financeiros" --session session_11_fundacao_do_finanhouse
  (CLI gerou "bloco_04" por a branch não ter o Bloco 04 mesclado — renomeado manualmente para bloco_05 antes de continuar)
npx ddae-engine prompt create --block bloco_05_regras_de_dominio_e_servicos_financeiros --session session_11_fundacao_do_finanhouse
npm install   (linkar @finanhouse/domain em apps/api, vitest/oxlint em packages/domain)
npx tsc -p packages/domain/tsconfig.json   (repetido a cada módulo novo)
npx tsc --noEmit -p apps/api/tsconfig.json   (repetido a cada módulo novo)
cd packages/domain && npx vitest run   (repetido a cada módulo novo)
cd apps/api && npx vitest run   (repetido a cada módulo novo)
npx oxlint packages/domain apps/api
npx tsc -p apps/api/tsconfig.json   (build real, confirmar que packages/domain/src não é poluído com .js)
npx ddae-engine feedback create --block bloco_05_regras_de_dominio_e_servicos_financeiros --session session_11_fundacao_do_finanhouse

# Reconciliação estrutural (mesma data, pós-revisão)
git switch main && git pull --ff-only origin main
git merge --no-ff feat/session-11-bloco-04-validacao-tls -m "merge: integrar diagnóstico TLS pré-migration"   (cad88c8, sem conflitos)
npm install && npm run build && npm run lint && npm run typecheck && npm run test
npx drizzle-kit check && npx ddae-engine validate && npx ddae-engine audit
git push origin main
git switch feat/session-11-bloco-05-domain-services && git merge main   (4ed79d7, conflito único em README.md, resolvido preservando os dois blocos)
rm 05_blocks/bloco_05_*.md 06_prompts/prompt_bloco_05_*.md 08_feedbacks/feedback_bloco_05_*.md   (backup fora do repo antes de remover)
npx ddae-engine block create "Regras de domínio e serviços financeiros" --session session_11_fundacao_do_finanhouse
  (agora com o Bloco 04 presente na base, gerou corretamente "bloco_05" sem intervenção manual)
npx ddae-engine prompt create --block bloco_05_regras_de_dominio_e_servicos_financeiros --session session_11_fundacao_do_finanhouse
npx ddae-engine feedback create --block bloco_05_regras_de_dominio_e_servicos_financeiros --session session_11_fundacao_do_finanhouse
  (conteúdo técnico original reaplicado aos templates oficiais; P2 duplicada de persistência consolidada como nota, não pendência nova)
npm run clean && npm run build && npm run verify:runtime
npm ci && npm run build && npm run verify:runtime && npm run test
npm run lint && npm run typecheck
npx tsc -p database/inspection/tsconfig.json && npx oxlint database/inspection
npx drizzle-kit check && npx ddae-engine validate && npx ddae-engine audit
npm audit --omit=dev && npm audit
```

## 8. Testes Realizados

Todos automatizados, 134 no total:

- `packages/domain` (99 testes): `money.test.ts` (21 — parse/format, exemplos válidos/inválidos exatos do bloco, aritmética, round-trip); `financial-entry-rules.test.ts` (40 — criação, edição, todas as 7 transições permitidas, 6 transições proibidas, realização sem valor/data, competência fechada/em revisão, validação de datas de calendário, invariantes); `monthly-period-rules.test.ts` (16 — todas as transições permitidas/proibidas, validação de `reference_month`, fechamento com movimentações válidas/inválidas/de outra competência); `monthly-summary.test.ts` (10 — todos os indicadores, cancelado não compõe saldo); `summaries.test.ts` (12 — percentual com divisão por zero retornando `null`, ausência de `NaN`/`Infinity`, categorias que mais variaram, novas/encerradas).
- `apps/api` (34 testes, incluindo os 25 pré-existentes dos Blocos 01/03): `financial-entry-services.test.ts` (4 — fluxo completo create→pending→realize persistindo via repositório em memória, cancelar/reativar, propagação de `ClosedPeriodError`/`InvalidStatusTransitionError`); `monthly-period-services.test.ts` (3 — fluxo completo open→review→close→reopen, rejeição de fechamento direto, fechamento carregando movimentações reais do repositório); `summary-services.test.ts` (2 — cálculo de resumo e comparação usando dados persistidos nos repositórios em memória).
- Manual: build real (`tsc -p apps/api/tsconfig.json`, com emissão) confirmado sem poluir `packages/domain/src` com `.js` compilado.
- Reconciliação: `npm run verify:runtime` (script novo, `scripts/verify-runtime-imports.mjs`) — importa `@finanhouse/domain` e um serviço compilado de `apps/api` via mecanismo padrão do Node (sem `ts-node`/`tsx`), confirma a presença de `parseMoney`/`calculateMonthlySummary`/`compareMonthlyPeriods` e de `CalculateMonthlySummaryService`/`CompareMonthlyPeriodsService`, varre o grafo de imports compilados em busca de `mysql2`/`drizzle-orm`, e sai com código diferente de zero se qualquer verificação falhar (testado manualmente removendo `dist/` antes de rodar, confirmando falha com exit code 1).

## 9. Validações Executadas

- `npx tsc -p packages/domain/tsconfig.json` — OK
- `npx tsc --noEmit -p apps/api/tsconfig.json` — OK (inclui a checagem transitiva dos arquivos de `packages/domain` consumidos via `@finanhouse/domain`)
- `npx oxlint packages/domain apps/api` — OK
- `npm run test` (todos os workspaces) — 134/134 testes passando
- `ddae-engine validate` / `ddae-engine audit` — resultados no relatório final apresentado ao usuário
- Busca estática confirmando ausência de `mysql2`/`drizzle-orm`/`.env` nos novos arquivos — ver seção 15 (Evidências)
- **Reconciliação estrutural** — `npm run clean && npm run build && npm run verify:runtime` (build limpo do zero) — OK; `npm ci && npm run build && npm run verify:runtime && npm run test` (instalação limpa) — OK, 134/134; `npm run lint`/`npm run typecheck` (pós-reconciliação, com hooks `pretest`/`pretypecheck` reconstruindo `packages/domain` automaticamente) — OK; `npx tsc -p database/inspection/tsconfig.json` / `npx oxlint database/inspection` — OK; `npx drizzle-kit check` — "Everything's fine" (checagem estática dos snapshots de migration, sem conexão ao banco); `ddae-engine audit` — 9 warnings (7 gates + P2 Bloco 03 + P2 Bloco 04, conforme esperado após a consolidação, sem P2 no Bloco 05); `npm audit --omit=dev` — 0 vulnerabilidades; `npm audit` — 4 moderadas, todas na cadeia de desenvolvimento do `drizzle-kit` (esbuild via `@esbuild-kit`), zero em produção, já documentadas como P3 desde o Bloco 03 — `npm audit fix --force` **não** foi executado.

## 10. Decisões Técnicas

- ~~Numeração do bloco corrigida manualmente (`bloco_04` → `bloco_05`)~~ — como a branch partiu de `main` sem o Bloco 04 (TLS) mesclado, o CLI do DDAE numerou este bloco como "04" na execução original, colidindo com o bloco real de TLS que existia em outra branch ainda não integrada. **Regularizado na reconciliação estrutural**: após integrar o Bloco 04 à `main` e atualizar esta branch, os três arquivos foram recriados oficialmente via CLI (`block create`/`prompt create`/`feedback create`), que já gerou `bloco_05` corretamente sem necessidade de renomeação manual.
- **`FinancialEntry.expectedAmount`/`actualAmount` mudaram de `string` para `Money` (`bigint`)** — o tipo de domínio (Bloco 03) usava `string` (espelhando o `DECIMAL` do Drizzle). Para a camada de regras poder somar/comparar dinheiro com segurança, o tipo de domínio passou a usar `Money`; a conversão para `string` fica isolada na futura camada de repositório real (`parseMoney`/`formatMoney`), não no tipo de domínio.
- **Extensões de import de `packages/domain` padronizadas para `.js`** — inicialmente usei `.ts` (permitido pelo próprio `tsconfig.json` do pacote, com `allowImportingTsExtensions`), mas isso quebrava a checagem de tipos quando `apps/api` importava `@finanhouse/domain` e o TypeScript re-verificava esses arquivos sob as regras do `tsconfig.json` de `apps/api` (que não tem essa flag, pois emite código real). Padronizar para `.js` (convenção NodeNext, resolvendo para o `.ts` fonte) eliminou o conflito e tornou o pacote consumível de qualquer contexto.
- **`@finanhouse/domain` com `exports: { ".": "./src/index.ts" }`** — necessário para resolução `NodeNext` de um pacote workspace cujo "build" é o próprio TypeScript fonte (sem etapa de compilação separada).
- **Cada transição de status é uma função nomeada, não uma função genérica de transição** — decisão já estava no prompt do bloco; implementada estritamente (nenhuma função aceita "de qualquer estado para qualquer estado").
- **`responsibleMemberId` sem validação de estoque/orçamento** — fora de escopo deste bloco (não pedido).
- **Repositórios de leitura (`CategoryRepository`, `HouseholdMemberRepository`) sem método `save`** — essas entidades não são criadas/alteradas pelas regras implementadas neste bloco (são geridas por outro bloco futuro); os repositórios em memória expõem um `seed()` não-interface para popular dados de teste.
- **`@finanhouse/domain` com build real para `dist/` (tsconfig dedicado + `main`/`types`/`exports` apontando para `dist/`)** — a versão original deste bloco usava `exports: { ".": "./src/index.ts" }`, que funciona para o TypeScript (typecheck) mas nunca foi comprovado em runtime puro do Node: o `apps/api` compilado (`dist/`) continuaria, na prática, importando `.ts` do domínio via resolução de pacote — o que não existe em produção sem `ts-node`/`tsx`. Corrigido com `tsconfig.build.json` (emite JS + `.d.ts`, exclui testes) e `package.json` do domínio apontando para `dist/`. Efeito colateral aceito e desejado: `apps/api` agora precisa que `packages/domain` esteja compilado antes de typecheck/test/dev — coberto por hooks `pretest`/`pretypecheck`/`predev:api` na raiz, para que isso nunca dependa de um `dist` esquecido/desatualizado.

## 11. Problemas Encontrados

- Conflito de numeração de bloco (ver Decisões Técnicas) — identificado durante a execução original, contornado manualmente para não bloquear o trabalho, e depois regularizado via CLI oficial na reconciliação estrutural.
- Erro de tipos em cadeia ao consumir `@finanhouse/domain` de `apps/api` (ver Decisões Técnicas, extensões `.js`) — identificado ao rodar o typecheck de `apps/api` pela primeira vez após adicionar a dependência real.
- Dois testes de `compare-periods` usavam `parseMoney('-200.00')` para expressar um valor negativo esperado — `parseMoney` rejeita sinal por design (dinheiro de domínio é sempre não negativo). Corrigido para `-parseMoney('200.00')` (negação de um valor válido).

## 12. Correções Aplicadas Durante o Bloco

- Renomeação manual do bloco de `bloco_04` para `bloco_05` (arquivo e referências internas), na execução original — posteriormente substituída pela criação oficial via CLI na reconciliação estrutural (ver Resumo Executivo e Decisões Técnicas).
- Padronização de extensões de import de `.ts` para `.js` em todo `packages/domain/src` e nos novos arquivos de `apps/api/src/application`, `apps/api/src/infrastructure`.
- Remoção de `allowImportingTsExtensions` do `tsconfig.json` de `packages/domain` (não mais necessário).
- Correção dos dois testes com `parseMoney` de valor negativo.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._ A implementação de `Drizzle*Repository` para cada porta (mapeando `Money` ↔ `string`/DECIMAL via `parseMoney`/`formatMoney`) depende da persistência real, que é **dependência externa já controlada pelo Bloco 04** (`feedback_bloco_04_validacao_tls_e_revisao_pre_migration.md`, pendência P2 de TLS estrito — bloqueia tanto a aplicação da migration quanto qualquer repositório real). Este bloco não duplica essa pendência.

### P3 — Melhoria Recomendada

- `CreateFinancialEntryService`/`UpdateFinancialEntryService` fazem uma consulta por entidade relacionada (período, categoria, membro) — aceitável para repositórios em memória; ao trocar por Drizzle, avaliar se vale a pena um `findMany` em lote.
- Regras de fechamento de competência podem precisar de refinamento (ex.: exigir que todas as `pending` sejam resolvidas antes de fechar) quando casos de uso reais forem definidos com o proprietário.
- Extensões futuras do domínio (`recurrence_rules`, `installment_plans`, `category_budgets`, `period_status_history`) continuam não modeladas — ver `database/proposed-schema/extensoes-futuras.md`.

### P4 — Opcional

_Nenhuma pendência opcional identificada._

## 14. Riscos Restantes

- O domínio foi validado apenas com repositórios em memória; comportamento sob concorrência real (dois usuários editando a mesma movimentação) não foi exercitado e só será relevante quando a persistência real existir.
- Definições de cálculo (previsto/realizado/projetado) e de transições de status são decisões de produto tanto quanto técnicas — se o proprietário tiver uma expectativa diferente ao ver os números na futura interface visual, os cálculos documentados em `Docs/02_architecture/regras_dominio_financeiro.md` precisarão ser revisados (não é esperado retrabalho grande, mas é possível).

## 15. Evidências

```
$ npm run test (resumo)
packages/domain: Test Files 5 passed (5) · Tests 99 passed (99)
apps/api: Test Files 6 passed (6) · Tests 34 passed (34)
apps/web: Test Files 1 passed (1) · Tests 1 passed (1)
Total: 134/134

$ grep -rE "mysql2|drizzle-orm" packages/domain/src apps/api/src/application apps/api/src/infrastructure
(nenhum resultado)

$ grep -rE "\.env" packages/domain/src apps/api/src/application apps/api/src/infrastructure
(nenhum resultado)

$ npx tsc -p apps/api/tsconfig.json  (build real)
(sem erros; apps/api/dist/ gerado; packages/domain/src sem .js compilado)

$ npm run clean && npm run build && npm run verify:runtime  (reconciliação — build limpo)
[verify:runtime] OK — parseMoney, calculateMonthlySummary, compareMonthlyPeriods presentes.
[verify:runtime] OK — CalculateMonthlySummaryService, CompareMonthlyPeriodsService presentes.
[verify:runtime] SUCESSO — @finanhouse/domain e o serviço de aplicação compilado funcionam via import padrão do Node, sem depender de arquivos .ts em runtime.

$ npm run clean && node scripts/verify-runtime-imports.mjs  (teste negativo, sem build)
[verify:runtime] FALHA: arquivo compilado não encontrado: packages\domain\dist\index.js — rode "npm run build" antes de "npm run verify:runtime".
EXIT CODE: 1

$ npm ci && npm run build && npm run verify:runtime && npm run test  (instalação limpa)
134/134 testes passando; verify:runtime OK

$ npx drizzle-kit check
Everything's fine 🐶🔥

$ npm audit --omit=dev
found 0 vulnerabilities

$ npm audit
4 moderate severity vulnerabilities (cadeia de desenvolvimento do drizzle-kit/esbuild — já P3 desde o Bloco 03; npm audit fix --force não executado)
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Estrutura visual do dashboard consumindo dados simulados (repositórios em memória já implementados servem de base), enquanto a persistência real continua bloqueada aguardando a resposta da Clever Cloud sobre TLS (Bloco 04).

## 18. Commit Semântico Sugerido

```
feat(domain): implementar regras e serviços financeiros
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
