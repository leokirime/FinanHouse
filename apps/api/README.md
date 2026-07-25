# apps/api

API do Finanhouse: Node.js + TypeScript.

## Executar localmente

```bash
npm install   # na raiz do monorepo
npm run dev --workspace=api
```

Servidor sobe em `http://localhost:3001` (porta configurável via `PORT`).

## Endpoints

- `GET /health` → `{ "status": "ok", "service": "finanhouse-api" }`

## Scripts

- `npm run dev` — servidor de desenvolvimento (`tsx watch`)
- `npm run build` — compila TypeScript para `dist/`
- `npm start` — executa o build compilado
- `npm run lint` — lint (oxlint)
- `npm run typecheck` — checagem de tipos sem emitir arquivos
- `npm test` — testes (vitest)

Status: bootstrap técnico mínimo (Bloco `bloco_01_bootstrap_tecnico_do_monorepo`). Nenhuma conexão com o MySQL da Clever Cloud, nenhum ORM/driver de banco instalado, nenhuma autenticação implementada.
