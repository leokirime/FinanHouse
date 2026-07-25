# Feedback — Bloco 06: Dashboard visual com dados simulados

> Sessão: 11 (fundacao_do_finanhouse) · Projeto: FinanHouse · Atualizado em: 2026-07-25

## 1. Resumo Executivo

Construída a primeira interface visual navegável do Finanhouse: um dashboard de "Visão geral" com identidade preta/roxa, consumindo dados **inteiramente sintéticos** processados pelas funções reais de `@finanhouse/domain` (`calculateMonthlySummary`, `compareMonthlyPeriods`). O app shell tem sidebar (apenas "Visão geral" funcional, demais itens marcados como indisponíveis) e cabeçalho com a competência/status atuais. O dashboard mostra status da competência, 4 indicadores principais, evolução financeira (SVG puro), distribuição de despesas por categoria, movimentações recentes e pendências próximas — todos derivados da mesma coleção de fixtures através de uma única camada de view-model. `apps/web` passou a depender de `@finanhouse/domain` (workspace compilado) como dependência real de produção. 31 novos testes automatizados (165 no total do monorepo), todos passando. Nenhuma conexão com o banco, nenhum dado real, nenhuma persistência, nenhuma autenticação — consistente com o escopo do bloco.

**Correção pós-revisão (mesma branch, mesma data):** a logo oficial (`assets/images/finanhouse-logo-hero.png`) foi adicionada ao repositório (renomeada de `finanhouse-logo-hero.png.png` com autorização explícita do proprietário) e integrada ao hero via o novo componente `HeroBrand` (substitui `PeriodOverview`), com superfície clara dedicada para preservar a legibilidade do wordmark escuro. `apps/web/index.html` corrigido para `lang="pt-BR"`. Todos os controles "apenas visuais" (CTAs e itens de navegação futuros) passaram a usar o atributo HTML `disabled` nativo em vez de somente `aria-disabled`. 13 testes novos adicionados nesta correção (índice HTML, `HeroBrand`, `DashboardHeader`) — **178 testes no total do monorepo**. Nenhuma mudança na direção visual, nos cálculos financeiros ou no escopo de dados simulados.

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

**Correção pós-revisão:**

- `assets/images/finanhouse-logo-hero.png` — logo oficial (PNG 1536×1024, com transparência), integrada ao hero.
- `HeroBrand` (`apps/web/src/components/dashboard/HeroBrand.tsx`) substitui `PeriodOverview`: mesma responsabilidade (competência, status, CTA "Revisar mês"), agora com a logo oficial dentro de uma superfície clara dedicada (`--fh-brand-surface`).
- `apps/web/index.html` corrigido para `lang="pt-BR"` (estava `lang="en"`, herdado do template Vite).
- Todos os controles "apenas visuais" (CTA "Nova movimentação", CTA "Revisar mês", itens de navegação futuros da `Sidebar`) passaram a usar o atributo HTML `disabled` nativo, não apenas `aria-disabled`.

## 4. Arquivos Criados

- `apps/web/src/styles/{tokens,global,utilities}.css`
- `apps/web/src/utils/{format-money-pt-br,format-money-pt-br.test}.ts`
- `apps/web/src/data/dashboard-fixtures.ts`
- `apps/web/src/view-models/{dashboard-view-model,dashboard-view-model.test}.ts`
- `apps/web/src/components/brand/{Brand.tsx,Brand.css,Brand.test.tsx}`
- `apps/web/src/components/layout/{AppShell,Sidebar,DashboardHeader}.{tsx,css}`, `Sidebar.test.tsx`
- `apps/web/src/components/dashboard/{SummaryCard,FinancialEvolutionChart,CategoryBreakdown,RecentEntries,UpcomingEntries}.{tsx,css}`, `RecentEntries.test.tsx`, `UpcomingEntries.test.tsx`
- `apps/web/src/pages/{DashboardPage.tsx,DashboardPage.css}`
- `apps/web/src/test-setup.ts`
- `Docs/02_architecture/arquitetura_visual_dashboard.md`
- `Docs/05_sessions/session_11_fundacao_do_finanhouse/{05_blocks,06_prompts,08_feedbacks}/*bloco_06*`

**Correção pós-revisão:**

