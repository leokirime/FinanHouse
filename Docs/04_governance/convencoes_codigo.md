# Convenções de Código

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Convenções aqui valem para humanos e agentes de IA igualmente. Um agente que gera código fora destas convenções deve ser corrigido no mesmo bloco, não "depois".

## 1. Objetivo

Garantir que código escrito por pessoas diferentes (ou por agentes diferentes) pareça ter sido escrito pelo mesmo time.

## 2. Estilo

Formatação, linter, formatter usados (ex.: ESLint, Prettier) e como rodá-los.

_..._

## 3. Padrões de Nomenclatura

Convenção para variáveis, funções, classes, arquivos (pode divergir da convenção `snake_case` de `Docs/`, que é específica para documentação).

_..._

## 4. Padrões Arquiteturais de Código

Padrões de organização esperados (ex.: injeção de dependência, camadas, tratamento de erros) — alinhados com `Docs/02_architecture/arquitetura_base.md`.

_..._

## 5. Comentários e Documentação Inline

Quando comentar (e quando não comentar). Evite redundância com nomes de identificadores já claros.

_..._

## 6. Regras Obrigatórias

- [ ] Código novo segue o linter/formatter configurado, sem exceções silenciosas.
- [ ] Nenhum código morto ou comentado é deixado no commit final.
- [ ] _..._

## 7. Regras Específicas para Código Gerado por Agentes de IA

- [ ] Agente não introduz dependência nova sem registrar a decisão em `registro_decisoes.md`.
- [ ] Agente não cria abstração para um caso de uso único ("YAGNI").
- [ ] Agente segue o padrão de código já existente no arquivo/módulo que está editando, mesmo que prefira outro estilo.

## 8. Perguntas Orientadoras

- Esta convenção é verificada automaticamente (lint/CI) ou depende de revisão manual?
- Existe uma exceção documentada para algum caso especial, ou toda exceção é ad hoc?

## 9. Decisões Pendentes

_..._
