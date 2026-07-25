# apps/web

Frontend do Finanhouse: React + Vite + TypeScript.

## Executar localmente

```bash
npm install   # na raiz do monorepo
npm run dev --workspace=web
```

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — typecheck (`tsc -b`) + build de produção
- `npm run lint` — lint (oxlint)
- `npm run preview` — pré-visualiza o build de produção

Status: bootstrap técnico mínimo (Bloco `bloco_01_bootstrap_tecnico_do_monorepo`). Tela inicial exibe apenas o nome "Finanhouse" e o slogan "Casa, evolução e equilíbrio" — sem dashboard, gráficos, dados financeiros ou autenticação.