- `assets/images/finanhouse-logo-hero.png` (renomeado de `finanhouse-logo-hero.png.png`, mesmo conteúdo/bytes)
- `apps/web/src/components/dashboard/{HeroBrand.tsx,HeroBrand.css,HeroBrand.test.tsx}`
- `apps/web/src/components/layout/DashboardHeader.test.tsx`
- `apps/web/index.test.ts`

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

**Correção pós-revisão:**

- `apps/web/index.html` — `lang="en"` → `lang="pt-BR"`
- `apps/web/src/pages/DashboardPage.tsx` — usa `HeroBrand` no lugar de `PeriodOverview`
- `apps/web/src/styles/tokens.css` — tokens `--fh-brand-surface`/`--fh-brand-surface-border`
- `apps/web/src/components/layout/{Sidebar,DashboardHeader}.tsx` e respectivos `.css` — controles "apenas visuais" com `disabled` nativo
- `apps/web/src/components/layout/Sidebar.test.tsx`, `apps/web/src/App.test.tsx` — asserções atualizadas para `disabled` nativo e para a logo no hero
- `Docs/02_architecture/arquitetura_visual_dashboard.md`, `Docs/07_design_system/{identidade_visual,tokens_design,componentes_ui}.md` — atualizados com a logo/hero e os controles `disabled`

## 6. Arquivos Removidos

- `apps/web/src/App.css`, `apps/web/src/index.css` — estilos do template padrão do Vite, substituídos por `styles/global.css`/`styles/utilities.css`.
- **Correção pós-revisão:** `apps/web/src/components/dashboard/{PeriodOverview.tsx,PeriodOverview.css}` — responsabilidade absorvida por `HeroBrand`, para não duplicar competência/status em dois componentes.

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

# Correção pós-revisão (mesma branch, mesma data)
file assets/images/finanhouse-logo-hero.png.png   (confirmar PNG válido antes de qualquer ação)
# PowerShell + System.Drawing: amostrar alpha em 6 pontos — cantos com A=0 (transparência real confirmada)
mv assets/images/finanhouse-logo-hero.png.png assets/images/finanhouse-logo-hero.png   (autorizado explicitamente pelo usuário)
node -e "..."   (calcular e confirmar o caminho relativo correto até o asset a partir de components/dashboard/)
npx tsc -b && npx vite build   (apps/web — confirmar que o Vite processa o asset externo sem configuração extra)
npx vite --port 5180 && curl .../@fs/... (apps/web — confirmar que o dev server também serve o asset externo, sem fs.allow extra)
npx vitest run   (apps/web, repetido a cada arquivo novo/alterado)
npm run clean && npm run build && npm run verify:runtime
npm run lint && npm run typecheck && npm run test
npx ddae-engine validate && npx ddae-engine audit
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

**Correção pós-revisão** — 13 testes novos:

- `index.test.ts` (4): `lang="pt-BR"` presente, `lang="en"` ausente, título "Finanhouse", charset UTF-8.
- `components/dashboard/HeroBrand.test.tsx` (6): imagem oficial renderizada como `<img>` com o alt exato "Finanhouse — Casa, evolução e equilíbrio", ausência de `background-image` CSS, slogan não duplicado como texto separado, competência/status exibidos a partir do `overview` recebido, CTA "Revisar mês" com `disabled` nativo, `src` sem URL externa/base64.
- `components/layout/DashboardHeader.test.tsx` (3, novo): título/competência/status exibidos, CTA "Nova movimentação" com `disabled` nativo, clique no CTA desabilitado não produz nenhum texto de "salvo".
- `components/layout/Sidebar.test.tsx` (reescrito, ainda 3): "Visão geral" habilitada com `aria-current="page"`; demais itens com `.disabled === true` (propriedade do elemento, não apenas atributo ARIA) e sem `aria-current`.
- `App.test.tsx` (reescrito, ainda 7): substituída a asserção que checava ausência de logo por uma que confirma a logo oficial no hero (`getByRole('img', { name: 'Finanhouse — Casa, evolução e equilíbrio' })`) mantendo a confirmação de que a sidebar segue tipográfica.

## 9. Validações Executadas

