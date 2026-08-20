# Análise Técnica

> Projeto: FinanHouse · Atualizado em: 2026-08-19

> Esta análise é sobre como construir o que a análise funcional descreveu — não duplique a descrição do comportamento, foque na viabilidade e abordagem técnica.

## 1. Aspectos Técnicos

### Aspecto: Divisão monetária sem perda de centavos
- **Abordagem proposta (decisão de MVP formalizada pelo proprietário do projeto):** nova função `splitMoney(total: Money, parts: number): Money[]` em `packages/domain/src/money/money.ts`. Valor-base = divisão inteira em `bigint` (`base = total / BigInt(parts)`). As primeiras `parts - 1` parcelas recebem exatamente `base`; **a última parcela absorve deterministicamente todo o restante** (`total - base * (parts - 1)`, equivalente a `base + (total % BigInt(parts))`) — nunca aleatório, nunca distribuído entre múltiplas parcelas. Ex.: R$ 1.000,00 (100000 centavos) em 3x → `[33333, 33333, 33334]` → soma exata 100000. Invariante testável: `sumMoney(splitMoney(total, n)) === total` para qualquer `total`/`n` positivos, e `splitMoney(total, n).slice(0, -1).every(v => v === splitMoney(total, n)[0])` (todas as parcelas exceto a última são idênticas ao valor-base).
- **Alternativas consideradas:** distribuir o resto de 1 centavo entre as últimas N parcelas quando o resto for maior que 1 centavo (rejeitado — o proprietário do projeto definiu explicitamente que só a última parcela absorve qualquer diferença, por mais simples e previsível: o usuário sempre vê N-1 parcelas idênticas e uma última ligeiramente diferente, nunca várias parcelas "quase iguais" com centavos espalhados); distribuir o resto na primeira parcela (rejeitado — menos intuitivo, contraria o exemplo do enunciado "333,33 / 333,33 / 333,34"); usar `number`/float (rejeitado — mesmo motivo já documentado em `money.ts`, perda de precisão).
- **Complexidade estimada:** Baixa.
- **Depende de:** `Money`/`bigint` já existente — nenhuma dependência nova.

### Aspecto: Avanço de competência (mês a mês) no domínio
- **Abordagem proposta:** nova função `addMonthsToReferenceMonth(referenceMonth: string, months: number): string` em `packages/domain/src/monthly-period/` (ou módulo novo `installment/`), operando sobre a string `YYYY-MM-01` diretamente por **aritmética de ano/mês** (`(mês - 1 + months) % 12`, com transporte de ano via divisão inteira) — nunca somando uma quantidade fixa de dias a uma `Date` (que quebraria em meses de tamanhos diferentes) e sem depender de fuso horário (mesmo cuidado já registrado em `apps/web/src/utils/reference-month.ts` sobre `Date` local vs. UTC — aqui o cálculo é determinístico por operar sobre ano/mês diretamente, nunca sobre timestamp). Usada para gerar as N competências sucessivas de um plano — ex.: primeira parcela em `2026-08-01`, 10 parcelas → `2026-08`, `2026-09`, `2026-10`, `2026-11`, `2026-12`, `2027-01`, `2027-02`, `2027-03`, `2027-04`, `2027-05` (última em maio/2027).
- **Alternativas consideradas:** reaproveitar `apps/web/src/utils/reference-month.ts` diretamente — rejeitado porque é código do frontend (`apps/web`), não deve ser importado pela API; a regra de avanço de competência é domínio puro e pertence a `@finanhouse/domain`, consumível por API e frontend igualmente. Somar dias fixos (ex.: `+30 dias`) — rejeitado, quebra em meses de 28/29/31 dias.
- **Testes obrigatórios no Bloco 02:** virada dezembro → janeiro (mudança de ano); competência em fevereiro (incluindo ano bissexto, ex. 2028); plano de 12 parcelas (exatamente uma volta de calendário); plano de 24 parcelas (duas voltas); plano cuja primeira parcela já começa em dezembro.
- **Complexidade estimada:** Baixa.
- **Depende de:** nenhuma.

