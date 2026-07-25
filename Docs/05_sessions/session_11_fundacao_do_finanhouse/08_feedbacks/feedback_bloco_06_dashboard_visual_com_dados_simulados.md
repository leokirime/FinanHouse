# Feedback — Bloco 06: Dashboard visual com dados simulados

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Resumo Executivo

Construída a primeira interface visual navegável do Finanhouse: um dashboard de "Visão geral" com identidade preta/roxa, consumindo dados **inteiramente sintéticos** processados pelas funções reais de `@finanhouse/domain` (`calculateMonthlySummary`, `compareMonthlyPeriods`). O app shell tem sidebar (apenas "Visão geral" funcional, demais itens marcados como indisponíveis) e cabeçalho com a competência/status atuais. O dashboard mostra status da competência, 4 indicadores principais, evolução financeira (SVG puro), distribuição de despesas por categoria, movimentações recentes e pendências próximas — todos derivados da mesma coleção de fixtures através de uma única camada de view-model. `apps/web` passou a depender de `@finanhouse/domain` (workspace compilado) como dependência real de produção. 31 novos testes automatizados (165 no total do monorepo), todos passando. Nenhuma conexão com o banco, nenhum dado real, nenhuma persistência, nenhuma autenticação — consistente com o escopo do bloco.

## 2. Objetivo do Bloco

Construir a primeira interface visual navegável do Finanhouse, utilizando dados sintéticos e cálculos derivados do pacote de domínio, sem banco de dados, API real ou persistência.

## 3. Escopo Implementado

- Design tokens (`apps/web/src/styles/{tokens,global,utilities}.css`) — identidade preta/roxa, espaçamento, raios, sombras, tipografia.
- `Brand.tsx` em modo tipográfico (sem logo oficial ainda — ver Pendências), preparado para receber `logoSrc` no futuro.
- App shell: `AppShell`, `Sidebar` (nav com apenas "Visão geral" funcional, `aria-current="page"`; demais com `aria-disabled`), `DashboardHeader` (competência, status, CTA visual "Nova movimentação", perfil doméstico visual).
- Dashboard: `PeriodOverview` (status open/review/closed + CTA visual "Revisar mês"), `SummaryCard` × 4 (receitas realizadas, despesas realizadas, saldo realizado, fechamento projetado), `FinancialEvolutionChart` (SVG puro, 7 competências, com resumo textual acessível), `CategoryBreakdown` (barras de participação por categoria), `RecentEntries` (tabela → lista empilhada em mobile), `UpcomingEntries` (pendências com vencimento).
- Fixtures sintéticas centralizadas (`data/dashboard-fixtures.ts`): 7 categorias, 7 competências mensais (jan–jul/2026, a atual em revisão), ~40 movimentações cobrindo todos os status (`planned`/`pending`/`realized`/`cancelled`).
- View-model único (`view-models/dashboard-view-model.ts`, `buildDashboardViewModel()`) — única camada que lê as fixtures e chama `@finanhouse/domain`; todos os componentes só recebem props já prontas.
- `utils/format-money-pt-br.ts` — reaproveita `formatMoney` do domínio, nunca converte para `number`.
- `@finanhouse/domain` adicionado como dependência real de `apps/web`; `predev:web` (raiz) reconstrói o domain antes do Vite.
- Responsividade (grid de indicadores 4→2→1 colunas; sidebar vira barra horizontal <1024px; tabela vira lista <640px) e acessibilidade básica (landmarks, `aria-current`, foco visível, `prefers-reduced-motion`, alternativa textual do gráfico).
- 31 testes automatizados novos (Vitest + Testing Library).
- Documentação: `Docs/02_architecture/arquitetura_visual_dashboard.md`, `Docs/07_design_system/*` (identidade visual, tokens, componentes, responsividade, acessibilidade — preenchidos pela primeira vez), `apps/web/README.md` atualizado.

## 4. Arquivos Criados

- `apps/web/src/styles/{tokens,global,utilities}.css`
- `apps/web/src/utils/{format-money-pt-br,format-money-pt-br.test}.ts`
- `apps/web/src/data/dashboard-fixtures.ts`
- `apps/web/src/view-models/{dashboard-view-model,dashboard-view-model.test}.ts`
- `apps/web/src/components/brand/{Brand.tsx,Brand.css,Brand.test.tsx}`
- `apps/web/src/components/layout/{AppShell,Sidebar,DashboardHeader}.{tsx,css}`, `Sidebar.test.tsx`
- `apps/web/src/components/dashboard/{PeriodOverview,SummaryCard,FinancialEvolutionChart,CategoryBreakdown,RecentEntries,UpcomingEntries}.{tsx,css}`, `RecentEntries.test.tsx`, `UpcomingEntries.test.tsx`
- `apps/web/src/pages/{DashboardPage.tsx,DashboardPage.css}`
- `apps/web/src/test-setup.ts`
- `Docs/02_architecture/arquitetura_visual_dashboard.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/{05_blocks,06_prompts,08_feedbacks}/*bloco_06*`