- `npm run clean && npm run build` — OK (ordem `domain → api → web` respeitada).
- `npm run verify:runtime` — OK, incluindo teste negativo (sem `dist/`, sai com código 1).
- `npm ci && npm run build && npm run verify:runtime && npm run test` — OK, 165/165 testes passando (antes da correção pós-revisão).
- `npm run lint` — OK, 0 avisos (api, web, domain).
- `npm run typecheck` — OK, 0 erros (com `pretypecheck` reconstruindo o domain).
- `npx drizzle-kit check` (em `apps/api`) — "Everything's fine" (checagem estática dos snapshots, sem conexão ao banco).
- `ddae-engine validate` — OK, 0 erros/avisos.
- `ddae-engine audit` — OK, 9 warnings (7 gates pendentes + P2 Bloco 03 + P2 Bloco 04), 0 erros — **nenhuma P2 nova no Bloco 06**.
- `npm audit --omit=dev` — 0 vulnerabilidades.

**Correção pós-revisão** (repetido do zero após adicionar a logo/`HeroBrand`/`lang`/`disabled`):

- `npm ci && npm run clean && npm run build` — OK; asset da logo bundlado corretamente em `dist/assets/finanhouse-logo-hero-*.png` (hash de conteúdo).
- `npm run verify:runtime` — OK (inalterado — não toca no domain/API).
- `npm run lint` / `npm run typecheck` — OK, 0 avisos/erros.
- `npm run test` — OK, **178/178** (34 api + 45 web + 99 domain).
- `ddae-engine validate` — OK, 0 erros/avisos.
- `ddae-engine audit` — OK, 9 warnings (mesmos de sempre — 7 gates + P2 Bloco 03 + P2 Bloco 04), 0 erros.
- `npm audit --omit=dev` — 0 vulnerabilidades.
- `npm audit` — 4 moderadas, mesma cadeia de desenvolvimento do `drizzle-kit`, inalterada — `npm audit fix --force` **não** executado.
- Busca estática confirmando ausência de URL externa (`http://`/`https://`), `data:image` (base64) e caminho absoluto do Windows em `apps/web/src` (fora dos próprios testes, que citam os padrões como strings de verificação).
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

**Correção pós-revisão:**

- **`PeriodOverview` renomeado/absorvido em `HeroBrand`, em vez de manter os dois** — a logo oficial adiciona uma responsabilidade nova ("marca") ao que já era o "hero da competência"; manter ambos lado a lado duplicaria competência/status/CTA de revisão em dois componentes. `PeriodOverview.tsx`/`.css` foram removidos.
- **`Brand.tsx` não foi reaproveitado para o hero** — seu modo `logoSrc` foi desenhado para uma marca compacta (altura fixa de 32px, `alt="Finanhouse"` genérico), incompatível com a composição larga do hero (560–680px, `alt` específico com o slogan). `HeroBrand.tsx` renderiza seu próprio `<img>`, como pedido explicitamente na revisão. `Brand.tsx` permanece dedicado à sidebar (modo tipográfico).
- **Import do asset via caminho relativo simples, sem configuração de `server.fs.allow`** — o arquivo vive em `assets/images/` (raiz do monorepo), fora de `apps/web`. Testado e confirmado que o Vite detecta automaticamente a raiz do workspace (via `package-lock.json`/`.git` na raiz) tanto no build de produção quanto no dev server (`/@fs/...`), então nenhuma configuração adicional foi necessária.
- **Controles "apenas visuais" migrados de `aria-disabled` para `disabled` nativo** — um `<button disabled>` já comunica o estado corretamente à árvore de acessibilidade e ao teclado (fica fora do fluxo de tab, não dispara clique); `aria-disabled` sozinho não impede interação real, apenas sinaliza.

## 11. Problemas Encontrados

