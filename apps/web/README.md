# apps/web

Frontend do Finanhouse: React + Vite + TypeScript.

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
├── styles/          # design tokens, estilos globais e utilitários (Docs/07_design_system/)
├── data/             # fixtures sintéticas centralizadas (nenhum dado real)
├── view-models/      # única camada que lê fixtures + funções de @finanhouse/domain
├── utils/            # formatação (ex.: dinheiro em pt-BR)
├── components/        # layout/, dashboard/, brand/
└── pages/              # DashboardPage
```

Status: dashboard visual com dados simulados (Bloco `bloco_06_dashboard_visual_com_dados_simulados`). Consome `@finanhouse/domain` (workspace, compilado) para os cálculos financeiros exibidos — sem conexão com o MySQL, API real ou persistência. Ver `Docs/02_architecture/arquitetura_visual_dashboard.md` para a arquitetura completa e `Docs/07_design_system/` para tokens/componentes/acessibilidade/responsividade.
