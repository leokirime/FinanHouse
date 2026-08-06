# Contrato da API HTTP

> Projeto: FinanHouse · Atualizado em: 2026-08-04

> Este contrato descreve a API HTTP implementada a partir do Bloco 16 (DT-11), estendida nos Blocos 17 (movimentações reais no frontend), 18 (limites mensais por categoria, DT-13) e 19 (autenticação real e sessão, DT-14). É a fonte da verdade da superfície HTTP da API — mudar uma rota, um formato de erro ou uma regra de validação sem atualizar este documento é uma quebra de contrato, mesmo que o código "funcione". Não confundir com `Docs/03_contracts/contrato_frontend_backend.md` (Bloco 17 em diante — como o frontend consome esta API, sem repetir o wire format) nem com `Docs/03_contracts/contrato_autenticacao.md` (fluxo completo de login/sessão, Bloco 19).

## 1. Objetivo

Definir sem ambiguidade as rotas, formatos de entrada/saída, códigos HTTP e regras de segurança da API HTTP financeira local (`apps/api/src/http/`).

## 2. Estado Atual

**Execução exclusivamente local.** Desde o Bloco 19 (DT-14) toda rota financeira exige sessão real (cookie `HttpOnly`, ver seção 4 e `contrato_autenticacao.md`), mas isso não é suficiente para produção por si só — `createHttpApp` continua recusando `runtimeMode: 'production'`, o bootstrap (`http/server.ts`) só faz bind em `127.0.0.1` (nunca `0.0.0.0`, nunca configurável) e o CORS aceita apenas `http://127.0.0.1:5173`/`http://localhost:5173` (nunca wildcard, mesmo com `Access-Control-Allow-Credentials: true`). **Esta API nunca deve ser apresentada como pronta para exposição pública** enquanto essas condições não mudarem. Desde o Bloco 17 o frontend real (`apps/web`) consome esta API diretamente, sem modo demonstrativo (DT-12, `Docs/03_contracts/contrato_frontend_backend.md`); o Bloco 18 estendeu essa integração aos limites mensais por categoria (`.../budgets`, DT-13); o Bloco 19 adicionou login/sessão real.

## 3. Prefixo e Escopo

Todas as rotas financeiras usam o prefixo:

```
/api/v1/households/:householdId
```

`householdId` é a fonte de escopo de toda operação — deve ser um inteiro positivo, seguro para JavaScript (`Number.isSafeInteger`), sem coerção silenciosa (rejeitado se zero, negativo, decimal ou texto arbitrário). Nenhum corpo de requisição pode conter `householdId` — o schema rejeita como campo desconhecido (`additionalProperties: false`, com `removeAdditional: false` explicitamente configurado no AJV do Fastify — o padrão do framework removeria o campo silenciosamente em vez de rejeitar, ver DT-11).

Um recurso pertencente a outro household nunca é retornado nem alterado: sempre `404` (recurso não encontrado no household) ou `409` (conflito de escopo detectado pelo domínio, ex.: período/categoria/membro referenciado pertence a outro household). Desde o Bloco 19 (DT-14), o `householdId` da URL também precisa corresponder ao `householdId` da sessão autenticada — divergência também é `404`, nunca `401`/`403` (indistinguível de um household inexistente, ver seção 8 do `contrato_autenticacao.md`).

## 4. Endpoints

### Infraestrutura

| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| GET | `/health` | Confirma que o processo HTTP está ativo — nunca consulta o banco. | Não |
| GET | `/ready` | Confirma disponibilidade real (config, pool, conexão, TLS) via dependência injetada — nunca abre conexão em testes. | Não |

### Autenticação (Bloco 19, DT-14)

| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Autentica por e-mail/senha; em sucesso, define o cookie de sessão `HttpOnly`. Sem cadastro público — só usuários já existentes. Rate limit: 10 tentativas/5 min por IP. | Não |
| GET | `/api/v1/auth/session` | Devolve o usuário e o household da sessão atual (401 se ausente/expirada/revogada). Usada pelo frontend para saber se já há sessão válida ao carregar. | Sim |
| POST | `/api/v1/auth/logout` | Revoga a sessão e limpa o cookie. Idempotente — chamar sem sessão nunca lança. | Não (idempotente mesmo sem cookie) |