- **Bug de fuso horário na formatação de datas**: `Intl.DateTimeFormat('pt-BR', { month: 'long', ... })` sem `timeZone: 'UTC'` formatava `2026-07-01` (meia-noite UTC) como "junho de 2026" em vez de "julho de 2026", porque o formatador usa o fuso horário local do ambiente de execução por padrão (que pode estar atrás de UTC). Identificado pelo teste `dashboard-view-model.test.ts` ("descreve a competência atual como em revisão"), que falhou logo na primeira execução.
- **DOM não limpo entre testes no mesmo arquivo**: `vitest.config.ts` não tinha `setupFiles`, então o autocleanup do Testing Library (que depende de um `afterEach` global) nunca era registrado. Isso causava `getByText`/`getByRole` falhando com "multiple elements found" em arquivos com mais de um teste que chama `render()`. Só apareceu neste bloco porque os testes de `apps/web` anteriores (Bloco 01) tinham só 1 teste por arquivo.
- **Teste `App.test.tsx` assumindo que toda pendência é despesa**: a movimentação de freelance pendente (receita) também aparece em "Pendências próximas" (tem `dueDate`) — a asserção inicial esperava sinal negativo em todas as pendências, o que é incorreto para receitas. Corrigido para verificar o sinal por tipo (`entryType`), não por posição na lista.

**Correção pós-revisão:**

- **Arquivo da logo com extensão duplicada**: o arquivo entregue estava em `assets/images/finanhouse-logo-hero.png.png` (não `finanhouse-logo-hero.png`, caminho esperado pela instrução). Conforme a regra explícita de não renomear sem autorização e não inventar/adivinhar, a execução foi pausada e o proprietário foi consultado antes de qualquer ação — autorizou a renomeação, que foi feita preservando os bytes originais do arquivo (mesmo tamanho antes/depois, apenas `mv`, sem reprocessar a imagem).
- **Possível erro de digitação no slogan da imagem oficial** ("equiiibrio" em vez de "equilíbrio", com um ponto solto próximo): identificado ao inspecionar visualmente o arquivo. Não corrigido (o arquivo original não deve ser alterado) — apenas registrado como pendência (seção 13) para o proprietário decidir.

## 12. Correções Aplicadas Durante o Bloco

- Adição de `timeZone: 'UTC'` aos três formatadores de data do view-model.
- Criação de `apps/web/src/test-setup.ts` (chama `cleanup()` do Testing Library em `afterEach`) e registro em `vitest.config.ts` (`setupFiles`).
- Reescrita das asserções de `toHaveAttribute`/`not.toHaveAttribute` (que exigiriam `jest-dom`) para `getAttribute`/`hasAttribute` nativos.
- Correção da asserção de sinal em `App.test.tsx` para considerar o tipo da movimentação (receita vs. despesa), não a posição na lista.

**Correção pós-revisão:**

- Renomeação de `assets/images/finanhouse-logo-hero.png.png` para `assets/images/finanhouse-logo-hero.png` (autorizada pelo proprietário), sem alterar o conteúdo do arquivo.
- `apps/web/index.html`: `lang="en"` → `lang="pt-BR"`.
- Substituição de `PeriodOverview` por `HeroBrand` em `DashboardPage.tsx`.
- `Sidebar`/`DashboardHeader`/`HeroBrand`: `aria-disabled` → `disabled` nativo nos controles não funcionais; estilos `:disabled` adicionados para feedback visual claro.
- `Sidebar.test.tsx`/`App.test.tsx`: asserções atualizadas para checar a propriedade `disabled` do elemento e a presença da logo oficial no hero.

## 13. Pendências

### P1 — Crítica

_Nenhuma pendência crítica identificada._

### P2 — Importante

_Nenhuma pendência P2 nova neste bloco._ A persistência real (repositórios Drizzle) e a resolução de TLS continuam **dependência externa já controlada pelo Bloco 04** — ver `feedback_bloco_04_validacao_tls_e_revisao_pre_migration.md`. Este bloco não duplica essa pendência.

### P3 — Melhoria Recomendada

