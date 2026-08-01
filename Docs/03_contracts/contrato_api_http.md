# Contrato da API HTTP

> Projeto: FinanHouse · Atualizado em: 2026-07-31

> Este contrato descreve a API HTTP implementada no Bloco 16 (DT-11). É a fonte da verdade da superfície HTTP da API — mudar uma rota, um formato de erro ou uma regra de validação sem atualizar este documento é uma quebra de contrato, mesmo que o código "funcione". Não confundir com `Docs/03_contracts/contrato_frontend_backend.md` (ainda um template — a integração real do frontend com esta API é um bloco futuro, fora do escopo do Bloco 16).

## 1. Objetivo

Definir sem ambiguidade as rotas, formatos de entrada/saída, códigos HTTP e regras de segurança da API HTTP financeira local (`apps/api/src/http/`).

## 2. Estado Atual

**Execução exclusivamente local.** A API não implementa autenticação real (ver `Docs/03_contracts/contrato_autenticacao.md`) — por isso `createHttpApp` recusa `runtimeMode: 'production'`, o bootstrap (`http/server.ts`) só faz bind em `127.0.0.1` (nunca `0.0.0.0`, nunca configurável) e o CORS aceita apenas `http://127.0.0.1:5173`/`http://localhost:5173` (nunca wildcard). **Esta API nunca deve ser apresentada como pronta para exposição pública** enquanto essas condições não mudarem. O frontend ainda não está integrado a ela — continua em modo demonstrativo (`Docs/02_architecture/estado_temporario_frontend.md`).

## 3. Prefixo e Escopo

Todas as rotas financeiras usam o prefixo:

```
/api/v1/households/:householdId
```

`householdId` é a fonte de escopo de toda operação — deve ser um inteiro positivo, seguro para JavaScript (`Number.isSafeInteger`), sem coerção silenciosa (rejeitado se zero, negativo, decimal ou texto arbitrário). Nenhum corpo de requisição pode conter `householdId` — o schema rejeita como campo desconhecido (`additionalProperties: false`, com `removeAdditional: false` explicitamente configurado no AJV do Fastify — o padrão do framework removeria o campo silenciosamente em vez de rejeitar, ver DT-11).

Um recurso pertencente a outro household nunca é retornado nem alterado: sempre `404` (recurso não encontrado no household) ou `409` (conflito de escopo detectado pelo domínio, ex.: período/categoria/membro referenciado pertence a outro household).

## 4. Endpoints

### Infraestrutura

| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| GET | `/health` | Confirma que o processo HTTP está ativo — nunca consulta o banco. | Não |
| GET | `/ready` | Confirma disponibilidade real (config, pool, conexão, TLS) via dependência injetada — nunca abre conexão em testes. | Não |

### Categorias e membros (somente leitura)

| Método | Rota | Descrição |
|---|---|---|
| GET | `.../categories` | Lista categorias do household. |
| GET | `.../members` | Lista membros do household. |

### Competências mensais

| Método | Rota | Descrição |
|---|---|---|
| GET | `.../periods` | Lista competências do household. |
| GET | `.../periods/:referenceMonth` | Busca uma competência por competência (`YYYY-MM-01`). 404 se não existir. |
| PUT | `.../periods/:referenceMonth` | Idempotente: 201 se cria (via `OpenMonthlyPeriodService`), 200 se já existe (nenhuma alteração). Corpo vazio — a identidade da competência vem inteira da URL. |
| POST | `.../periods/:referenceMonth/start-review` | `open` → `review`. |
| POST | `.../periods/:referenceMonth/reopen-from-review` | `review` → `open`. |
| POST | `.../periods/:referenceMonth/close` | `review` → `closed`. Corpo: `{ closedByUserId, closedAt }`. |
| POST | `.../periods/:referenceMonth/reopen` | `closed` → `review`. |

### Movimentações

| Método | Rota | Descrição |
|---|---|---|
| GET | `.../entries` | Lista movimentações do household. Aceita `?periodId=` opcional (filtra e ainda reforça o escopo por household). |
| GET | `.../entries/:entryId` | Busca por ID. 404 se não existir ou pertencer a outro household. |
| POST | `.../entries` | Cria (`CreateFinancialEntryService`). 201. |
| PUT | `.../entries/:entryId` | Atualiza campos permitidos (`UpdateFinancialEntryService`). 200. |
| POST | `.../entries/:entryId/mark-pending` | `planned` → `pending`. |
| POST | `.../entries/:entryId/realize` | `planned`/`pending` → `realized`. Corpo: `{ actualAmount, realizationDate }`. |
| POST | `.../entries/:entryId/cancel` | `planned`/`pending` → `cancelled`. |
| POST | `.../entries/:entryId/revert-realization` | `realized` → `pending` (estorno). |
| POST | `.../entries/:entryId/correct-to-planned` | `pending` → `planned` (correção). |
| POST | `.../entries/:entryId/reopen` | `cancelled` → `planned` (reativação). |

Todas as rotas reaproveitam os serviços de aplicação já existentes (`apps/api/src/application/services/`) — nenhuma regra de domínio é duplicada nos handlers HTTP.

## 5. Inputs