Todas as demais rotas abaixo (`/api/v1/households/:householdId/...`) exigem sessão válida — 401 `UNAUTHENTICATED` se ausente/expirada/revogada, 404 se o `householdId` da URL divergir do da sessão. Ver detalhes completos do fluxo em `Docs/03_contracts/contrato_autenticacao.md`.

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
| POST | `.../periods/:referenceMonth/close` | `review` → `closed`. Corpo: `{ closedAt }` — `closedByUserId` não faz parte do corpo desde o Bloco 19 (DT-14), vem da sessão autenticada. |
| POST | `.../periods/:referenceMonth/reopen` | `closed` → `review`. |

### Movimentações

| Método | Rota | Descrição |
|---|---|---|
| GET | `.../entries` | Lista movimentações do household. Aceita `?periodId=` opcional (filtra e ainda reforça o escopo por household). |
| GET | `.../entries/:entryId` | Busca por ID. 404 se não existir ou pertencer a outro household. |
| POST | `.../entries` | Cria (`CreateFinancialEntryService`). 201. `createdByUserId` não faz parte do corpo desde o Bloco 19 (DT-14), vem da sessão autenticada. |
| PUT | `.../entries/:entryId` | Atualiza campos permitidos (`UpdateFinancialEntryService`). 200. |
| POST | `.../entries/:entryId/mark-pending` | `planned` → `pending`. |
| POST | `.../entries/:entryId/realize` | `planned`/`pending` → `realized`. Corpo: `{ actualAmount, realizationDate }`. |
| POST | `.../entries/:entryId/cancel` | `planned`/`pending` → `cancelled`. |
| POST | `.../entries/:entryId/revert-realization` | `realized` → `pending` (estorno). |
| POST | `.../entries/:entryId/correct-to-planned` | `pending` → `planned` (correção). |
| POST | `.../entries/:entryId/reopen` | `cancelled` → `planned` (reativação). |

### Limites mensais por categoria (Bloco 18, DT-13)

| Método | Rota | Descrição |
|---|---|---|
| GET | `.../periods/:referenceMonth/budgets` | Lista os limites definidos para a competência (`YYYY-MM-01`). 404 se a competência não existir. |
| PUT | `.../periods/:referenceMonth/budgets/:categoryId` | Idempotente: 201 se cria (`PutCategoryBudgetService`), 200 se já existe (atualiza `limitAmount`). Corpo: `{ limitAmount }`. |
| DELETE | `.../periods/:referenceMonth/budgets/:categoryId` | Remove o limite da categoria nessa competência. 204. 404 se não existir. |

Regras de domínio reaproveitadas sem duplicação: categoria precisa ser `expense`/`active` (senão 422, `CategoryEntryTypeMismatchError`/`InactiveCategoryError`); competência `closed` bloqueia criação/edição/remoção (422, mesma regra de `assertPeriodAllowsBudgetChanges` usada por movimentações); categoria ou competência de outro household nunca é 404 — sempre 409 `DOMAIN_CONFLICT` (seção 3, mesmo padrão de `financial_entries`). Limite mensal e movimentações (`planned`/`pending`/`realized`) são independentes — remover ou nunca definir um limite não afeta o registro de movimentações da categoria.

Todas as rotas reaproveitam os serviços de aplicação já existentes (`apps/api/src/application/services/`) — nenhuma regra de domínio é duplicada nos handlers HTTP.

## 5. Inputs

**Dinheiro:** sempre string decimal com exatamente duas casas (`"1000.00"`) — nunca `number` JSON (rejeitado pelo schema antes de chegar ao handler). Convertido com `parseMoney`/`formatMoney` (`@finanhouse/domain`), nunca `parseFloat`.

**Datas:** `YYYY-MM-DD` (`dueDate`, `realizationDate`, `closedAt`). **Competência:** `YYYY-MM-01` (sempre primeiro dia do mês, mesmo formato do domínio) — nunca outra semântica.