## 5. Arquivos Alterados

- `apps/web/src/App.tsx` — reescrito para montar `AppShell` + `DashboardHeader` + `DashboardPage` (antes: placeholder "Finanhouse"/slogan)
- `apps/web/src/App.test.tsx` — reescrito como teste de integração do dashboard
- `apps/web/src/main.tsx` — importa `styles/global.css` e `styles/utilities.css` no lugar de `index.css`
- `apps/web/package.json` — dependência `@finanhouse/domain`
- `apps/web/vitest.config.ts` — `setupFiles: ['./src/test-setup.ts']` (cleanup automático entre testes — ver Problemas Encontrados)
- `apps/web/README.md` — estrutura e status atualizados
- `package.json` (raiz) — script `predev:web` (reconstrói o domain antes do Vite dev)
- `Docs/07_design_system/{identidade_visual,tokens_design,componentes_ui,responsividade,acessibilidade}.md` — preenchidos pela primeira vez
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/README.md` — entrada do Bloco 06 e atualização do status do Bloco 05 (mesclado à `main`)

## 6. Arquivos Removidos

- `apps/web/src/App.css`, `apps/web/src/index.css` — estilos do template padrão do Vite, substituídos por `styles/global.css`/`styles/utilities.css`.

## 7. Comandos Executados

```
git status / git branch --show-current / git log -1 --oneline / git fetch origin / git check-ignore -v apps/api/.env.local
git pull --ff-only origin main
git switch -c feat/session-11-bloco-06-dashboard-visual
npx ddae-engine block create "Dashboard visual com dados simulados" --session session_11_fundacao_do_finanhouse
npx ddae-engine prompt create --block bloco_06_dashboard_visual_com_dados_simulados --session session_11_fundacao_do_finanhouse
npm install   (linkar @finanhouse/domain em apps/web)
npx tsc -b   (apps/web, repetido a cada módulo novo)
npx vitest run   (apps/web, repetido a cada módulo novo)
npx vite build   (build de produção real)
npx vite preview --port 4173 && curl http://localhost:4173/   (confirmar HTML/CSS servidos sem erro — ver seção 15)
npx ddae-engine feedback create --block bloco_06_dashboard_visual_com_dados_simulados --session session_11_fundacao_do_finanhouse
npm run clean && npm run build && npm run verify:runtime
npm ci && npm run build && npm run verify:runtime && npm run test
npm run lint && npm run typecheck
npx drizzle-kit check (em apps/api) && npx ddae-engine validate && npx ddae-engine audit
npm audit --omit=dev && npm audit
```

## 8. Testes Realizados

31 testes novos, todos automatizados (Vitest + Testing Library), somados aos 134 já existentes = **165 no total**:

- `utils/format-money-pt-br.test.ts` (6): zero, centavos, milhares com separador pt-BR, negativos de apresentação, valores grandes sem perda de precisão, ausência de `NaN`/`Infinity`.
- `view-models/dashboard-view-model.test.ts` (9): status da competência atual, 4 indicadores presentes, valores derivados corretamente das fixtures (receita/despesa realizadas de julho conferidas manualmente), ausência de `NaN`/`Infinity`, 1 ponto de evolução por competência (7), distribuição por categoria soma ~100% e exclui a movimentação cancelada, pendências ordenadas e com sinal correto (despesa negativa, receita positiva), movimentações recentes com status.
- `components/brand/Brand.test.tsx` (3): modo tipográfico sem logo, renderização de `<img>` quando `logoSrc` é fornecido, forma compacta "FH".
- `components/layout/Sidebar.test.tsx` (3): "Visão geral" com `aria-current="page"`, demais itens com `aria-disabled="true"` e sem `aria-current`, indicador de dados simulados.
- `components/dashboard/RecentEntries.test.tsx` (2): renderização de descrição/categoria/status, ausência de `NaN`/`Infinity`.
- `components/dashboard/UpcomingEntries.test.tsx` (2): lista de pendências com vencimento, mensagem de estado vazio.
- `App.test.tsx` (7, reescrito): navegação ativa, 4 indicadores, status da competência (aparece de forma consistente em 2 lugares), indicador de dados simulados, listas de recentes/pendências, marca em modo tipográfico, ausência de `NaN`/`Infinity` em toda a árvore renderizada.

Manual (não automatizado): `vite build` + `vite preview` servidos via HTTP (200 no HTML e no CSS gerado) — ver seção 15. **Inspeção visual em navegador real não foi realizada neste ambiente** (sem ferramenta de captura de tela disponível) — fica para o checkpoint visual anunciado pelo proprietário antes do merge.

## 9. Validações Executadas

- `npm run clean && npm run build` — OK (ordem `domain → api → web` respeitada).
- `npm run verify:runtime` — OK, incluindo teste negativo (sem `dist/`, sai com código 1).
- `npm ci && npm run build && npm run verify:runtime && npm run test` — OK, 165/165 testes passando.
- `npm run lint` — OK, 0 avisos (api, web, domain).
- `npm run typecheck` — OK, 0 erros (com `pretypecheck` reconstruindo o domain).
- `npx drizzle-kit check` (em `apps/api`) — "Everything's fine" (checagem estática dos snapshots, sem conexão ao banco).
- `ddae-engine validate` — OK, 0 erros/avisos.
- `ddae-engine audit` — OK, 9 warnings (7 gates pendentes + P2 Bloco 03 + P2 Bloco 04), 0 erros — **nenhuma P2 nova no Bloco 06**.
- `npm audit --omit=dev` — 0 vulnerabilidades.
- `npm audit` — 4 moderadas, cadeia de desenvolvimento do `drizzle-kit`/`esbuild`, já documentadas como P3 desde o Bloco 03; `npm audit fix --force` **não** executado.
- Busca estática (`grep`) confirmando ausência de `mysql2`, `drizzle-orm` e `.env` em `apps/web/src` — ver seção 15.

## 10. Decisões Técnicas

- **Cleanup automático de testes adicionado (`test-setup.ts` + `vitest.config.ts`)** — ver Problemas Encontrados; sem isso, múltiplos `render()` no mesmo arquivo de teste se acumulavam no DOM.
- **`formatMoneyPtBr` reaproveita `formatMoney` do domínio** em vez de reimplementar divisão/resto em `bigint` — evita duplicar a lógica monetária no frontend (só reformata a string decimal já seguramente derivada do `bigint` para o padrão pt-BR).
- **Nenhuma biblioteca de gráficos instalada** — `FinancialEvolutionChart` é SVG puro construído a partir dos pontos de evolução, com um parágrafo `.fh-visually-hidden` como alternativa textual completa para leitores de tela (o `<svg>` é marcado `aria-hidden="true"`).
- **Sem `jest-dom`/matchers adicionais** — os testes usam `getAttribute`/`hasAttribute` nativos em vez de `toHaveAttribute`, para não introduzir uma dependência de teste nova além do que já existia.
- **Sem roteador instalado** — apenas "Visão geral" é funcional; os demais itens da sidebar são `<button aria-disabled>` sem `href`, nunca links para páginas inexistentes.
- **Sidebar não usa JS para "recolher"** — em telas <1024px ela vira uma barra horizontal via CSS puro (media query), evitando estado de UI adicional neste bloco.
- **Todos os textos de datas usam `timeZone: 'UTC'` explícito** — ver Problemas Encontrados (bug de fuso horário).
- **Logo oficial ausente**: `Brand.tsx` aceita `logoSrc` opcional e cai para o texto "Finanhouse" — nenhum ícone substituto foi inventado.

## 11. Problemas Encontrados

- **Bug de fuso horário na formatação de datas**: `Intl.DateTimeFormat('pt-BR', { month: 'long', ... })` sem `timeZone: 'UTC'` formatava `2026-07-01` (meia-noite UTC) como "junho de 2026" em vez de "julho de 2026", porque o formatador usa o fuso horário local do ambiente de execução por padrão (que pode estar atrás de UTC). Identificado pelo teste `dashboard-view-model.test.ts` ("descreve a competência atual como em revisão"), que falhou logo na primeira execução.
- **DOM não limpo entre testes no mesmo arquivo**: `vitest.config.ts` não tinha `setupFiles`, então o autocleanup do Testing Library (que depende de um `afterEach` global) nunca era registrado. Isso causava `getByText`/`getByRole` falhando com "multiple elements found" em arquivos com mais de um teste que chama `render()`. Só apareceu neste bloco porque os testes de `apps/web` anteriores (Bloco 01) tinham só 1 teste por arquivo.
- **Teste `App.test.tsx` assumindo que toda pendência é despesa**: a movimentação de freelance pendente (receita) também aparece em "Pendências próximas" (tem `dueDate`) — a asserção inicial esperava sinal negativo em todas as pendências, o que é incorreto para receitas. Corrigido para verificar o sinal por tipo (`entryType`), não por posição na lista.

## 12. Correções Aplicadas Durante o Bloco

- Adição de `timeZone: 'UTC'` aos três formatadores de data do view-model.
- Criação de `apps/web/src/test-setup.ts` (chama `cleanup()` do Testing Library em `afterEach`) e registro em `vitest.config.ts` (`setupFiles`).
- Reescrita das asserções de `toHaveAttribute`/`not.toHaveAttribute` (que exigiriam `jest-dom`) para `getAttribute`/`hasAttribute` nativos.
- Correção da asserção de sinal em `App.test.tsx` para considerar o tipo da movimentação (receita vs. despesa), não a posição na lista.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._ A persistência real (repositórios Drizzle) e a resolução de TLS continuam **dependência externa já controlada pelo Bloco 04** — ver `feedback_bloco_04_validacao_tls_e_revisao_pre_migration.md`. Este bloco não duplica essa pendência.

### P3 — Melhoria Recomendada

- Logo oficial do Finanhouse ainda não está em `assets/brand/` — `Brand.tsx` usa modo tipográfico temporário (ver `Docs/07_design_system/identidade_visual.md`, seção 8).
- Contraste de cores não foi medido numericamente (só verificado visualmente) — ver `Docs/07_design_system/acessibilidade.md`.
- Fluxos do dashboard não foram testados com leitor de tela real (NVDA/VoiceOver) — só com a estrutura semântica/ARIA esperada.
- Inspeção visual em navegador real (1440/1024/768/390px) não foi realizada neste ambiente (sem ferramenta de captura de tela) — fica para o checkpoint visual do proprietário antes do merge.
- Quando a persistência real for liberada, `dashboard-fixtures.ts` deve ser substituído por dados reais no mesmo formato de entrada esperado por `buildDashboardViewModel()` (`Category[]`/`MonthlyPeriod[]`/`FinancialEntry[]`) — view-model e componentes não devem precisar mudar.

### P4 — Opcional

- Páginas "Movimentações", "Comparativo", "Planejamento", "Histórico", "Configurações" continuam apenas como itens de navegação não funcionais.

## 14. Riscos Restantes

- Definições visuais (paleta, espaçamento, tom) são decisões de produto tanto quanto técnicas — o checkpoint visual anunciado pelo proprietário antes do merge é o momento correto para revisar hierarquia, identidade roxa/preta, responsividade e consistência dos números.
- O gráfico de evolução em SVG puro tem menos recursos (zoom, tooltip interativo) que uma biblioteca dedicada — aceitável nesta fase de protótipo.

## 15. Evidências

```
$ npm run test (resumo pós npm ci)
api: Test Files 6 passed (6) · Tests 34 passed (34)
web: Test Files 7 passed (7) · Tests 32 passed (32)
domain: Test Files 5 passed (5) · Tests 99 passed (99)
Total: 165/165

