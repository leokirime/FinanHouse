# Levantamento Inicial

> Projeto: FinanHouse · Atualizado em: 2026-08-19

## 1. Contexto

Após o encerramento do Bloco 20 (Sessão 11 — exclusão de lançamentos e simplificação do header), o proprietário do projeto definiu a próxima grande funcionalidade: **parcelamentos e compromissos futuros**. Uma compra parcelada (ex.: sofá de R$ 3.000 em 10x) hoje só pode ser registrada como um único lançamento no valor total, distorcendo o mês em que é cadastrada — o Dashboard mostraria R$ 3.000 de despesa no mês da compra, quando na realidade apenas R$ 300/mês deveriam impactar cada competência.

`installment_plans` já era mencionado desde o Bloco 03 (`packages/domain`/`database/proposed-schema/extensoes-futuras.md`) como uma extensão futura conscientemente deixada fora da migration inicial — nunca modelada em código até este ponto.

## 2. Necessidades Levantadas

- Registrar uma compra parcelada uma única vez (descrição, valor total, categoria, número de parcelas) e gerar automaticamente uma movimentação real por parcela, cada uma na sua competência.
- Cada parcela deve compor os cálculos apenas da sua própria competência — nunca o valor total de uma vez.
- Cada parcela deve ter status independente (realizar a parcela 1 não afeta a 2).
- A soma exata das parcelas geradas precisa fechar com o valor total informado (sem perda/sobra por arredondamento).
- Parcelamentos pertencem ao household (carteira compartilhada), nunca a um usuário isoladamente — mesma regra já vigente para todo o resto do domínio financeiro (RF-09/DT-14).

## 3. Perguntas Respondidas

Todas as perguntas levantadas nesta etapa foram respondidas e fechadas como decisões de MVP para a Sessão 12, formalizadas pelo proprietário do projeto e detalhadas em `02_analysis/analise_funcional.md` (seção "Decisões de MVP") e `02_analysis/analise_arquitetural.md`. Nenhuma fica em aberto para o Bloco 02.

- **`installment_plans.first_reference_month` deve ser FK para `monthly_periods` ou data solta?** → **Respondida: coluna `DATE` independente, não FK.** Um parcelamento longo pode apontar para competências futuras ainda não materializadas como linha em `monthly_periods` no momento da criação do plano. Cada `FinancialEntry` efetivamente gerada continua vinculada ao seu `monthly_period` real via a FK composta já existente (`ensurePeriod` cria a competência sob demanda, mesmo padrão idempotente já usado pelo resto do domínio).
- **Uma parcela pode ser editada individualmente sem afetar as demais?** → **Respondida: sim, mas sem nenhuma redistribuição automática.** Cada parcela continua sendo uma `FinancialEntry` comum, com todas as operações normais de status (`planned`/`pending`/`realized`, estorno quando aplicável) já existentes e sem nenhuma regra nova. Se a infraestrutura atual permitir editar campos financeiros de uma parcela (ex.: `UpdateFinancialEntryService`), a edição afeta **somente** aquela `FinancialEntry` — nenhuma outra parcela é recalculada, o plano original continua representando o contrato originalmente cadastrado, e nenhum motor de renegociação é criado nesta sessão.
- **O que acontece com as parcelas futuras quando o plano é "excluído"?** → **Respondida: exclusão global do plano não é implementada nesta primeira versão.** Essa operação exigiria uma política própria sobre parcelas já realizadas, parcelas futuras e competências fechadas — fora do escopo do MVP. O usuário manipula parcelas individualmente, usando as operações de `FinancialEntry` já existentes (incluindo a exclusão real, DT-16). Excluir uma parcela remove só aquela parcela — nunca em cascata, nunca renumera as parcelas irmãs (`1/10` e `3/10` continuam `1/10` e `3/10` mesmo que `2/10` seja excluída, nunca vira `2/9`), nunca redistribui valor, nunca altera `installmentCount`. Nenhum `ON DELETE CASCADE` é introduzido para isso. Exclusão global de um plano é registrada como evolução futura (backlog).
- **Existe necessidade de editar `installmentCount` depois de criado?** → **Respondida: não, nesta primeira versão o plano é imutável como contrato.** Depois de criado, não é possível editar globalmente valor total, número de parcelas, categoria, primeira competência ou dia-base de vencimento (`10x` criado como `10x` continua `10x` — mudar para `12x` é renegociação, fora do MVP). Erro estrutural no cadastro exige uma operação explícita futura de correção/recriação, nunca redistribuição silenciosa. Renegociação registrada como backlog futuro (`03_ideas/ideias_e_melhorias.md`, ID-02).
- **`due_day` é um campo do plano ou de cada parcela?** → **Respondida: campo do plano (`dueDay`, 1–31).** Aplicado no momento da geração de cada parcela: se o dia não existir no mês daquela competência (ex.: 31 em abril), usa-se o último dia válido do mês (fevereiro incluído, considerando ano bissexto). A `FinancialEntry` gerada recebe sempre uma data de vencimento já resolvida e válida — nunca uma data inválida é persistida. `dueDay` no plano representa apenas a regra de geração original, não é reaplicado depois.

Decisão adicional, confirmada nesta etapa (não era uma pergunta em aberto, mas merece registro formal): **`createdByUserId` é somente autoria/auditoria, nunca filtro de visibilidade** — 2 usuários → 1 household → 1 carteira compartilhada → o mesmo parcelamento é visível e operável por ambos os membros, mesma regra já vigente para todo o domínio financeiro (RF-09/DT-14).

## 4. Fontes Consultadas

- `packages/domain/src/financial-entry/financial-entry.ts`, `financial-entry-rules.ts` (modelo e regras atuais de movimentação).
- `packages/domain/src/monthly-period/monthly-period.ts` (formato de competência `YYYY-MM-01`).
- `packages/domain/src/money/money.ts` (abstração monetária em centavos, `bigint`).
- `apps/api/src/db/schema/financial-entries.ts`, `category-budgets.ts` (padrão de schema Drizzle, FKs compostas por household).
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-15/DT-16 — lição sobre geração de id via `AUTO_INCREMENT` nativo, nunca `nextId()` calculado em código).
- `database/proposed-schema/extensoes-futuras.md` (menção original a `installment_plans`, Bloco 03).
- `Docs/03_contracts/contrato_api_http.md`, `contrato_frontend_backend.md` (padrão de rotas/DTOs a seguir).

## 5. Primeiras Hipóteses de Escopo

Entra nesta Sessão (12): domínio de parcelamento (geração de parcelas, arredondamento, avanço de competência), persistência (`installment_plans` + colunas novas em `financial_entries`), serviços de aplicação, rotas HTTP, cadastro/visualização no frontend, integração com Dashboard/Planejamento/Comparativo/Histórico.

Fica fora: recorrências genéricas (assinaturas sem valor total fixo — `recurrence_rules`, outra extensão futura distinta), edição de parcelamento já criado além do escopo básico (a definir no Bloco 01), qualquer alteração de infraestrutura de produção/deploy.

## 6. Decisões Pendentes

Nenhuma decisão de produto pendente — todas as perguntas da seção 3 foram respondidas nesta etapa. A única pendência remanescente (estratégia de compensação para falha parcial na geração em lote, RS-01) é técnica, não de produto, e pertence formalmente ao Bloco 04 (ver `02_analysis/analise_riscos.md`) — não bloqueia o encerramento deste Bloco 01 nem o início do Bloco 02.