**Enums:** `entryType` (`income`/`expense`) validado contra `FINANCIAL_ENTRY_TYPES` do domínio — valor desconhecido é rejeitado (400).

**Texto:** `description` (1–255 caracteres), `notes` (opcional, até 500 caracteres) — `trim` aplicado pelo schema de string do JSON Schema (comprimento avaliado sobre o valor recebido).

**Corpo:** todo schema usa `additionalProperties: false` — campo desconhecido em qualquer corpo (incluindo `householdId` concorrente) é rejeitado com 400, não descartado silenciosamente.

Exemplo — `POST .../entries` (`createdByUserId` nunca faz parte do corpo — vem da sessão, DT-14):

```json
{
  "periodId": 1,
  "categoryId": 3,
  "responsibleMemberId": null,
  "entryType": "expense",
  "description": "Aluguel",
  "expectedAmount": "1000.00",
  "dueDate": "2026-08-05",
  "notes": null
}
```

Exemplo — `PUT .../periods/:referenceMonth/budgets/:categoryId`:

```json
{ "limitAmount": "2000.00" }
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

Exemplo — `CategoryBudgetDto` (`GET`/`PUT .../budgets`):

```json
{
  "data": {
    "id": 5,
    "householdId": 10,
    "periodId": 1,
    "categoryId": 3,
    "limitAmount": "2000.00"
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
| 401 | Sessão ausente/expirada/revogada, ou credenciais de login inválidas (Bloco 19, DT-14) — mensagem sempre genérica | `UNAUTHENTICATED` |
| 404 | Recurso não encontrado no household (`*NotFoundError` do domínio, verificação manual de `householdId`, ou `householdId` da URL divergente do da sessão) | `NOT_FOUND` |
| 409 | Conflito de estado/escopo de domínio (`HouseholdMismatchError`, transição inválida, etc.) | `DOMAIN_CONFLICT` |
| 409 | Conflito de persistência (duplicidade, FK, escopo de household no banco) | `PERSISTENCE_CONFLICT` |
| 422 | Regra sintaticamente válida, rejeitada pelo domínio (valor monetário inválido, categoria inativa, etc.) | `DOMAIN_RULE_REJECTED` |
| 422 | Violação de `CHECK` no banco | `PERSISTENCE_RULE_REJECTED` |
| 429 | Muitas tentativas de login na mesma janela (`@fastify/rate-limit`) | `RATE_LIMITED` |
| 503 | Conexão/dependência temporariamente indisponível | `DEPENDENCY_UNAVAILABLE` |
| 500 | Erro inesperado — sempre sanitizado, nunca stack trace/mensagem bruta | `INTERNAL_ERROR` |

Nunca retornado ao cliente: host, porta, usuário, senha, Service URI, query com valores sensíveis, configuração do pool, objeto bruto do mysql2, stack trace. Ver `Docs/03_contracts/contrato_banco_dados.md`, seção 9, para a tradução completa de `PersistenceError` (Bloco 14/DT-10) reaproveitada por este handler.

## 9. Validações

O backend é a única fonte de validação nesta etapa — não há frontend integrado ainda. Toda validação estrutural (tipos, formato, campos desconhecidos) acontece via JSON Schema (AJV, embutido no Fastify) antes do handler rodar; toda validação de regra de negócio acontece nos serviços de aplicação/domínio já existentes, nunca duplicada na camada HTTP.

## 10. Versionamento do Contrato

Prefixo `/api/v1` já reserva espaço para uma futura v2 caso uma mudança breaking seja necessária. Enquanto não houver consumidor real (frontend integrado), mudanças de contrato não exigem depreciação formal — apenas atualização deste documento.

## 11. Decisões Pendentes

- Autenticação real — bloco futuro; até lá, a API só pode ser executada localmente, nunca exposta publicamente (ver seção 2).
- Endpoints de escrita para `users`/`households` — não existem porta/repositório para essas entidades (DT-10); fora do escopo até uma decisão arquitetural futura.