$ grep -rE "mysql2|drizzle-orm" apps/web/src
(nenhum resultado)

$ grep -rE "\.env" apps/web/src
(nenhum resultado)

$ npx vite build (apps/web)
dist/index.html, dist/assets/index-*.css, dist/assets/index-*.js gerados sem erros

$ npx vite preview --port 4173 && curl -s http://localhost:4173/
HTML servido corretamente (título "Finanhouse", script/CSS referenciados)
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/assets/index-*.css
200

$ npm run verify:runtime
[verify:runtime] SUCESSO — @finanhouse/domain e o serviço de aplicação compilado funcionam via import padrão do Node, sem depender de arquivos .ts em runtime.

$ npx drizzle-kit check (apps/api)
Everything's fine 🐶🔥

$ npx ddae-engine audit
Status: OK · Warnings: 9 (7 gates + P2 Bloco 03 + P2 Bloco 04) · Errors: 0

$ npm audit --omit=dev
found 0 vulnerabilities
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Checkpoint visual do proprietário (revisão de hierarquia, identidade roxa/preta, responsividade e consistência dos números em navegador real) antes de integrar este bloco à `main`. Em paralelo, o Bloco 04 (TLS) continua aguardando resposta da Clever Cloud antes de qualquer trabalho de persistência real.

## 18. Commit Semântico Sugerido

```
feat(web): construir dashboard visual com dados simulados
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
