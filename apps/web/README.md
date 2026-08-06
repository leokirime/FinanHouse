# apps/web

Frontend do Finanhouse: React + Vite + TypeScript + React Router.

## Executar localmente

```bash
npm install               # na raiz do monorepo
npm run dev:web            # comando oficial (raiz do monorepo) — ver "Scripts"
```

`npm run dev:web` roda `predev:web` (`npm run build:domain`) antes de iniciar o Vite — garante que `packages/domain/dist/index.js` existe sem exigir compilação manual do pacote `domain`, sem executar `npm run clean` (que apagaria esse `dist` recém-gerado) e sem iniciar `apps/api` ou tocar no banco. `npm run dev --workspace=web` (chamado direto, sem passar pela raiz) só funciona se `packages/domain/dist` já existir de uma build anterior — prefira sempre `npm run dev:web`.

## Configuração local (API real)

Desde o Bloco 17, o frontend exige a API real em execução (`npm run dev:api`, raiz). Copie `apps/web/.env.example` para `apps/web/.env.local` (nunca commitado — funciona em qualquer clone novo sem exigir conhecimento tácito):

```bash
cp apps/web/.env.example apps/web/.env.local
```

```env
VITE_API_BASE_URL=
```

Desde o Bloco 19 (DT-14/DT-15), o valor recomendado é **vazio** — significa "mesma origem do frontend". `vite.config.ts` encaminha `/api/*` para a API local (`http://127.0.0.1:3000`) através de um proxy de desenvolvimento (`server.proxy`), então o navegador nunca fala diretamente com a porta da API; do ponto de vista do navegador, toda chamada é same-origin. Isso é obrigatório para o cookie de sessão `HttpOnly`/`SameSite=Lax` funcionar: `localhost` e `127.0.0.1` são hosts diferentes para o navegador, e um cookie `SameSite=Lax` nunca é enviado numa requisição `fetch`/XHR cross-site — apontar `VITE_API_BASE_URL` direto para `http://127.0.0.1:3000` (ou qualquer origem diferente da do frontend) faz o login "funcionar" mas a sessão nunca validar depois. Só use uma URL absoluta em `VITE_API_BASE_URL` se você tiver um motivo técnico específico para não usar o proxy — nesse caso, garanta que o frontend e a API estejam na mesma origem por outro meio.

`vite.config.ts` também fixa `server.host = '127.0.0.1'` (nunca `localhost`, nunca todas as interfaces) — a URL final é sempre `http://127.0.0.1:5173/`.

Desde o Bloco 19 (DT-14), **não existe mais `VITE_FINANHOUSE_HOUSEHOLD_ID`** — o `householdId` vem da sessão autenticada (`GET /api/v1/auth/session`), nunca de uma variável de ambiente ou hardcoded no bundle. Sem `VITE_API_BASE_URL` definida (mesmo vazia), a aplicação mostra um erro explícito de configuração (`FinanceStatusScreen`) — nunca cai para dados fictícios. Para acessar o app é preciso uma sessão real: login com e-mail/senha de um dos dois usuários já existentes (senhas configuradas via `db-configure-initial-passwords.ts`, autorização própria).

## Scripts

- `npm run dev:web` (raiz do monorepo) — comando oficial para desenvolvimento local do frontend; prepara `@finanhouse/domain` (`predev:web`) e inicia só o Vite de `web`
- `npm run dev` (dentro de `apps/web`) — servidor de desenvolvimento (assume que `@finanhouse/domain` já está compilado)
- `npm run build` — typecheck (`tsc -b`) + build de produção
- `npm run lint` — lint (oxlint)
- `npm run test` — testes (Vitest + Testing Library)
- `npm run preview` — pré-visualiza o build de produção

## Estrutura

```
src/
├── styles/               # design tokens, estilos globais e utilitários (Docs/07_design_system/)
├── api/                   # cliente HTTP real (config, erros, fetch, DTOs, mapeadores, auth-api) — Blocos 17/19
├── state/                 # AuthProvider + FinanceProvider reais (API); test-support/ = infraestrutura exclusiva de teste
├── hooks/                 # useAuth/useAuthenticated, useFinance/useReadyFinance, useDashboardViewModel, useMutationDialog
├── view-models/           # funções puras que combinam dados + @finanhouse/domain
├── utils/                 # formatação (dinheiro/data em pt-BR), competência civil atual
├── components/            # layout/, dashboard/, brand/, financial-entries/, comparison/, planning/, history/
├── pages/                 # LoginPage, DashboardPage, FinancialEntriesPage, ComparisonPage, PlanningPage, HistoryPage
├── App.tsx                # gateia loading/erro do FinanceProvider; rotas (react-router)
└── AppRoot.tsx             # gateia autenticação (AuthProvider) — só monta FinanceProvider/App depois de logado (Bloco 19)
```

