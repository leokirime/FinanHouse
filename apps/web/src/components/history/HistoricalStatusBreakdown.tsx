import type { HistoryStatusCountsViewModel } from '../../view-models/history-view-model.ts'
import './History.css'

export interface HistoricalStatusBreakdownProps {
  counts: HistoryStatusCountsViewModel
}

export function HistoricalStatusBreakdown({ counts }: HistoricalStatusBreakdownProps) {
  return (
    <section className="fh-card fh-history-status-breakdown" aria-label="Quantidade de movimentações por status">
      <h3>Movimentações por status</h3>
      <dl>
        <div>
          <dt>Planejadas</dt>
          <dd>{counts.planned}</dd>
        </div>
        <div>
          <dt>Pendentes</dt>
          <dd>{counts.pending}</dd>
        </div>
        <div>
          <dt>Realizadas</dt>
          <dd>{counts.realized}</dd>
        </div>
        <div>
          <dt>Canceladas</dt>
          <dd>{counts.cancelled}</dd>
        </div>
      </dl>
    </section>
  )
}
