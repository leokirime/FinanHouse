# apps/web

Frontend do Finanhouse: React + Vite + TypeScript + React Router.

## Executar localmente

```bash
npm install   # na raiz do monorepo
npm run dev --workspace=web
```

## Scripts

- `npm run dev` — servidor de desenvolvimento (reconstrói `@finanhouse/domain` antes, via hook `predev:web` na raiz)
- `npm run build` — typecheck (`tsc -b`) + build de produção
- `npm run lint` — lint (oxlint)
- `npm run test` — testes (Vitest + Testing Library)
- `npm run preview` — pré-visualiza o build de produção

## Estrutura

```
src/
├── styles/               # design tokens, estilos globais e utilitários (Docs/07_design_system/)
├── data/                  # fixtures sintéticas — usadas só como estado INICIAL (ver state/)
├── state/                 # estado financeiro compartilhado em memória (FinanceDemoProvider, reducer)
├── hooks/                 # useFinanceDemo, useDashboardViewModel
├── view-models/           # funções puras que combinam dados + @finanhouse/domain
├── utils/                 # formatação (dinheiro/data em pt-BR)
├── components/            # layout/, dashboard/, brand/, financial-entries/, comparison/
├── pages/                 # DashboardPage, FinancialEntriesPage, ComparisonPage
└── App.tsx                # rotas (react-router): "/", "/movimentacoes" e "/comparativo"
```

Status: dashboard de visão geral (Bloco 06, aprovado funcionalmente com refinamento visual pendente — ver `Docs/07_design_system/backlog_refinamento_visual.md`) + Movimentações funcional com estado em memória (Bloco 07 — `bloco_07_movimentacoes_funcionais_com_estado_em_memoria`) + Comparativo mensal em memória (Bloco 08 — `bloco_08_comparativo_mensal_com_estado_em_memoria`). Consome `@finanhouse/domain` (workspace, compilado) para todas as regras e cálculos financeiros exibidos — sem conexão com o MySQL, API real ou persistência real. Ao recarregar a página, os dados voltam às fixtures iniciais.

## Rotas funcionais

- `/` — visão geral do mês atual.
- `/movimentacoes` — criação, edição e transições de movimentações em memória.
- `/comparativo` — seleção de duas competências, indicadores comparativos, categorias, despesas novas/encerradas, previsto versus realizado e gráfico SVG leve. A página usa `FinanceDemoProvider` via `useFinanceDemo()` e `view-models/comparison-view-model.ts`; não lê fixtures, não persiste dados e não acessa API/banco.

Ver `Docs/02_architecture/arquitetura_visual_dashboard.md` (dashboard), `Docs/02_architecture/estado_temporario_frontend.md` (estado compartilhado/Movimentações) e `Docs/07_design_system/` (tokens/componentes/acessibilidade/responsividade).

A logo oficial do Finanhouse (`assets/images/finanhouse-logo-hero.png`, fora deste workspace) é importada pelo `HeroBrand` via mecanismo de assets do Vite — não copiar o arquivo para dentro de `apps/web`. A sidebar continua em modo tipográfico (`Brand.tsx`) até existir uma versão compacta oficial.

`react-router` está fixado em `8.3.0` (sem `^`) — migrado de `react-router-dom@7.18.1` antes da integração do Bloco 07 à `main`, eliminando a vulnerabilidade alta então documentada (decisão de segurança registrada em `Docs/02_architecture/decisoes_tecnicas.md`, DT-03, que supera a DT-02).
