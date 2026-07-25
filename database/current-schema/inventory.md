# Inventário do Banco Existente

> Gerado em: 2026-07-25 · MySQL 8.4.2-2

Este é o índice do inventário somente leitura. Ver também `inspection-summary.md`, `tables.md`, `indexes.md`, `relationships.md`.

**O banco MySQL existe, mas nenhum schema de aplicação foi encontrado durante a inspeção.**

## Tabelas encontradas

_Nenhuma tabela encontrada._

## Observações

- O banco existe (conectividade confirmada, MySQL 8.4.2-2) mas está estruturalmente vazio: nenhuma tabela, logo nenhuma coluna, índice ou relacionamento.
- Não há nada a "reaproveitar" ou "adaptar" — todo o domínio do Finanhouse (usuários, movimentações, categorias, competências, recorrências, planejamento, histórico) está ausente e precisa ser modelado do zero.
- Nenhuma inconsistência técnica encontrada, pois não há estrutura para ser inconsistente.
- Ver seção "Análise do Schema Encontrado" no feedback do Bloco 02 para a classificação item a item do domínio planejado.
