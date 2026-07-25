# database/proposed-schema

Documentação do **schema proposto** para o domínio financeiro do Finanhouse — modelado no Bloco 03 (`bloco_03_modelagem_inicial_do_dominio_financeiro`).

**Importante — não confundir com `database/current-schema/`:**
- `database/current-schema/` documenta o que **realmente existe** no MySQL da Clever Cloud (hoje: vazio, 0 tabelas).
- `database/proposed-schema/` (esta pasta) documenta o que **está sendo proposto**, com a migration já gerada em `database/migrations/0000_initial_financial_domain.sql`, mas **ainda não aplicada** ao banco real.

Fonte de verdade em código: `apps/api/src/db/schema/`.

## Arquivos

- `modelo-logico.md` — as 6 tabelas da fundação, campos, tipos, regras de negócio.
- `relacionamentos.md` — chaves estrangeiras, cardinalidade, regras de exclusão.
- `extensoes-futuras.md` — estruturas conscientemente deixadas de fora desta primeira migration.

## Status

Schema proposto, migration gerada e revisada, **não aplicada**. O banco real permanece vazio.
