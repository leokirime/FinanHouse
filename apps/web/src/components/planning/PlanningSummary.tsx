import type { PlanningSummaryViewModel } from '../../view-models/planning-view-model.ts'
import './Planning.css'

export interface PlanningSummaryProps {
  summary: PlanningSummaryViewModel
}

export function PlanningSummary({ summary }: PlanningSummaryProps) {
  return (
    <section className="fh-grid fh-planning-summary" aria-label="Resumo do planejamento">
      <article className="fh-card fh-planning-summary__card">
        <h3>Limite total</h3>
        <p className="fh-planning-summary__value">{summary.totalLimit.label}</p>
        <p className="fh-text-secondary">Soma dos limites definidos nesta competência</p>
      </article>
      <article className="fh-card fh-planning-summary__card">
        <h3>Projetado</h3>
        <p className="fh-planning-summary__value">{summary.totalProjected.label}</p>
        <p className="fh-text-secondary">
          Realizado {summary.totalRealized.label} · Pendente {summary.totalPending.label} · Planejado{' '}
          {summary.totalPlanned.label}
        </p>
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
            <dt>Sem planejamento</dt>
            <dd>{summary.unplannedCount}</dd>
          </div>
        </dl>
      </article>
    </section>
  )
}
