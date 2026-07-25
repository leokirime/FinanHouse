# Extensões Futuras

Estruturas conscientemente deixadas fora da migration inicial (`0000_initial_financial_domain.sql`) para manter o Bloco 03 pequeno e coerente. Nenhuma delas foi modelada em código ainda.

## recurrence_rules

Regras de recorrência para movimentações que se repetem (assinaturas, salário, aluguel). Precisará decidir: recorrência gera `financial_entries` futuras antecipadamente ou sob demanda; como tratar edição/cancelamento de uma ocorrência específica de uma série.

## installment_plans

Parcelamentos (compras parceladas). Precisará relacionar um plano a múltiplas `financial_entries` (uma por parcela) e decidir como valores parciais pagos afetam o plano como um todo.

## category_budgets

Orçamento/limite planejado por categoria e competência mensal. Depende de `categories` e `monthly_periods` já existirem (ambas já modeladas nesta fundação).

## period_status_history

Histórico de transições de status de `monthly_periods` (quem reabriu, quando, por quê). Hoje `monthly_periods` só guarda o estado atual (`status`, `closed_at`, `closed_by_user_id`), sem histórico de mudanças.

## Fora do domínio financeiro (blocos próprios)

- Sessões de autenticação, tokens, recuperação de senha.
- Logs de auditoria completos (além dos `created_at`/`updated_at` já presentes em cada tabela).