**Dinheiro:** sempre string decimal com exatamente duas casas (`"1000.00"`) — nunca `number` JSON (rejeitado pelo schema antes de chegar ao handler). Convertido com `parseMoney`/`formatMoney` (`@finanhouse/domain`), nunca `parseFloat`.

**Datas:** `YYYY-MM-DD` (`dueDate`, `realizationDate`, `closedAt`). **Competência:** `YYYY-MM-01` (sempre primeiro dia do mês, mesmo formato do domínio) — nunca outra semântica.

**Enums:** `entryType` (`income`/`expense`) validado contra `FINANCIAL_ENTRY_TYPES` do domínio — valor desconhecido é rejeitado (400).

**Texto:** `description` (1–255 caracteres), `notes` (opcional, até 500 caracteres) — `trim` aplicado pelo schema de string do JSON Schema (comprimento avaliado sobre o valor recebido).

**Corpo:** todo schema usa `additionalProperties: false` — campo desconhecido em qualquer corpo (incluindo `householdId` concorrente) é rejeitado com 400, não descartado silenciosamente.

Exemplo — `POST .../entries`:

```json
{
  "periodId": 1,
  "categoryId": 3,
  "responsibleMemberId": null,
  "createdByUserId": 10,
  "entryType": "expense",
  "description": "Aluguel",
  "expectedAmount": "1000.00",
  "dueDate": "2026-08-05",
  "notes": null
}
```

## 6. Outputs

Formato de sucesso:

```json
{ "data": { "...": "..." } }
```

DTOs nunca retornam entidades internas, linhas Drizzle ou objetos do driver — sempre um mapeador explícito (`apps/api/src/http/mappers/`). Dinheiro sai sempre como string decimal; datas no mesmo formato de entrada. **`responsible_member_household_id` (coluna auxiliar de persistência, DT-09/DT-10) nunca aparece em nenhum DTO.**

Exemplo — `FinancialEntryDto`:

```json
{
  "data": {
    "id": 42,
    "householdId": 10,
    "periodId": 1,
    "categoryId": 3,
    "responsibleMemberId": null,
    "createdByUserId": 10,
    "entryType": "expense",
    "status": "planned",
    "description": "Aluguel",
    "expectedAmount": "1000.00",
    "actualAmount": null,
    "dueDate": "2026-08-05",
    "realizationDate": null,
    "notes": null
  }
}
```

## 7. Formatos Esperados

`camelCase` em todos os campos (mesma convenção do domínio/repositórios). IDs: inteiros seguros para JavaScript (`Number.isSafeInteger`), nunca UUID. Datas: strings civis (`YYYY-MM-DD`), sem conversão de timezone.

## 8. Erros Esperados

Formato de erro:

```json
{ "error": { "code": "CODIGO_ESTAVEL", "message": "Mensagem segura" } }
```

| Código HTTP | Quando ocorre | `error.code` |
|---|---|---|
| 400 | Payload/parâmetro/query inválido (schema AJV) | `VALIDATION_ERROR` |
| 404 | Recurso não encontrado no household (`*NotFoundError` do domínio, ou verificação manual de `householdId`) | `NOT_FOUND` |
| 409 | Conflito de estado/escopo de domínio (`HouseholdMismatchError`, transição inválida, etc.) | `DOMAIN_CONFLICT` |
| 409 | Conflito de persistência (duplicidade, FK, escopo de household no banco) | `PERSISTENCE_CONFLICT` |
| 422 | Regra sintaticamente válida, rejeitada pelo domínio (valor monetário inválido, categoria inativa, etc.) | `DOMAIN_RULE_REJECTED` |
| 422 | Violação de `CHECK` no banco | `PERSISTENCE_RULE_REJECTED` |
| 503 | Conexão/dependência temporariamente indisponível | `DEPENDENCY_UNAVAILABLE` |
| 500 | Erro inesperado — sempre sanitizado, nunca stack trace/mensagem bruta | `INTERNAL_ERROR` |

Nunca retornado ao cliente: host, porta, usuário, senha, Service URI, query com valores sensíveis, configuração do pool, objeto bruto do mysql2, stack trace. Ver `Docs/03_contracts/contrato_banco_dados.md`, seção 9, para a tradução completa de `PersistenceError` (Bloco 14/DT-10) reaproveitada por este handler.

## 9. Validações

O backend é a única fonte de validação nesta etapa — não há frontend integrado ainda. Toda validação estrutural (tipos, formato, campos desconhecidos) acontece via JSON Schema (AJV, embutido no Fastify) antes do handler rodar; toda validação de regra de negócio acontece nos serviços de aplicação/domínio já existentes, nunca duplicada na camada HTTP.

## 10. Versionamento do Contrato

Prefixo `/api/v1` já reserva espaço para uma futura v2 caso uma mudança breaking seja necessária. Enquanto não houver consumidor real (frontend integrado), mudanças de contrato não exigem depreciação formal — apenas atualização deste documento.

## 11. Decisões Pendentes

- Integração do frontend com esta API — bloco futuro, fora do escopo do Bloco 16.
- Autenticação real — bloco futuro; até lá, a API só pode ser executada localmente, nunca exposta publicamente (ver seção 2).
- Endpoints de escrita para `users`/`households` — não existem porta/repositório para essas entidades (DT-10); fora do escopo até uma decisão arquitetural futura.