### Aspecto: Vencimento em dia inválido para o mês (ex.: dia 31 em mês de 30 dias)
- **Abordagem proposta (decisão de MVP):** `dueDay` (1–31) é um campo do `InstallmentPlan`, não de cada parcela — representa apenas a regra de geração original. Ao gerar cada parcela, a data de vencimento é resolvida como `min(dueDay, último dia do mês daquela competência)` — mesmo comportamento de calendário já usado implicitamente por `assertValidDate` (`financial-entry-rules.ts`), que já valida dias de calendário reais via `Date.UTC` (bissexto incluído). A `FinancialEntry` gerada recebe sempre essa data já resolvida e válida — nunca uma data inválida é persistida, e `dueDay` não é reconsultado depois (o plano é imutável, ver `analise_funcional.md`, seção 4).
- **Alternativas consideradas:** rejeitar parcelamentos com `dueDay` > 28 (rejeitado — comportamento surpreendente e desnecessariamente restritivo para o caso comum de contas com vencimento no fim do mês); vencimento independente por parcela (rejeitado — decisão de MVP fixou `dueDay` como campo único do plano, mais simples e suficiente para o caso de uso).
- **Complexidade estimada:** Baixa.
- **Depende de:** nenhuma.

### Aspecto: Geração em lote de N `financial_entries` + N `ensurePeriod` numa única operação
- **Abordagem proposta:** `CreateInstallmentPlanService` (aplicação) itera as N competências geradas, chama o equivalente de `OpenMonthlyPeriodService`/`ensurePeriod` (idempotente — já existe) para cada uma, cria o `InstallmentPlan` via repositório (`insertId`), e cria as N `financial_entries` via `FinancialEntryRepository.save()` já existente (sem duplicar lógica de criação — usa `createFinancialEntry` do domínio para cada parcela, com `installmentPlanId`/`installmentNumber` adicionados ao resultado). Não é uma transação de banco (a camada de aplicação atual não expõe transação entre repositórios — mesma limitação já aceita pelo resto do domínio); falha no meio da geração é um risco a resolver explicitamente no Bloco 04 (ver `02_analysis/analise_riscos.md`).
- **Alternativas consideradas:** gerar as parcelas sob demanda (lazy, só quando a competência é visitada) — rejeitado, contraria o requisito explícito do usuário ("cada parcela deve ser uma movimentação financeira real da sua competência" já no momento do cadastro, não uma projeção calculada depois).
- **Complexidade estimada:** Média (por causa do risco de falha parcial, não da lógica em si).
- **Depende de:** `ensurePeriod`/`OpenMonthlyPeriodService`, `CreateFinancialEntryService` (reaproveitados, não recriados).

## 2. Componentes/Módulos Afetados

- `packages/domain/src/money/money.ts` (+ `installment/` novo módulo de domínio).
- `apps/api/src/db/schema/` (nova tabela `installment-plans.ts`; duas colunas novas em `financial-entries.ts`).
- `apps/api/src/application/ports/`, `apps/api/src/application/services/`, `apps/api/src/infrastructure/repositories/` (novo repositório + serviço, mesmo padrão dos existentes).
- `apps/api/src/http/routes/` (nova rota `installment-plans.ts`).
- `apps/web/src/api/financial-api.ts`, `apps/web/src/state/` (nova ação/estado), `apps/web/src/components/financial-entries/` (novo formulário/indicador).

## 3. Novas Dependências Necessárias

Nenhuma. Toda a construção usa exclusivamente infraestrutura já presente no projeto (Drizzle, Fastify, `@finanhouse/domain`, React) — sem nova biblioteca.

## 4. Perguntas Orientadoras

- **Esta abordagem é a mais simples que resolve o problema, ou já antecipa necessidades hipotéticas?** É a mais simples identificada — evita deliberadamente antecipar recorrência genérica (`recurrence_rules`, funcionalidade distinta) ou edição/renegociação de plano após criado (decisão de MVP fechada: plano imutável — ver `analise_funcional.md`, seção 4).
- **Alguma parte exige spike antes de comprometer o plano de blocos?** Não — todos os aspectos acima são extensões diretas de padrões já validados no projeto (divisão monetária seguindo o mesmo raciocínio de `parseMoney`/`formatMoney`; avanço de competência é aritmética simples; geração em lote reaproveita serviços existentes). O único ponto que merece decisão explícita antes do Bloco 04 é o tratamento de falha parcial na geração em lote (ver riscos).

## 5. Decisões Pendentes

