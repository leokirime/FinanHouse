import type { HistorySummaryViewModel } from '../../view-models/history-view-model.ts'
import './History.css'

export interface HistoricalPeriodSummaryProps {
  summary: HistorySummaryViewModel
}

export function HistoricalPeriodSummary({ summary }: HistoricalPeriodSummaryProps) {
  return (
    <section className="fh-grid fh-history-summary" aria-label="Resumo financeiro da competência selecionada">
      <article className="fh-card fh-history-summary__card">
        <h3>Receitas realizadas</h3>
        <p className="fh-history-summary__value">{summary.realizedIncome.label}</p>
      </article>
      <article className="fh-card fh-history-summary__card">
        <h3>Despesas realizadas</h3>
        <p className="fh-history-summary__value">{summary.realizedExpense.label}</p>
      </article>
      <article className="fh-card fh-history-summary__card">
        <h3>Saldo realizado</h3>
        <p className="fh-history-summary__value">{summary.realizedBalance.label}</p>
      </article>
      <article className="fh-card fh-history-summary__card">
        <h3>Fechamento projetado</h3>
        <p className="fh-history-summary__value">{summary.projectedBalance.label}</p>
      </article>
    </section>
  )
}
