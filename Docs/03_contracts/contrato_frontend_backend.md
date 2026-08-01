# Contrato Frontend-Backend

> Projeto: FinanHouse · Atualizado em: 2026-08-01

> Este contrato é a fonte da verdade da interface entre frontend e backend. Mudar um endpoint sem atualizar este documento é uma quebra de contrato, mesmo que o código "funcione". Para o formato exato de rotas/DTOs/erros, ver `Docs/03_contracts/contrato_api_http.md` (Bloco 16) — este documento cobre especificamente como o **frontend** (`apps/web`, Bloco 17) consome essa API, não repete o wire format.

## 1. Objetivo

Definir, sem ambiguidade, como o frontend real (`apps/web/src/api/**`, `FinanceProvider`) consome a API HTTP financeira (`apps/api/src/http/**`) — desde o Bloco 17, o corte é direto, sem modo demonstrativo (DT-12).

## 2. Responsabilidade

O backend garante o contrato descrito em `contrato_api_http.md` (formato `{ data }`/`{ error }`, validação estrutural via AJV, isolamento por household). O frontend:

- Nunca duplica validação de regra de negócio — confia no backend como única fonte de verdade (seção 9 de `contrato_api_http.md`).
- Nunca envia `householdId` no corpo — o escopo vem inteiro de `VITE_FINANHOUSE_HOUSEHOLD_ID` (config local, `apps/web/api/api-config.ts`).
- Nunca cai para dados fictícios quando a API falha — sempre um estado de erro explícito (`FinanceStatusScreen`, DT-12).

## 3. Endpoints

Consumidos pelo frontend (subconjunto de `contrato_api_http.md`, seção 4):

| Método | Rota | Uso no frontend |
|---|---|---|
| GET | `.../categories` | Carga inicial (`FinanceProvider`) |
| GET | `.../members` | Carga inicial; resolve `createdByUserId` (membro `owner`) |
| GET | `.../periods` | Carga inicial |
| PUT | `.../periods/:referenceMonth` | Cria a competência civil atual quando ainda não existe (idempotente) |
| GET | `.../entries` | Carga inicial e recarga após toda mutação |
| POST/PUT/POST transições | `.../entries/**` | `dispatch()` do `FinanceProvider` (criar, editar, marcar pendente, realizar, cancelar, reativar, estornar) |

Autenticação: nenhuma (herdado do Bloco 16 — API local, sem produção).

## 4. Inputs

Formato idêntico ao descrito em `contrato_api_http.md`, seção 5 (dinheiro como string decimal via `moneyToDto`/`formatMoney`, datas `YYYY-MM-DD`). O frontend nunca constrói o corpo manualmente fora de `apps/web/src/api/financial-api.ts`.

## 5. Outputs

DTOs (`apps/web/src/api/financial-api.types.ts`) são convertidos para os tipos de domínio (`Category`, `HouseholdMember`, `MonthlyPeriod`, `FinancialEntry`) em `financial-api.mappers.ts` antes de chegar a qualquer componente — nenhum componente lê um DTO bruto.

## 6. Formatos Esperados

`camelCase`, IDs inteiros, datas civis `YYYY-MM-DD` — igual ao backend (`contrato_api_http.md`, seção 7). Dinheiro sempre `Money`/`bigint` (centavos) no lado do frontend depois do mapeamento, nunca `number`.

## 7. Regras Obrigatórias

- [x] Nenhum fallback demonstrativo em runtime quando a API falha, está indisponível ou demora (DT-12).
- [x] Toda mutação aguarda a resposta HTTP antes de confirmar sucesso na UI.
- [x] Após mutação aprovada, a lista de movimentações é recarregada da API (nunca um espelho local otimista).
- [x] `householdId` nunca hardcoded no código-fonte nem presumido como `1`.

## 8. Erros Esperados

O frontend traduz `error.code` (`contrato_api_http.md`, seção 8) em `ApiError.kind` (`apps/web/src/api/api-errors.ts`) e exibe a mensagem já sanitizada do servidor. Categorias adicionais, específicas do cliente:

| `ApiError.kind` | Quando ocorre | UI |
|---|---|---|
| `network` | `fetch` falha (API fora do ar) | `FinanceStatusScreen` — "API indisponível", botão "Tentar novamente" |
| `timeout` | Sem resposta em 10s | `FinanceStatusScreen`/`actionError` — "demorou para responder" |
| `cancelled` | Requisição cancelada (unmount, nova carga) | Silencioso — nunca vira erro visível |
| `config` | `VITE_API_BASE_URL`/`VITE_FINANHOUSE_HOUSEHOLD_ID` ausentes/ inválidas | `FinanceStatusScreen` — "Configuração ausente" |

## 9. Validações

O backend é a única fonte de validação de regra de negócio (herdado de `contrato_api_http.md`, seção 9). O frontend só valida formato local antes de enviar (ex.: `parseMoney` rejeitando texto não numérico) para dar feedback imediato — o backend sempre valida de novo e vence em caso de divergência.

## 10. Versionamento do Contrato

Segue `contrato_api_http.md`, seção 10 (`/api/v1`). Enquanto o frontend for o único consumidor real, mudanças de contrato exigem atualizar `apps/web/src/api/**` na mesma alteração, sem depreciação formal.

## 11. Decisões Pendentes

- Autenticação real — bloco futuro; o frontend hoje resolve `createdByUserId` como o primeiro membro `role: 'owner'` do household, não um usuário autenticado (DT-12).
- Limites por categoria (orçamento) — sem endpoint; Planejamento usa apenas movimentações reais (`planned`/`pending`) até uma decisão arquitetural própria.
