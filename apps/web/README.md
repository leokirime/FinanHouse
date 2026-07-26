# apps/web

Frontend do Finanhouse: React + Vite + TypeScript + React Router.

## Executar localmente

```bash
npm install               # na raiz do monorepo
npm run dev:web            # comando oficial (raiz do monorepo) — ver "Scripts"
```

`npm run dev:web` roda `predev:web` (`npm run build:domain`) antes de iniciar o Vite — garante que `packages/domain/dist/index.js` existe sem exigir compilação manual do pacote `domain`, sem executar `npm run clean` (que apagaria esse `dist` recém-gerado) e sem iniciar `apps/api` ou tocar no banco. `npm run dev --workspace=web` (chamado direto, sem passar pela raiz) só funciona se `packages/domain/dist` já existir de uma build anterior — prefira sempre `npm run dev:web`.

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
├── data/                  # fixtures sintéticas — usadas só como estado INICIAL (ver state/)
├── state/                 # estado financeiro compartilhado em memória (FinanceDemoProvider, reducer)
├── hooks/                 # useFinanceDemo, useDashboardViewModel
├── view-models/           # funções puras que combinam dados + @finanhouse/domain
├── utils/                 # formatação (dinheiro/data em pt-BR)
├── components/            # layout/, dashboard/, brand/, financial-entries/, comparison/, planning/
├── pages/                 # DashboardPage, FinancialEntriesPage, ComparisonPage, PlanningPage
└── App.tsx                # rotas (react-router): "/", "/movimentacoes", "/comparativo" e "/planejamento"
```

Status: dashboard de visão geral (Bloco 06, aprovado funcionalmente com refinamento visual pendente — ver `Docs/07_design_system/backlog_refinamento_visual.md`) + Movimentações funcional com estado em memória (Bloco 07 — `bloco_07_movimentacoes_funcionais_com_estado_em_memoria`) + Comparativo mensal em memória (Bloco 08 — `bloco_08_comparativo_mensal_com_estado_em_memoria`) + Planejamento mensal em memória (Bloco 09 — `bloco_09_planejamento_mensal_com_estado_em_memoria`, branch própria, não integrada à `main`). Consome `@finanhouse/domain` (workspace, compilado) para todas as regras e cálculos financeiros exibidos — sem conexão com o MySQL, API real ou persistência real. Ao recarregar a página, os dados voltam às fixtures iniciais.

## Rotas funcionais

- `/` — visão geral do mês atual.
- `/movimentacoes` — criação, edição e transições de movimentações em memória.
- `/comparativo` — seleção de duas competências, indicadores comparativos, categorias, despesas novas/encerradas, previsto versus realizado e gráfico SVG leve. A página usa `FinanceDemoProvider` via `useFinanceDemo()` e `view-models/comparison-view-model.ts`; não lê fixtures, não persiste dados e não acessa API/banco.
- `/planejamento` — limites de orçamento por categoria de despesa na competência selecionada: resumo, lista por categoria (limite, realizado, pendente, planejado, projetado, saldo restante, excedido, status), despesas planejadas/pendentes e gráfico SVG leve. A página usa `FinanceDemoProvider` via `useFinanceDemo()` e `view-models/planning-view-model.ts`; não lê fixtures, não persiste dados e não acessa API/banco. Definir um **novo** limite só é permitido na competência atual; editar/remover funciona em qualquer competência não fechada.

Ver `Docs/02_architecture/arquitetura_visual_dashboard.md` (dashboard), `Docs/02_architecture/estado_temporario_frontend.md` (estado compartilhado/Movimentações) e `Docs/07_design_system/` (tokens/componentes/acessibilidade/responsividade).

A logo oficial do Finanhouse (`assets/images/finanhouse-logo-hero.png`, fora deste workspace) é importada pelo `HeroBrand` via mecanismo de assets do Vite — não copiar o arquivo para dentro de `apps/web`. A sidebar continua em modo tipográfico (`Brand.tsx`) até existir uma versão compacta oficial.

`react-router` está fixado em `8.3.0` (sem `^`) — migrado de `react-router-dom@7.18.1` antes da integração do Bloco 07 à `main`, eliminando a vulnerabilidade alta então documentada (decisão de segurança registrada em `Docs/02_architecture/decisoes_tecnicas.md`, DT-03, que supera a DT-02).