Status (Bloco 17 — `bloco_17_integracao_direta_do_frontend_com_a_api_real`): frontend integrado diretamente à **API HTTP real** (Bloco 16) — nenhum fallback demonstrativo em runtime (DT-12). O antigo modo demonstrativo (`FinanceDemoProvider`, fixtures) foi removido do runtime; a mesma lógica de transição foi portada para `state/test-support/` como infraestrutura exclusiva de teste. Configuração local via `apps/web/.env.local` (só `VITE_API_BASE_URL` desde o Bloco 19, nunca commitado). Desde o Bloco 18 (DT-13), a Planejamento também consome `.../periods/:referenceMonth/budgets` via um hook dedicado (`hooks/use-period-budgets.ts`, fora de `FinanceProvider` — só a Planejamento usa limites) para definir/editar/remover limites mensais por categoria; a migration `0002_category_budgets.sql` foi aplicada a `finanhouse_dev` em 2026-08-04, com autorização explícita do proprietário. Desde o Bloco 19 (DT-14), `AppRoot.tsx` exige sessão real (cookie `HttpOnly`) antes de montar `FinanceProvider`/`App` — sem sessão, mostra `LoginPage`; `householdId` vem inteiro da sessão, nunca de env; a migration `0003_auth_sessions.sql` foi aplicada a `finanhouse_dev` e as senhas iniciais dos dois usuários existentes foram configuradas, ambas com autorização explícita e separada do proprietário. O cookie de sessão é first-party: `vite.config.ts` encaminha `/api/*` para a API local via proxy de desenvolvimento — o navegador nunca fala diretamente com a porta da API, evitando o bloqueio de cookies `SameSite=Lax` entre `localhost`/`127.0.0.1` como origens diferentes.

## Rotas funcionais

Todas as rotas abaixo exigem sessão autenticada (Bloco 19, DT-14) — sem sessão, `AppRoot.tsx` mostra a tela de login (`/login` não é uma rota separada; a própria árvore de rotas é substituída por `LoginPage` até autenticar).

- `/` — visão geral da competência civil atual, dados reais da API.
- `/movimentacoes` — criação, edição e transições de movimentações reais via API.
- `/comparativo` — seleção de duas competências reais, indicadores comparativos, categorias, despesas novas/encerradas, previsto versus realizado e gráfico SVG leve.
- `/planejamento` — contas previstas da competência (receitas/despesas `planned`/`pending`) via movimentações reais; limites mensais por categoria definidos/editados/removidos via API real (Bloco 18, DT-13) — nunca em memória.
- `/historico` — consulta somente leitura de competências e movimentações reais: lista de competências (filtro por ano/status), resumo financeiro e contagem por status, movimentações filtráveis por status; nunca despacha nenhuma ação.

Todas as páginas usam `useReadyFinance()` (`hooks/use-finance.ts`) — só montam depois que `FinanceProvider` termina a carga inicial (`App.tsx` gateia `loading`/`error` com `FinanceStatusScreen`, nunca renderizando dados fictícios em caso de falha).

Ver `Docs/03_contracts/contrato_frontend_backend.md` (consumo da API), `Docs/03_contracts/contrato_api_http.md` (contrato de rotas do Bloco 16), `Docs/02_architecture/decisoes_tecnicas.md` (DT-12) e `Docs/07_design_system/` (tokens/componentes/acessibilidade/responsividade).

A logo oficial do Finanhouse (`assets/images/finanhouse-logo-hero.png`, fora deste workspace) é importada via mecanismo de assets do Vite — não copiar o arquivo para dentro de `apps/web`. Ocorre duas vezes: sidebar (institucional) e hero do dashboard (decorativa) — mesmo arquivo, componente `Brand.tsx` com `size` diferente em cada contexto.

`react-router` está fixado em `8.3.0` (sem `^`) — migrado de `react-router-dom@7.18.1` antes da integração do Bloco 07 à `main`, eliminando a vulnerabilidade alta então documentada (decisão de segurança registrada em `Docs/02_architecture/decisoes_tecnicas.md`, DT-03, que supera a DT-02).
