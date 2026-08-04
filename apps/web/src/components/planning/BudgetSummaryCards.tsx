import type { PlanningSummaryViewModel } from '../../view-models/planning-view-model.ts'
import './Planning.css'

export interface BudgetSummaryCardsProps {
  summary: PlanningSummaryViewModel
}

/** Resumo dos limites mensais por categoria (Bloco 18, DT-13) — `summary` vem de `buildPlanningViewModel` alimentado com os limites reais da API. */
export function BudgetSummaryCards({ summary }: BudgetSummaryCardsProps) {
  return (
    <section className="fh-grid fh-planning-summary" aria-label="Resumo dos limites por categoria">
      <article className="fh-card fh-planning-summary__card">
        <h3>Limite total</h3>
        <p className="fh-planning-summary__value">{summary.totalLimit.label}</p>
        <p className="fh-text-secondary">Soma dos limites definidos nesta competência</p>
      </article>
      <article className="fh-card fh-planning-summary__card">
        <h3>Saldo dentro dos limites</h3>
        <p className="fh-planning-summary__value">{summary.totalRemaining.label}</p>
        <p className="fh-text-secondary">Limite total menos o projetado (pode ser negativo)</p>
      </article>
      <article className="fh-card fh-planning-summary__card">
        <h3>Total excedido</h3>
        <p className="fh-planning-summary__value">{summary.totalExceeded.label}</p>
        <p className="fh-text-secondary">Soma do que ultrapassou o limite, por categoria</p>
      </article>
      <article className="fh-card fh-planning-summary__card fh-planning-summary__card--status">
        <h3>Categorias por status</h3>
        <dl>
          <div>
            <dt>Saudáveis</dt>
            <dd>{summary.healthyCount}</dd>
          </div>
          <div>
            <dt>Em atenção</dt>
            <dd>{summary.attentionCount}</dd>
          </div>
          <div>
            <dt>Excedidas</dt>
            <dd>{summary.exceededCount}</dd>
          </div>
          <div>
            <dt>Sem limite</dt>
            <dd>{summary.unplannedCount}</dd>
          </div>
        </dl>
      </article>
    </section>
  )
}
