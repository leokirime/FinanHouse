# Logs

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Nenhum dado sensível (senha, token, dado pessoal não necessário) deve aparecer em log — ver `Docs/03_contracts/contrato_autenticacao.md`, regra 7.

## 1. Objetivo

Garantir que logs sejam úteis para diagnóstico sem expor dados sensíveis.

## 2. Padrão de Log

Formato (texto simples, JSON estruturado), campos obrigatórios (timestamp, nível, serviço, request ID).

_..._

## 3. Níveis

| Nível | Quando usar |
|---|---|
| `error` | Falha que impede a operação de completar; requer atenção. |
| `warn` | Situação anômala mas não bloqueante. |
| `info` | Eventos relevantes do fluxo normal (ex.: requisição recebida, processo concluído). |
| `debug` | Detalhe técnico útil em desenvolvimento, normalmente desligado em produção. |

## 4. Logs Importantes

Eventos que sempre devem gerar log, mesmo em nível `info` (login, ações destrutivas, chamadas a serviços externos críticos).

_..._

## 5. Regras Obrigatórias

- [ ] Nenhum log contém senha, token completo, número de cartão ou dado pessoal sensível em texto plano.
- [ ] Toda mensagem de erro logada inclui contexto suficiente para diagnóstico (não apenas "erro ocorreu").
- [ ] _..._

## 6. Onde Consultar

Ferramenta/serviço usado para agregação e busca de logs, e como acessá-lo.

_..._

## 7. Decisões Pendentes

_..._
