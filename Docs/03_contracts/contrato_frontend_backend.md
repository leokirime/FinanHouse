# Contrato Frontend-Backend

> Projeto: HouseManager · Atualizado em: 2026-08-25

> Este contrato é a fonte da verdade da interface entre frontend e backend. Mudar um endpoint sem atualizar este documento é uma quebra de contrato, mesmo que o código "funcione". Para o formato exato de rotas/DTOs/erros, ver `Docs/03_contracts/contrato_api_http.md` (Bloco 16) — este documento cobre especificamente como o **frontend** (`apps/web`, Bloco 17) consome essa API, não repete o wire format.

## 1. Objetivo

Definir, sem ambiguidade, como o frontend real (`apps/web/src/api/**`, `FinanceProvider`) consome a API HTTP financeira (`apps/api/src/http/**`) — desde o Bloco 17, o corte é direto, sem modo demonstrativo (DT-12).

## 2. Responsabilidade

O backend garante o contrato descrito em `contrato_api_http.md` (formato `{ data }`/`{ error }`, validação estrutural via AJV, isolamento por household). O frontend:

- Nunca duplica validação de regra de negócio — confia no backend como única fonte de verdade (seção 9 de `contrato_api_http.md`).
- Nunca envia `householdId` no corpo — o escopo vem inteiro da sessão autenticada (`GET /api/v1/auth/session`, `AuthProvider`); desde o Bloco 19 (DT-14) não há mais `VITE_FINANHOUSE_HOUSEHOLD_ID` no frontend.
- Nunca cai para dados fictícios quando a API falha — sempre um estado de erro explícito (`FinanceStatusScreen`, DT-12).
- Nunca guarda senha ou token de sessão — o cookie `HttpOnly` é gerido inteiramente pelo navegador (`fetch(..., { credentials: 'include' })`), nunca `localStorage`/`sessionStorage` (DT-14).

## 3. Endpoints

Consumidos pelo frontend (subconjunto de `contrato_api_http.md`, seção 4):

| Método | Rota | Uso no frontend |
|---|---|---|
| POST | `.../auth/login` | `AuthProvider.login()` (`LoginPage`) |
| GET | `.../auth/session` | Carga inicial de `AuthProvider` — decide entre tela de login e o resto do app |
| POST | `.../auth/logout` | `AuthProvider.logout()` (botão "Sair" em `DashboardHeader`) |
| GET | `.../categories` | Carga inicial (`FinanceProvider`, só monta depois de autenticado) |
| GET | `.../members` | Carga inicial |
| GET | `.../periods` | Carga inicial |
| PUT | `.../periods/:referenceMonth` | Cria a competência civil atual quando ainda não existe (idempotente) |
| GET | `.../entries` | Carga inicial e recarga após toda mutação |
| POST/PUT/POST transições | `.../entries/**` | `dispatch()` do `FinanceProvider` (criar, editar, marcar pendente, realizar, reativar, estornar) — `createdByUserId` nunca é enviado, vem da sessão (DT-14) |
| DELETE | `.../entries/:entryId` | **Bloco 20** — `deleteEntry()`/ação `DELETE_ENTRY` do `FinanceProvider`, disparada por `DeleteEntryDialog` após confirmação explícita. Substitui `POST .../cancel` como ação destrutiva iniciada pela interface — o endpoint `/cancel` continua existindo no backend (histórico/reativação), mas nenhum componente do frontend o chama mais. |
| GET | `.../periods/:referenceMonth/budgets` | Carga dos limites por categoria da competência selecionada (`usePeriodBudgets`, hook dedicado a `PlanningPage` — fora de `FinanceProvider`) |
| PUT | `.../periods/:referenceMonth/budgets/:categoryId` | `createOrUpdate()` de `usePeriodBudgets` — define/edita um limite (idempotente) |
| DELETE | `.../periods/:referenceMonth/budgets/:categoryId` | `remove()` de `usePeriodBudgets` — remove um limite |
| GET | `.../installment-plans` | Carga da lista de parcelamentos (`useInstallmentPlans`, hook dedicado a `InstallmentPlansPage` — fora de `FinanceProvider`, mesmo padrão de `usePeriodBudgets`) |
| GET | `.../installment-plans/:installmentPlanId` | Detalhe de um plano selecionado na lista (`useInstallmentPlanDetail`) — busca de novo a cada troca de plano |
| POST | `.../installment-plans` | `create()` de `useInstallmentPlans` — cria o plano e todas as parcelas atomicamente (Sessão 12, Bloco 04/05); `createdByUserId`/`householdId` nunca são enviados |

Autenticação: sessão real por cookie `HttpOnly` desde o Bloco 19 (DT-14) — ver `Docs/03_contracts/contrato_autenticacao.md`. `AppRoot.tsx` nunca monta `FinanceProvider` antes de `AuthProvider` confirmar `status: 'authenticated'`.

## 4. Inputs

