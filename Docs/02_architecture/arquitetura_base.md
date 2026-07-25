# Arquitetura Base

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Descreva a arquitetura como ela é (ou será), não como um diagrama idealizado. Se uma decisão aqui é cara de reverter, registre-a também em `decisoes_tecnicas.md`.

## 1. Visão Geral

Resumo de alto nível: que tipo de sistema é este (monolito, microsserviços, SPA + API, mobile + backend, etc.) e por quê.

_..._

## 2. Componentes

Liste os componentes principais e a responsabilidade de cada um.

| Componente | Responsabilidade | Tecnologia |
|---|---|---|
| Frontend | _..._ | _..._ |
| Backend / API | _..._ | _..._ |
| Banco de dados | _..._ | _..._ |
| Autenticação | _..._ | _..._ |
| Autorização | _..._ | _..._ |
| Integrações externas | _..._ | _..._ |
| Armazenamento de arquivos | _..._ | _..._ |
| Logs / observabilidade | _..._ | _..._ |

## 3. Fluxo de Dados

Descreva (ou desenhe em texto) como uma requisição típica atravessa os componentes, do cliente até a persistência e de volta.

_..._

## 4. Segurança

Pontos de entrada de dados não confiáveis, fronteiras de confiança, onde autenticação/autorização são verificadas. Detalhe contratual vai em `Docs/03_contracts/contrato_autenticacao.md`.

_..._

## 5. Performance e Escalabilidade

Onde estão os pontos de contenção esperados (banco, fila, processamento síncrono) e como o sistema escala horizontalmente/verticalmente, se aplicável.

_..._

## 6. Perguntas Orientadoras

- Se o componente mais carregado hoje precisasse suportar 10x o tráfego, o que quebraria primeiro?
- Existe um componente que, se cair, derruba todo o sistema (ponto único de falha)?
- Esta arquitetura foi escolhida por necessidade real ou por familiaridade da equipe?

## 7. Critérios de Aceite

- [ ] Todo componente listado tem responsabilidade única e claramente descrita.
- [ ] Fronteiras de confiança e pontos de autenticação/autorização estão explícitos.
- [ ] Não há decisão arquitetural relevante sem entrada correspondente em `decisoes_tecnicas.md`.

## 8. Riscos

Riscos arquiteturais de alto nível — detalhe completo vai em `riscos_arquiteturais.md`.

_..._

## 9. Decisões Pendentes

_..._
