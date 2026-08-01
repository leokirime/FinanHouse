# apps/web

Frontend do Finanhouse: React + Vite + TypeScript + React Router.

## Executar localmente

```bash
npm install               # na raiz do monorepo
npm run dev:web            # comando oficial (raiz do monorepo) — ver "Scripts"
```

`npm run dev:web` roda `predev:web` (`npm run build:domain`) antes de iniciar o Vite — garante que `packages/domain/dist/index.js` existe sem exigir compilação manual do pacote `domain`, sem executar `npm run clean` (que apagaria esse `dist` recém-gerado) e sem iniciar `apps/api` ou tocar no banco. `npm run dev --workspace=web` (chamado direto, sem passar pela raiz) só funciona se `packages/domain/dist` já existir de uma build anterior — prefira sempre `npm run dev:web`.

## Configuração local (API real)

Desde o Bloco 17, o frontend exige a API real em execução (`npm run dev:api`, raiz). Configure `apps/web/.env.local` (nunca commitado):

```env
VITE_API_BASE_URL=http://127.0.0.1:3000
VITE_FINANHOUSE_HOUSEHOLD_ID=<ID do household criado pelo bootstrap estrutural>
```

`VITE_FINANHOUSE_HOUSEHOLD_ID` não é uma credencial, mas nunca deve ser hardcoded no código-fonte nem presumido como `1` — vem do `householdId` impresso por `npm run db:bootstrap:household` (`apps/api/scripts/db-bootstrap-household.ts`). Sem essas variáveis, a aplicação mostra um erro explícito de configuração (`FinanceStatusScreen`) — nunca cai para dados fictícios.

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
├── api/                   # cliente HTTP real (config, erros, fetch, DTOs, mapeadores) — Bloco 17
├── state/                 # FinanceProvider real (API); test-support/ = infraestrutura exclusiva de teste
├── hooks/                 # useFinance/useReadyFinance, useDashboardViewModel, useMutationDialog
├── view-models/           # funções puras que combinam dados + @finanhouse/domain
├── utils/                 # formatação (dinheiro/data em pt-BR), competência civil atual
├── components/            # layout/, dashboard/, brand/, financial-entries/, comparison/, planning/, history/
├── pages/                 # DashboardPage, FinancialEntriesPage, ComparisonPage, PlanningPage, HistoryPage
└── App.tsx                # gateia loading/erro do FinanceProvider; rotas (react-router)
```

Status (Bloco 17 — `bloco_17_integracao_direta_do_frontend_com_a_api_real`): frontend integrado diretamente à **API HTTP real** (Bloco 16) — nenhum fallback demonstrativo em runtime (DT-12). O antigo modo demonstrativo (`FinanceDemoProvider`, fixtures) foi removido do runtime; a mesma lógica de transição foi portada para `state/test-support/` como infraestrutura exclusiva de teste. Configuração local via `apps/web/.env.local` (`VITE_API_BASE_URL`, `VITE_FINANHOUSE_HOUSEHOLD_ID`, nunca commitado).

## Rotas funcionais

- `/` — visão geral da competência civil atual, dados reais da API.
- `/movimentacoes` — criação, edição e transições de movimentações reais via API.
- `/comparativo` — seleção de duas competências reais, indicadores comparativos, categorias, despesas novas/encerradas, previsto versus realizado e gráfico SVG leve.
- `/planejamento` — contas previstas da competência (receitas/despesas `planned`/`pending`) via movimentações reais; **limites por categoria (orçamento) ainda não têm persistência própria** — a página mostra a distribuição por categoria calculada das movimentações reais, com aviso explícito sobre a evolução futura dos limites.
- `/historico` — consulta somente leitura de competências e movimentações reais: lista de competências (filtro por ano/status), resumo financeiro e contagem por status, movimentações filtráveis por status; nunca despacha nenhuma ação.

Todas as páginas usam `useReadyFinance()` (`hooks/use-finance.ts`) — só montam depois que `FinanceProvider` termina a carga inicial (`App.tsx` gateia `loading`/`error` com `FinanceStatusScreen`, nunca renderizando dados fictícios em caso de falha).

Ver `Docs/03_contracts/contrato_frontend_backend.md` (consumo da API), `Docs/03_contracts/contrato_api_http.md` (contrato de rotas do Bloco 16), `Docs/02_architecture/decisoes_tecnicas.md` (DT-12) e `Docs/07_design_system/` (tokens/componentes/acessibilidade/responsividade).

A logo oficial do Finanhouse (`assets/images/finanhouse-logo-hero.png`, fora deste workspace) é importada via mecanismo de assets do Vite — não copiar o arquivo para dentro de `apps/web`. Ocorre duas vezes: sidebar (institucional) e hero do dashboard (decorativa) — mesmo arquivo, componente `Brand.tsx` com `size` diferente em cada contexto.

`react-router` está fixado em `8.3.0` (sem `^`) — migrado de `react-router-dom@7.18.1` antes da integração do Bloco 07 à `main`, eliminando a vulnerabilidade alta então documentada (decisão de segurança registrada em `Docs/02_architecture/decisoes_tecnicas.md`, DT-03, que supera a DT-02).