Formato idêntico ao descrito em `contrato_api_http.md`, seção 5 (dinheiro como string decimal via `moneyToDto`/`formatMoney`, datas `YYYY-MM-DD`). O frontend nunca constrói o corpo manualmente fora de `apps/web/src/api/financial-api.ts`.

**Entrada monetária do usuário (Sessão 12, Bloco 05):** o formulário de parcelamentos (`InstallmentPlanForm`) é o único ponto do frontend que aceita dinheiro digitado em formato de exibição pt-BR (vírgula decimal, ponto de milhar opcional — ex.: `"3000,00"`, `"3.000,00"`) em vez do formato canônico do contrato. `parseMoneyPtBr` (`apps/web/src/utils/format-money-pt-br.ts`) normaliza o texto para a string decimal canônica (`"3000.00"`) antes de `parseMoney` — nunca `Number`/`parseFloat` como fonte de verdade, nenhuma aritmética de ponto flutuante envolvida. O contrato HTTP em si não muda: o corpo do `POST` sempre envia `totalAmount` no formato `"3000.00"` (seção 5 de `contrato_api_http.md`), como qualquer outro valor monetário desta API. Os demais formulários do frontend (`FinancialEntryForm`, `RealizeEntryDialog`, `BudgetFormDialog`) continuam aceitando o valor já em formato canônico (`parseMoney` direto) — normalizar essa entrada para pt-BR em todo o app é uma melhoria futura, fora do escopo deste bloco.

## 5. Outputs

DTOs (`apps/web/src/api/financial-api.types.ts`) são convertidos para os tipos de domínio (`Category`, `HouseholdMember`, `MonthlyPeriod`, `FinancialEntry`) em `financial-api.mappers.ts` antes de chegar a qualquer componente — nenhum componente lê um DTO bruto.

## 6. Formatos Esperados

`camelCase`, IDs inteiros, datas civis `YYYY-MM-DD` — igual ao backend (`contrato_api_http.md`, seção 7). Dinheiro sempre `Money`/`bigint` (centavos) no lado do frontend depois do mapeamento, nunca `number`.

## 7. Regras Obrigatórias

- [x] Nenhum fallback demonstrativo em runtime quando a API falha, está indisponível ou demora (DT-12).
- [x] Toda mutação aguarda a resposta HTTP antes de confirmar sucesso na UI.
- [x] Após mutação aprovada, a lista de movimentações é recarregada da API (nunca um espelho local otimista).
- [x] `householdId` nunca hardcoded no código-fonte nem presumido como `1` — vem exclusivamente da sessão autenticada.
- [x] `FinanceProvider`/`usePeriodBudgets` nunca montam antes de `AuthProvider` chegar a `status: 'authenticated'` (Bloco 19, DT-14).
- [x] Um 401 vindo de qualquer chamada autenticada (sessão expirada/revogada em uso) chama `notifyUnauthenticated()` — o app volta para a tela de login, nunca mostra um erro genérico de dados.

## 8. Erros Esperados

O frontend traduz `error.code` (`contrato_api_http.md`, seção 8) em `ApiError.kind` (`apps/web/src/api/api-errors.ts`) e exibe a mensagem já sanitizada do servidor. Categorias adicionais, específicas do cliente:

| `ApiError.kind` | Quando ocorre | UI |
|---|---|---|
| `network` | `fetch` falha (API fora do ar) | `FinanceStatusScreen` — "API indisponível", botão "Tentar novamente" |
| `timeout` | Sem resposta em 10s | `FinanceStatusScreen`/`actionError` — "demorou para responder" |
| `cancelled` | Requisição cancelada (unmount, nova carga) | Silencioso — nunca vira erro visível |
| `config` | `VITE_API_BASE_URL` ausente/inválida | `FinanceStatusScreen` — "Configuração ausente" |
| `unauthenticated` | Sessão ausente/expirada/revogada, ou login com credenciais inválidas | `LoginPage` (mensagem genérica) ou `notifyUnauthenticated()` → volta para o login |
| `rate_limited` | Muitas tentativas de login na mesma janela | `LoginPage` — "Muitas tentativas" |

## 9. Validações

O backend é a única fonte de validação de regra de negócio (herdado de `contrato_api_http.md`, seção 9). O frontend só valida formato local antes de enviar (ex.: `parseMoney` rejeitando texto não numérico) para dar feedback imediato — o backend sempre valida de novo e vence em caso de divergência.

## 10. Versionamento do Contrato

Segue `contrato_api_http.md`, seção 10 (`/api/v1`). Enquanto o frontend for o único consumidor real, mudanças de contrato exigem atualizar `apps/web/src/api/**` na mesma alteração, sem depreciação formal.

## 11. Decisões Pendentes

- Recuperação de senha, MFA, permissões granulares por papel — fora de escopo do Bloco 19 (DT-14), ver `Docs/03_contracts/contrato_autenticacao.md`, seção 12.
