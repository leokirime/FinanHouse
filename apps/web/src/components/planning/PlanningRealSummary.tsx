import type { PlanningRealSummaryViewModel } from '../../view-models/planning-view-model.ts'
import './Planning.css'

export interface PlanningRealSummaryProps {
  summary: PlanningRealSummaryViewModel
}

/** Resumo do Planejamento com movimentações reais (`planned`/`pending`/`realized`) — nunca limites por categoria (ainda sem persistência própria, ver DT-12). */
export function PlanningRealSummary({ summary }: PlanningRealSummaryProps) {
  return (
    <section className="fh-grid fh-planning-summary" aria-label="Resumo do planejamento">
      <article className="fh-card fh-planning-summary__card">
        <h3>Receita prevista</h3>
        <p className="fh-planning-summary__value">{summary.incomeProjected.label}</p>
        <p className="fh-text-secondary">
          Planejada {summary.incomePlanned.label} · Pendente {summary.incomePending.label}
        </p>
      </article>
      <article className="fh-card fh-planning-summary__card">
        <h3>Despesa prevista</h3>
        <p className="fh-planning-summary__value">{summary.expenseProjected.label}</p>
        <p className="fh-text-secondary">
          Realizada {summary.expenseRealized.label} · Pendente {summary.expensePending.label} · Planejada{' '}
          {summary.expensePlanned.label}
        </p>
      </article>
      <article className="fh-card fh-planning-summary__card">
        <h3>Saldo projetado</h3>
        <p className="fh-planning-summary__value">{summary.projectedBalance.label}</p>
        <p className="fh-text-secondary">Receita prevista menos despesa prevista da competência</p>
      </article>
    </section>
  )
}
