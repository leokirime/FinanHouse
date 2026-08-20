# Análise Funcional

> Projeto: FinanHouse · Atualizado em: 2026-08-19

## 1. Funcionalidades Analisadas

### Funcionalidade: Cadastro de parcelamento
- **Requisito relacionado:** RF-10 (`Docs/01_product/requisitos_funcionais.md`)
- **Comportamento esperado:** usuário informa descrição, categoria, valor total, número de parcelas, competência da primeira parcela (default: competência atual) e dia-base de vencimento (`dueDay`, opcional). O sistema gera N `financial_entries` (`status: 'planned'`), uma por competência sucessiva, com valor individual = valor total dividido por N (com absorção determinística do resto de arredondamento nas últimas parcelas — ver `02_analysis/analise_tecnica.md`), e data de vencimento resolvida para o último dia válido do mês quando `dueDay` não existir naquele mês.
- **Casos de borda considerados:** valor total não divisível exatamente por N (ex.: R$ 1.000/3 → ver seção 4 desta análise); competência futura ainda sem linha em `monthly_periods` (criada sob demanda, mesmo padrão idempotente de `PUT .../periods/:referenceMonth` já usado); `dueDay` 31 caindo em mês de 30 dias ou fevereiro (bissexto incluído); parcelamento com N=1 (deveria ser rejeitado — já existe criação de lançamento avulso para isso, sem passar pelo fluxo de parcelamento).
- **Dependência de outra funcionalidade:** RF-01 (movimentações), RF-02 (competências, incluindo criação idempotente), RF-09 (sessão/household).

### Funcionalidade: Operações individuais sobre uma parcela (status e exclusão)
- **Requisito relacionado:** RF-10, reaproveitando RF-01 (as regras de `realizeFinancialEntry`/`cancelFinancialEntry`/`assertFinancialEntryDeletable`/`UpdateFinancialEntryService` já existentes, sem duplicação).
- **Comportamento esperado:** cada parcela é uma `financial_entry` comum — todas as ações já existentes (marcar pendente, realizar, cancelar, excluir, editar campos permitidos) continuam funcionando individualmente por parcela, sem necessidade de nenhuma regra nova no domínio de movimentação. **Decisão de MVP (ver seção 4):** nenhuma dessas operações sobre uma parcela dispara recálculo/redistribuição automática nas demais parcelas do mesmo plano — o plano original permanece o contrato de referência.
- **Casos de borda considerados:** excluir uma parcela nunca afeta as demais, nunca renumera (`1/10`/`3/10` continuam com sua numeração mesmo que `2/10` seja excluída), nunca é feita em cascata a partir de uma exclusão do plano inteiro (não implementada nesta versão).
- **Dependência de outra funcionalidade:** DT-16 (regra de exclusão real, Bloco 20).

### Funcionalidade: Visualização do parcelamento nas telas existentes
- **Requisito relacionado:** RF-10, RF-06 (interface visual).
- **Comportamento esperado:** Dashboard/Movimentações/Planejamento/Comparativo/Histórico continuam funcionando exatamente como hoje, pois cada parcela é uma `financial_entry` real na sua competência — nenhuma tela precisa de uma lógica de cálculo nova. Apenas a exibição de "Sofá 3/10" (identificação da parcela dentro do plano) e, na tela de Movimentações, um indicador visual do plano de origem são funcionalidade nova de UI.
- **Casos de borda considerados:** o quanto de "consciência de parcelamento" cada tela precisa ter é uma decisão de escopo do Bloco 05/06 (frontend) — o Bloco 01 só garante que a base (cada parcela ser uma `financial_entry` real) não exige nenhuma mudança nos cálculos já existentes.
- **Dependência de outra funcionalidade:** RF-03 (indicadores), RF-04 (comparativo), RF-07 (planejamento), RF-08 (histórico) — todos já consomem `financial_entries` da fonte real, sem fallback.

## 2. Fluxos de Usuário Envolvidos

