# Contrato Frontend-Backend

> Projeto: FinanHouse · Atualizado em: 2026-07-25

> Este contrato é a fonte da verdade da interface entre frontend e backend. Mudar um endpoint sem atualizar este documento é uma quebra de contrato, mesmo que o código "funcione".

## 1. Objetivo

Definir, sem ambiguidade, como frontend e backend se comunicam — para que mudanças em um lado não surpreendam o outro.

## 2. Responsabilidade

O que o backend garante (formato, disponibilidade, validação) e o que o frontend pode assumir sem precisar verificar de novo.

_..._

## 3. Endpoints

| Método | Rota | Descrição | Autenticação requerida |
|---|---|---|---|
| _..._ | _..._ | _..._ | Sim / Não |

## 4. Inputs

Para cada endpoint relevante, formato de request (body, query params, headers).

```json
_..._
```

## 5. Outputs

Formato de resposta esperado, incluindo metadados de paginação/listagem quando aplicável.

```json
_..._
```

## 6. Formatos Esperados

Convenções globais: datas (ISO 8601?), IDs (UUID? incremental?), nomenclatura de campos (`camelCase`? `snake_case`?), encoding.

_..._

## 7. Regras Obrigatórias

- [ ] Todo endpoint que muda de contrato é versionado ou comunicado antes de ir para produção.
- [ ] Nenhum campo é removido de uma resposta sem janela de depreciação acordada.
- [ ] _..._

## 8. Erros Esperados

| Código HTTP | Quando ocorre | Formato do corpo de erro |
|---|---|---|
| 400 | _..._ | _..._ |
| 401 | _..._ | _..._ |
| 403 | _..._ | _..._ |
| 404 | _..._ | _..._ |
| 500 | _..._ | _..._ |

## 9. Validações

Quem valida o quê: o frontend valida antes de enviar, o backend valida antes de processar — e o que acontece quando os dois divergem (backend sempre vence).

_..._

## 10. Versionamento do Contrato

Como uma mudança breaking é comunicada (versionamento de API, changelog, depreciação) e quem precisa aprovar.

_..._

## 11. Decisões Pendentes

_..._