- ~~Logo oficial do Finanhouse ainda não está no repositório~~ — **resolvido nesta correção**: `assets/images/finanhouse-logo-hero.png` adicionado e integrado ao hero (`HeroBrand`).
- Ainda não existe um arquivo oficial **compacto** (ícone/wordmark curto) para a `Sidebar` — `Brand.tsx` continua em modo tipográfico até que esse arquivo específico seja fornecido (ver `Docs/07_design_system/identidade_visual.md`, seção 8).
- Contraste de cores não foi medido numericamente (só verificado visualmente) — ver `Docs/07_design_system/acessibilidade.md`.
- Fluxos do dashboard não foram testados com leitor de tela real (NVDA/VoiceOver) — só com a estrutura semântica/ARIA esperada.
- ~~Inspeção visual em navegador real (1440/1024/768/390px) não foi realizada neste ambiente~~ — **realizada pelo proprietário via checkpoint visual local**: aprovado funcionalmente, com refinamento visual pendente e não detalhado — ver `Docs/07_design_system/backlog_refinamento_visual.md` (P3 visual, não bloqueia integração nem o Bloco 07).
- Quando a persistência real for liberada, `dashboard-fixtures.ts` deve ser substituído por dados reais no mesmo formato de entrada esperado por `buildDashboardViewModel()` (`Category[]`/`MonthlyPeriod[]`/`FinancialEntry[]`) — view-model e componentes não devem precisar mudar.

### P4 — Opcional

- Páginas "Movimentações", "Comparativo", "Planejamento", "Histórico", "Configurações" continuam apenas como itens de navegação não funcionais.
- O slogan embutido em `assets/images/finanhouse-logo-hero.png` aparenta ter um erro de digitação ("equiiibrio"). Arquivo não alterado (fora de escopo); proprietário decide se substitui o asset.

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

**Correção pós-revisão:**

```
$ file assets/images/finanhouse-logo-hero.png.png
PNG image data, 1536 x 1024, 8-bit/color RGBA, non-interlaced

$ (PowerShell + System.Drawing) amostra de alpha em 6 pontos
(5,5): A=0 · (1531,5): A=0 · (5,1019): A=0 · (1531,1019): A=0 · (768,5): A=0 · (768,512): A=254
→ cantos totalmente transparentes, transparência real confirmada (não é um artefato de visualização)

$ mv assets/images/finanhouse-logo-hero.png.png assets/images/finanhouse-logo-hero.png
(mesmo tamanho em bytes antes/depois: 2.124.147 — conteúdo preservado)

$ npx vite build (apps/web)
dist/assets/finanhouse-logo-hero-Uom1GOC8.png  2,124.14 kB   (asset externo processado normalmente, sem config extra)

$ npx vite --port 5180 (dev) && curl .../@fs/C:/Users/leoki/FinanHouse/assets/images/finanhouse-logo-hero.png
200   (dev server serve o asset fora de apps/web sem configuração de fs.allow)

$ npm run test (resumo pós npm ci, após a correção)
api: Test Files 6 passed (6) · Tests 34 passed (34)
web: Test Files 10 passed (10) · Tests 45 passed (45)
domain: Test Files 5 passed (5) · Tests 99 passed (99)
Total: 178/178

$ grep -rE "http://|https://|data:image|C:\\\\" apps/web/src
(nenhum resultado fora dos próprios testes, que citam os padrões como strings de verificação)

$ npx ddae-engine audit
Status: OK · Warnings: 9 (7 gates + P2 Bloco 03 + P2 Bloco 04) · Errors: 0
```

## 16. Resultado Final

- [ ] Bloco concluído conforme escopo
- [x] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

**Checkpoint visual do proprietário (2026-07-25):** *"Aprovado funcionalmente para continuidade, com refinamento visual pendente e não detalhado pelo proprietário."* O proprietário identificou elementos visuais que não representam a versão final desejada, mas autorizou a integração à `main` e a continuidade do desenvolvimento — a aprovação **não** deve ser lida como aceite definitivo do design. Ressalva registrada como P3 em `Docs/07_design_system/backlog_refinamento_visual.md`, sem virar P2 e sem bloquear o Bloco 07.

## 17. Próximo Bloco Recomendado

Bloco 07 — Movimentações funcionais com estado em memória (navegação real entre "Visão geral" e "Movimentações", ainda sem banco de dados). Em paralelo, o Bloco 04 (TLS) continua aguardando resposta da Clever Cloud antes de qualquer trabalho de persistência real. O refinamento visual do dashboard fica para uma sessão dedicada futura (ver `Docs/07_design_system/backlog_refinamento_visual.md`).

## 18. Commit Semântico Sugerido

```
feat(web): construir dashboard visual com dados simulados
```

**Correção pós-revisão (commit separado):**

```
fix(web): integrar logo oficial e corrigir semântica visual
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
