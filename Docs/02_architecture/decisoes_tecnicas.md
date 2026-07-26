# Decisões Técnicas

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Registre apenas decisões caras de reverter (troca de framework, modelo de dados, estratégia de autenticação, etc.) — não decisões triviais de estilo de código.

## 1. Decisões Registradas

Use uma entrada por decisão, mais recente primeiro. Nunca edite uma decisão antiga para "corrigi-la" — registre uma nova decisão que a supersede.

### DT-06 — Histórico mensal somente leitura em memória

- **Data:** 2026-07-26
- **Contexto:** O Bloco 10 precisava decidir como expor o histórico de competências e movimentações anteriores sem introduzir um segundo estado financeiro nem abrir uma via alternativa de mutação fora das áreas de gestão já existentes (Movimentações, Planejamento).
- **Decisão:** Implementar o Histórico como derivação pura em `apps/web/src/view-models/history-view-model.ts`, consumindo a mesma fonte compartilhada do `FinanceDemoProvider` via `useFinanceDemo()`. A rota `/historico` é estritamente consultiva: nenhum componente de `components/history/` despacha ações no reducer, e não há nenhum caminho de criação, edição, exclusão, fechamento ou reabertura de competência a partir dela. Os resumos financeiros reaproveitam `calculateMonthlySummary` (`@finanhouse/domain`), sem reimplementar nenhuma fórmula. Os filtros (ano, status da competência, status da movimentação) e a competência selecionada vivem apenas como estado local de apresentação da página (`useState`), nunca escritos em `FinanceDemoState`. Nenhuma persistência é implementada nesta etapa.
- **Motivos:** impedir duplicação de estado financeiro (uma segunda fonte de movimentações/competências divergiria do Dashboard/Movimentações/Comparativo/Planejamento); evitar mutações acidentais em uma área pensada exclusivamente para consulta; manter consistência de arquitetura com as quatro áreas funcionais já entregues; preparar a substituição futura do estado demonstrativo por uma API real sem exigir mudança de interface (`useFinanceDemo()` mantém o mesmo contrato).
- **Alternativas consideradas:** permitir ações rápidas de correção (ex.: reativar uma movimentação cancelada) diretamente do Histórico — rejeitada por misturar uma área de consulta com uma área de gestão, contrariando o objetivo do bloco ("estritamente consultivo") e abrindo uma segunda via de mutação para as mesmas regras já cobertas por Movimentações.
- **Consequências:** alterações feitas em qualquer área de gestão (Movimentações, Planejamento) são válidas somente durante a sessão do navegador e refletem no Histórico em tempo real, por lerem o mesmo `state`; recarregar a página restaura as fixtures, inclusive no Histórico; dados históricos definitivos (competências fechadas de verdade, auditáveis) dependem da persistência real (API + MySQL), ainda bloqueada pelo TLS (Bloco 04); o refinamento visual do Histórico permanece como P3 no backlog de design, junto das demais áreas.
- **Status:** Vigente

### DT-05 — Planejamento mensal: limite de orçamento permite alteração em competência "review", diferente de movimentações comuns

- **Data:** 2026-07-26
- **Contexto:** O Bloco 09 precisava decidir se definir/editar/remover um limite de orçamento por categoria deveria seguir a mesma regra de `assertPeriodAllowsEntryChanges` usada por movimentações comuns — que bloqueia a competência `review` por padrão, exigindo `allowReviewAdjustment: true` explícito (hoje reservado a estorno/correção/reativação).
- **Decisão:** `packages/domain/src/planning/category-budget-rules.ts` expõe `assertPeriodAllowsBudgetChanges`, que chama `assertPeriodAllowsEntryChanges(period, { allowReviewAdjustment: true })` sempre — ou seja, limites de orçamento podem ser criados/editados/removidos em competências `open` **ou** `review`; apenas `closed` bloqueia.
- **Motivos:** planejar/ajustar limites é uma atividade de acompanhamento (não altera o histórico financeiro realizado), naturalmente mais frequente durante a revisão de fechamento do mês (quando o usuário está justamente comparando limite vs. realizado); tratar isso como "ajuste de revisão" evita impedir a única situação em que o planejamento é mais útil.
- **Alternativas consideradas:** replicar a regra padrão de movimentações comuns (bloquear `review` por padrão) — rejeitada por criar fricção desnecessária exatamente no momento em que o planejamento é mais consultado/ajustado.
- **Consequências:** criação de um **novo** limite continua restrita à competência atual do estado (mesma convenção de criação de movimentações — `Docs/02_architecture/estado_temporario_frontend.md`, seção 5), mas editar/remover um limite existente funciona em qualquer competência não fechada, inclusive ao navegar para uma competência diferente da atual no seletor da página.
- **Status:** Vigente

