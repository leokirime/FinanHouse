# database/inspection

Scripts de inspeção **somente leitura** do MySQL existente na Clever Cloud: testam conectividade, identificam a versão do MySQL, listam tabelas/colunas/tipos, chaves/índices/relacionamentos, e obtêm estimativa de registros via metadados (sem ler conteúdo real das linhas).

## Arquivos

- `inspect-database.ts` — script principal. Carrega credenciais de `apps/api/.env.local`, valida presença e formato das variáveis (sem imprimir valores), conecta com timeout curto e executa apenas a allowlist fixa de consultas abaixo.
- `write-inventory-docs.ts` — formata o resultado da inspeção e escreve os documentos sanitizados em `database/current-schema/`.
- `package.json` — declara `mysql2` explicitamente como dependência deste workspace (`database/inspection` está listado em `workspaces` na raiz). Não depende de hoisting incidental via `apps/api`.

## Como rodar

1. Preencher `apps/api/.env.local` com as credenciais reais (nunca commitado).
2. `npm run inspect:db` (raiz do monorepo).

## Allowlist de consultas

Somente estas consultas (ou equivalentes) são executadas — nenhuma entrada externa vira SQL:

- `SELECT 1`
- `SELECT VERSION()`
- `SELECT DATABASE()`
- `information_schema.tables` (engine, collation, estimativa de linhas)
- `information_schema.columns` (colunas, tipos, nulabilidade, default, chave)
- `information_schema.statistics` (índices)
- `information_schema.key_column_usage` (chaves estrangeiras)
- `information_schema.referential_constraints` (regras de ON UPDATE/DELETE)

## Regras

- Nenhuma credencial é armazenada aqui ou impressa em qualquer saída.
- Nenhum comando destrutivo (`DROP`, `TRUNCATE`, `ALTER`, `DELETE`, `UPDATE`, `INSERT`, `CREATE TABLE`) é permitido nesta pasta.
- Nenhum conteúdo real de linha (dados financeiros/pessoais) é lido ou registrado — apenas metadados estruturais.
- O resultado sanitizado alimenta `database/current-schema/`.

Status: scripts prontos, ainda **não executados**. Nenhuma conexão com o banco real foi feita até o momento — aguardando o proprietário preencher `apps/api/.env.local` e confirmar explicitamente antes da primeira conexão.
