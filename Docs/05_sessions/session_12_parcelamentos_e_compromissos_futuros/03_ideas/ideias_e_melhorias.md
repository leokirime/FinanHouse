# Ideias e Melhorias

> Projeto: FinanHouse · Atualizado em: 2026-08-19

> Capture aqui ideias que surgem durante a sessão mas não fazem parte do escopo atual. Isso evita tanto perder a ideia quanto expandir o escopo da sessão silenciosamente.

## 1. Ideias Propostas

| ID | Ideia | Origem | Prioridade sugerida |
|---|---|---|---|
| ID-01 | Recorrências genéricas (assinaturas sem valor total fixo — `recurrence_rules`) | Mencionada como extensão futura desde o Bloco 03, distinta de parcelamento | P3 |
| ID-02 | Editar um parcelamento já criado (renegociar número de parcelas, valor) | Surgiu ao mapear perguntas abertas nesta sessão | P3 |
| ID-03 | Corrigir a dívida técnica de geração de id (`nextId()`) nas três tabelas antigas (`financial_entries`, `monthly_periods`, `category_budgets`), já registrada como P2 em DT-15 | Relembrada ao decidir não repetir o padrão em `installment_plans` | P2 (já registrada, não desta sessão) |

## 2. Detalhamento

### ID-01 — Recorrências genéricas
- **Descrição:** movimentações que se repetem indefinidamente (salário, aluguel, assinaturas), sem um número fixo de ocorrências nem valor total — diferente de parcelamento, que tem início, fim e soma fixa conhecidos.
- **Por que não está no escopo desta sessão:** o pedido explícito do proprietário foi parcelamento (compra parcelada com valor total e N parcelas conhecidos) — recorrência é um modelo de dados e de regras diferente (não há "valor total" a dividir).
- **Onde poderia ser endereçada:** Nova sessão futura, dedicada.

### ID-02 — Editar parcelamento já criado
- **Descrição:** hoje o plano assumido é: parcelamento criado uma vez, parcelas editáveis individualmente pelas operações já existentes (marcar pendente, realizar, cancelar, excluir), mas o plano em si (`installmentCount`, valor total) não é editável depois de criado.
- **Por que não está no escopo desta sessão:** não foi pedido; adicionar editabilidade do plano aumenta a superfície de casos de borda (o que acontece com parcelas já realizadas se o número de parcelas mudar?) sem necessidade comprovada ainda.
- **Onde poderia ser endereçada:** Bloco futuro dentro desta mesma sessão, se o proprietário confirmar a necessidade durante a validação do Bloco 05/06; caso contrário, backlog geral.

### ID-03 — Dívida técnica de geração de id (DT-15)
- **Descrição:** ver `Docs/02_architecture/decisoes_tecnicas.md`, DT-15, seção "Dívida técnica formal (P2) registrada".
- **Por que não está no escopo desta sessão:** já é uma dívida conhecida e registrada, sobre tabelas que não fazem parte de parcelamento — corrigi-la aqui expandiria o escopo desta sessão sem necessidade (esta sessão só evita *repetir* o mesmo erro na tabela nova).
- **Onde poderia ser endereçada:** bloco futuro dedicado, já sugerido no próprio DT-15 desde o Bloco 19.

## 3. Perguntas Orientadoras

- Nenhuma destas ideias resolve um problema já observado nesta sessão — todas são especulativas/adiadas deliberadamente.
- ID-01 e ID-02 poderiam virar requisitos formais no futuro, mas não agora — mantidas como ideia até haver pedido explícito.

## 4. Decisões Pendentes

Nenhuma — todas as três ideias estão deliberadamente fora do escopo desta sessão, sem necessidade de decisão adicional agora.
