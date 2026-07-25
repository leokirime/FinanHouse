# Decisões Técnicas

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Registre apenas decisões caras de reverter (troca de framework, modelo de dados, estratégia de autenticação, etc.) — não decisões triviais de estilo de código.

## 1. Decisões Registradas

Use uma entrada por decisão, mais recente primeiro. Nunca edite uma decisão antiga para "corrigi-la" — registre uma nova decisão que a supersede.

### DT-02 — Roteamento do frontend: `react-router-dom@7.18.1` (pin exato)

- **Data:** 2026-07-25
- **Contexto:** Bloco 07 precisa de navegação real entre "Visão geral" e "Movimentações". `react-router-dom` foi autorizado explicitamente pelo proprietário como a única dependência de roteamento a instalar. Ao instalar, `npm audit` acusou vulnerabilidades em praticamente toda a linha 7.x publicada: a versão mais recente (`7.18.1`) está na faixa afetada por GHSA-qwww-vcr4-c8h2 (CSRF bypass em "RSC Mode"); versões `6.0.0`–`7.17.0` (incluindo `7.11.0`, cogitada como downgrade "seguro") estão na faixa afetada por 13 outras advisories (XSS, open redirect, RCE via deserialização, DoS) — a maioria específica de SSR/RSC/prerendering/single-fetch/server actions.
- **Decisão:** Fixar exatamente `react-router-dom@7.18.1` (sem `^`), a versão mais recente disponível. Verificado via a própria descrição da GHSA-qwww-vcr4-c8h2 que essa vulnerabilidade **só afeta aplicações usando as APIs instáveis de RSC** ("This only affects your application if you are using the unstable RSC APIs") — o Finanhouse usa apenas o modo declarativo client-side (`BrowserRouter`/`Routes`/`Route`/`Link`/`NavLink`/`useNavigate`), sem RSC, sem loaders/actions de servidor, sem SSR/prerendering. Todas as demais 13 advisories (faixa `6.0.0`–`7.17.0`) não se aplicam a `7.18.1`, que é posterior a esse intervalo.
- **Alternativas consideradas:** `7.11.0` (evita a CSRF/RSC, mas cai nas 13 advisories da faixa anterior, incluindo open-redirect em `<Link>`/`useNavigate` — mais relevante para uso client puro que a CSRF de RSC); outro roteador (explicitamente proibido pelo prompt do Bloco 07).
- **Consequências:** Pin exato (não `^7.18.1`) para que uma atualização automática não reintroduza silenciosamente uma versão pior; reavaliar quando uma versão publicada corrigir GHSA-qwww-vcr4-c8h2 sem reabrir as demais.
- **Status:** Vigente

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