### DT-04 — Comparativo mensal derivado em view-model puro sobre estado em memória

- **Data:** 2026-07-26
- **Contexto:** O Bloco 08 precisava entregar a rota `/comparativo` antes da API real e antes da persistência MySQL, reaproveitando o estado demonstrativo criado no Bloco 07.
- **Decisão:** Implementar o Comparativo como derivação pura em `apps/web/src/view-models/comparison-view-model.ts`, consumindo `FinanceDemoProvider` via `useFinanceDemo()` apenas na página. A página mantém somente os IDs dos períodos selecionados; todos os cálculos financeiros usam `@finanhouse/domain` (`calculateMonthlySummary`, `compareMonthlyPeriods`, `compareExpenseCategoryTotals`, `detectNewAndDiscontinuedExpenses`, `calculateChange`) e a visualização usa SVG/CSS sem biblioteca nova.
- **Motivos:** preserva a fonte única de estado do frontend demonstrativo, evita fórmulas financeiras em JSX, mantém a futura troca para API real concentrada no provider e não introduz dependências de gráfico.
- **Consequências:** `/comparativo` reage na mesma sessão às mudanças feitas em Movimentações; ao remontar o provider, retorna às fixtures; não há `localStorage`, `IndexedDB`, API HTTP, banco, migration nem dados reais neste bloco.
- **Status:** Vigente

### DT-03 — Roteamento do frontend: migração para `react-router@8.3.0` (pin exato)

- **Data:** 2026-07-25
- **Contexto:** DT-02 havia fixado `react-router-dom@7.18.1`, aceitando como risco documentado (não eliminado) a vulnerabilidade alta GHSA-qwww-vcr4-c8h2 ("RSC Mode CSRF Bypass"), com o argumento de que ela só afeta aplicações usando APIs instáveis de RSC, não usadas pelo Finanhouse. Antes de integrar o Bloco 07 à `main`, foi identificado que existe correção oficial publicada: a faixa afetada pela advisory é `>=7.12.0, <8.3.0` — ou seja, `8.3.0` é exatamente a primeira versão corrigida (confirmado na própria descrição oficial da GHSA). Em React Router v8, o pacote `react-router-dom` foi descontinuado: aplicações em modo declarativo (client-side, sem framework mode) passam a importar diretamente do pacote único `react-router`.
- **Decisão:** Migrar de `react-router-dom@7.18.1` para `react-router@8.3.0`, pin exato (sem `^`/`~`), antes de qualquer merge do Bloco 07 na `main`. Todos os imports usados pelo projeto (`BrowserRouter`, `MemoryRouter`, `Routes`, `Route`, `Navigate`, `NavLink`, `Outlet`, `useLocation`) passaram a vir de `'react-router'`. Nenhum pacote de modo framework/SSR/RSC foi instalado (`@react-router/dev`, `@react-router/node`, `create-react-router`) — o projeto continua uma SPA declarativa client-side sobre Vite, sem loaders/actions de servidor, sem RSC, sem SSR/prerendering.
- **Motivos:** (1) `8.3.0` contém a correção oficial da vulnerabilidade, em vez de apenas documentá-la como não aplicável; (2) elimina as duas vulnerabilidades altas de produção acusadas pelo `npm audit`, não apenas as justifica; (3) a migração v7→v8 é compatível com o uso puramente declarativo já feito pelo projeto; (4) peer/engine requirements de `8.3.0` (`react`/`react-dom` `>=19.2.7`, Node `>=22.22.0`) já são atendidos pelo projeto (`react`/`react-dom` em `^19.2.7`, Node local `v24.16.0`); (5) `react-router-dom` deixou de existir como pacote principal a partir da v8 (não há release `8.x` publicado dele); (6) não há justificativa para manter uma dependência com vulnerabilidade alta aceita como risco quando existe correção oficial compatível disponível.
- **Alternativas consideradas:** manter `react-router-dom@7.18.1` com o risco documentado em DT-02 (rejeitada pelo proprietário: "não faz sentido aceitar duas vulnerabilidades altas em produção quando existe correção oficial compatível"); aguardar uma futura versão `7.x` corrigida (rejeitada — a correção só existe a partir de `8.3.0`, não há backport para a linha `7.x`).
- **Consequências:** `react-router-dom` removido das dependências de `apps/web`; qualquer novo código de roteamento deve importar de `'react-router'`; nenhuma API de modo framework (loaders/actions/`RouterProvider`/`createBrowserRouter`/RSC/SSR) deve ser usada, mantendo o projeto como SPA declarativa; **supera DT-02**, que permanece registrada abaixo apenas como histórico da decisão anterior.
- **Status:** Vigente