Nenhuma decisão técnica de domínio/produto fica pendente para o Bloco 02 — todas fechadas nesta sessão (seção 1 acima e `analise_funcional.md`, seção 4). A única pendência remanescente é técnica e pertence ao Bloco 04: tratamento de falha parcial na geração em lote (parcela 6 de 10 falha por algum motivo — as 5 já criadas ficam? há necessidade de uma limpeza/rollback manual, já que não há transação cross-repository?), registrada como RS-01 em `02_analysis/analise_riscos.md`. Não bloqueia o início do Bloco 02.

## 6. Modelo Conceitual Final

```text
InstallmentPlan
├── id                    bigint, PK, AUTO_INCREMENT (insertId nativo — não nextId())
├── householdId           bigint, FK → households
├── description           string
├── categoryId            bigint, FK composta → categories (mesmo household)
├── totalAmount            Money (centavos)
├── installmentCount        int (>= 2)
├── firstReferenceMonth      DATE (YYYY-MM-01) — NÃO é FK para monthly_periods (ver analise_arquitetural.md)
├── dueDay                 int | null (1–31) — regra de geração, não reconsultada depois
├── createdByUserId          bigint, FK → users — SOMENTE auditoria, nunca filtro de visibilidade
└── createdAt               timestamp

FinancialEntry (já existente, duas colunas novas)
├── ...todos os campos já existentes, inalterados...
├── installmentPlanId       bigint | null, FK → installment_plans (nullable — maioria dos lançamentos não é parcelada)
└── installmentNumber        int | null (1..installmentCount) — nullable pelo mesmo motivo
```

**Decisão sobre duplicar `installmentCount`/`totalAmount` em `FinancialEntry`:** não duplicar. `installmentNumber` sozinho (ex.: `3`) já é suficiente para a UI renderizar "3/10" fazendo um `JOIN`/consulta ao `InstallmentPlan` pelo `installmentPlanId` (mesmo padrão já usado para `categoryName` via `categoryId`, nunca desnormalizado em `FinancialEntry`). Evita o risco de inconsistência (uma parcela apontando `installmentCount: 10` enquanto o plano registra outro valor, situação que nunca deveria existir dado que o plano é imutável, mas que uma coluna duplicada tornaria fisicamente possível). O DTO HTTP de uma `FinancialEntry` parcelada pode, na fronteira de API, opcionalmente compor os dois campos (`installmentNumber` + `installmentCount` do plano relacionado) na resposta — decisão de formato de DTO a tomar no Bloco 04, sem exigir coluna redundante no banco.

## 7. Invariantes do Domínio para o Bloco 02

O Bloco 02 (domínio) deve implementar e testar, no mínimo, as seguintes invariantes:

1. `installmentCount >= 2` para um parcelamento (N=1 não é parcelamento — usa o fluxo de lançamento avulso já existente).
2. `totalAmount > 0` (mesma regra de `assertPositiveMoney` já existente).
3. `dueDay`, quando informado, está entre 1 e 31.
4. A primeira competência (`firstReferenceMonth`) está em formato válido (`YYYY-MM-01`).
5. Exatamente N parcelas são geradas para um plano de N parcelas — nunca N-1, nunca N+1.
6. As parcelas têm números sequenciais `1..N`, sem lacuna e sem repetição.
7. A soma das N parcelas geradas é exatamente igual a `totalAmount` (`sumMoney(...) === totalAmount`) — nunca perde nem sobra centavo.
8. As competências das parcelas avançam exatamente um mês entre uma parcela e a seguinte (nunca pulam nem repetem mês).
9. As datas de vencimento geradas são sempre datas de calendário válidas (nunca "31 de abril", nunca "30 de fevereiro").
10. Todas as parcelas geradas por um plano pertencem ao mesmo `householdId` do plano.
11. Todas as parcelas geradas por um plano têm o mesmo `installmentPlanId`.
12. O status inicial de cada parcela gerada é sempre `planned`.
13. Cada parcela pode mudar de status independentemente das demais (nenhuma transição em uma parcela é bloqueada ou automaticamente disparada pelo status de outra parcela do mesmo plano).
14. `createdByUserId` nunca é usado como filtro de visibilidade em nenhuma consulta — só metadado de auditoria.
15. Nenhuma alteração (edição, transição de status, exclusão) de uma parcela individual recalcula ou redistribui automaticamente valores/datas das demais parcelas do mesmo plano.

Estas invariantes são a definição de pronto dos testes do Bloco 02 — nenhum código de geração de parcelas é considerado completo sem cobertura para cada uma delas.
