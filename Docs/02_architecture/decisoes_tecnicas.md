# Decisões Técnicas

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Registre apenas decisões caras de reverter (troca de framework, modelo de dados, estratégia de autenticação, etc.) — não decisões triviais de estilo de código.

## 1. Decisões Registradas

Use uma entrada por decisão, mais recente primeiro. Nunca edite uma decisão antiga para "corrigi-la" — registre uma nova decisão que a supersede.

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