### DT-02 — Roteamento do frontend: `react-router-dom@7.18.1` (pin exato)

- **Data:** 2026-07-25
- **Contexto:** Bloco 07 precisa de navegação real entre "Visão geral" e "Movimentações". `react-router-dom` foi autorizado explicitamente pelo proprietário como a única dependência de roteamento a instalar. Ao instalar, `npm audit` acusou vulnerabilidades em praticamente toda a linha 7.x publicada: a versão mais recente (`7.18.1`) está na faixa afetada por GHSA-qwww-vcr4-c8h2 (CSRF bypass em "RSC Mode"); versões `6.0.0`–`7.17.0` (incluindo `7.11.0`, cogitada como downgrade "seguro") estão na faixa afetada por 13 outras advisories (XSS, open redirect, RCE via deserialização, DoS) — a maioria específica de SSR/RSC/prerendering/single-fetch/server actions.
- **Decisão:** Fixar exatamente `react-router-dom@7.18.1` (sem `^`), a versão mais recente disponível. Verificado via a própria descrição da GHSA-qwww-vcr4-c8h2 que essa vulnerabilidade **só afeta aplicações usando as APIs instáveis de RSC** ("This only affects your application if you are using the unstable RSC APIs") — o Finanhouse usa apenas o modo declarativo client-side (`BrowserRouter`/`Routes`/`Route`/`Link`/`NavLink`/`useNavigate`), sem RSC, sem loaders/actions de servidor, sem SSR/prerendering. Todas as demais 13 advisories (faixa `6.0.0`–`7.17.0`) não se aplicam a `7.18.1`, que é posterior a esse intervalo.
- **Alternativas consideradas:** `7.11.0` (evita a CSRF/RSC, mas cai nas 13 advisories da faixa anterior, incluindo open-redirect em `<Link>`/`useNavigate` — mais relevante para uso client puro que a CSRF de RSC); outro roteador (explicitamente proibido pelo prompt do Bloco 07).
- **Consequências:** Pin exato (não `^7.18.1`) para que uma atualização automática não reintroduza silenciosamente uma versão pior; reavaliar quando uma versão publicada corrigir GHSA-qwww-vcr4-c8h2 sem reabrir as demais.
- **Status:** Superada pela DT-03 antes da integração do Bloco 07

### DT-01 — Persistência: Drizzle ORM + mysql2

- **Data:** 2026-07-25
- **Contexto:** O MySQL do Finanhouse existe na Clever Cloud mas está confirmado vazio (Bloco 02). Era preciso decidir a camada de acesso a dados antes de modelar o schema.
- **Decisão:** Drizzle ORM (schema tipado + geração de migrations) sobre `mysql2` (driver real). Ver ADR completo em `Docs/02_architecture/adr_001_persistencia_drizzle_mysql2.md`.
- **Alternativas consideradas:** `mysql2` puro (mais simples, mas migrations e tipagem manuais); Prisma/TypeORM/Sequelize/Knex (mais peso/complexidade do que o projeto precisa).
- **Consequências:** Schema TypeScript vira fonte de verdade; migrations são geradas e revisadas, nunca aplicadas via `drizzle-kit push`; aplicação de migration exige autorização explícita.
- **Status:** Vigente

## 2. Perguntas Orientadoras

- Esta decisão seria cara de reverter dentro de 3 meses? Se sim, ela pertence aqui.
- As alternativas descartadas estão registradas com o motivo real, ou só "decidimos não fazer assim"?
- Esta decisão contradiz alguma decisão anterior? Se sim, a anterior foi marcada como superada?

## 3. Critérios de Aceite

- [ ] Toda decisão tem alternativas consideradas registradas, não apenas a escolha final.
- [ ] Nenhuma decisão antiga foi editada in-place quando uma nova decisão a substituiu — foi criada uma nova entrada com referência cruzada.

## 4. Riscos

Decisões tomadas sob pressão de tempo, sem alternativas reais avaliadas, ou que dependem de uma pessoa específica para serem entendidas.

_..._

## 5. Decisões Pendentes

Decisões que precisam ser tomadas mas ainda não foram.

- **Verificação de TLS/SSL entre a futura aplicação (Vercel) e o MySQL da Clever Cloud** — a inspeção do Bloco 02 usou `DATABASE_SSL=false` apenas para ler metadados; produção precisa de transporte seguro confirmado antes da primeira migration real e antes de qualquer dado real. Ver ADR-001 (`Docs/02_architecture/adr_001_persistencia_drizzle_mysql2.md`) e `Docs/03_contracts/contrato_banco_dados.md`.
- **Aplicação da migration inicial gerada no Bloco 03** — depende de revisão e autorização explícita do proprietário; não é automática mesmo após o schema estar modelado.
