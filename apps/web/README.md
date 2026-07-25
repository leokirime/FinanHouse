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
├── components/            # layout/, dashboard/, brand/, financial-entries/
├── pages/                 # DashboardPage, FinancialEntriesPage
└── App.tsx                # rotas (react-router-dom): "/" e "/movimentacoes"
```

Status: dashboard de visão geral (Bloco 06, aprovado funcionalmente com refinamento visual pendente — ver `Docs/07_design_system/backlog_refinamento_visual.md`) + Movimentações funcional com estado em memória (Bloco 07 — `bloco_07_movimentacoes_funcionais_com_estado_em_memoria`). Consome `@finanhouse/domain` (workspace, compilado) para todas as regras e cálculos financeiros exibidos — sem conexão com o MySQL, API real ou persistência real. Ao recarregar a página, os dados voltam às fixtures iniciais.

Ver `Docs/02_architecture/arquitetura_visual_dashboard.md` (dashboard), `Docs/02_architecture/estado_temporario_frontend.md` (estado compartilhado/Movimentações) e `Docs/07_design_system/` (tokens/componentes/acessibilidade/responsividade).

A logo oficial do Finanhouse (`assets/images/finanhouse-logo-hero.png`, fora deste workspace) é importada pelo `HeroBrand` via mecanismo de assets do Vite — não copiar o arquivo para dentro de `apps/web`. A sidebar continua em modo tipográfico (`Brand.tsx`) até existir uma versão compacta oficial.

`react-router-dom` está fixado em `7.18.1` (sem `^`) — decisão de segurança registrada em `Docs/02_architecture/decisoes_tecnicas.md` (DT-02).