1. Usuário abre "Nova movimentação" (ou um fluxo de cadastro dedicado a parcelamento, a decidir no Bloco 05) → escolhe "Parcelado" → preenche valor total, categoria, número de parcelas, competência inicial, `dueDay` opcional → confirma → sistema gera as N parcelas de uma vez → usuário é redirecionado para Movimentações, vendo a parcela da competência atual na lista.
2. Usuário navega para uma competência futura (Histórico ou trocando o mês) → vê a parcela correspondente daquele parcelamento já presente, com status `planned`.
3. Usuário realiza a parcela do mês corrente (fluxo já existente de `RealizeEntryDialog`) → só aquela parcela muda de status; as demais continuam `planned`.
4. Usuário exclui uma parcela específica (fluxo já existente de `DeleteEntryDialog`, Bloco 20) → só aquela parcela é removida; nenhuma ação de "excluir o plano inteiro" é oferecida nesta primeira versão (decisão de MVP, seção 4).

## 3. Perguntas Orientadoras

- Esta funcionalidade já tem requisito formal? **Sim, registrado como RF-10 nesta sessão** (não existia antes).
- Existe comportamento ambíguo que precisa de decisão de produto antes da implementação? **Não mais** — todo comportamento ambíguo identificado foi resolvido nesta análise (seção 4) e em `01_intake/levantamento_inicial.md`, seção 3.

## 4. Decisões de MVP (fechadas nesta sessão, formalizadas pelo proprietário do projeto)

Estas decisões respondem definitivamente as perguntas que estavam em aberto em `01_intake/levantamento_inicial.md` — nenhuma delas fica pendente para o Bloco 02.

1. **`first_reference_month`:** coluna `DATE` independente em `installment_plans`, nunca FK para `monthly_periods` (competências futuras distantes podem não existir ainda como linha no momento da criação do plano). Cada `FinancialEntry` gerada mantém sua própria FK composta real para `period_id`.
2. **Parcelamento é imutável como contrato após criado.** Não é possível editar globalmente, nesta primeira versão: valor total, número de parcelas (`installmentCount`), categoria do plano, primeira competência, ou `dueDay`. Erro estrutural no cadastro exige uma operação futura explícita de correção/recriação — nunca redistribuição silenciosa. Renegociação (`10x` → `12x`, por exemplo) fica fora do MVP, registrada como backlog (`03_ideas/ideias_e_melhorias.md`, ID-02).
3. **Edição individual de uma parcela nunca redistribui as demais.** Cada parcela é uma `FinancialEntry` comum, sujeita às operações normais já existentes. Se um campo financeiro de uma parcela for editado, o efeito é local àquela parcela — nenhum recálculo automático das parcelas irmãs, o plano original continua representando o valor/parcelamento originalmente cadastrado.
4. **`installmentCount` é imutável após criação.** Um plano criado como 10x permanece 10x — não existe operação de "adicionar" ou "remover" parcelas de um plano já existente nesta versão.
5. **`dueDay` é um campo do plano (1–31), não de cada parcela.** Aplicado no momento da geração: se o dia não existir no mês da competência, a parcela recebe o último dia válido daquele mês (fevereiro/bissexto incluído). A `FinancialEntry` gerada sempre recebe uma data de vencimento já resolvida e válida — nunca uma data inválida é persistida. `dueDay` no plano representa apenas a regra de geração original.
6. **Exclusão de uma parcela individual:** usa exatamente a regra de exclusão real já existente (DT-16) — remove só aquela parcela, nunca em cascata, nunca renumera as demais, nunca altera `installmentCount`, nunca redistribui valor. Nenhum `ON DELETE CASCADE` é usado para isso.
7. **Exclusão do plano inteiro (todas as parcelas de uma vez) não é implementada nesta primeira versão.** Exigiria uma política própria sobre parcelas já realizadas, parcelas futuras e competências fechadas — registrada como evolução futura. O usuário manipula parcelas individualmente com as operações de `FinancialEntry` já existentes.
8. **`createdByUserId` é somente autoria/auditoria, nunca filtro de visibilidade** — mesma regra já vigente em todo o domínio financeiro (RF-09/DT-14): 2 usuários → 1 household → 1 carteira compartilhada → o mesmo parcelamento é visível e operável por ambos os membros.
