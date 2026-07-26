import type { PlannedVsRealizedPeriodViewModel } from '../../view-models/comparison-view-model.ts'
import './Comparison.css'

export interface PlannedVsRealizedProps {
  periods: PlannedVsRealizedPeriodViewModel[]
}

export function PlannedVsRealized({ periods }: PlannedVsRealizedProps) {
  return (
    <section className="fh-card fh-comparison-section">
      <div className="fh-comparison-section__header">
        <div>
          <h2>Previsto versus realizado</h2>
          <p className="fh-text-secondary">Canceladas ficam fora dos totais; pendentes e planejadas compõem a projeção.</p>
        </div>
      </div>
      <div className="fh-comparison-planned-grid">
        {periods.map((period) => (
          <article key={period.periodId} className="fh-comparison-planned">
            <h3>{period.label}</h3>
            <dl>
              <div>
                <dt>Receitas previstas</dt>
                <dd>{period.expectedIncome.label}</dd>
              </div>
              <div>
                <dt>Receitas realizadas</dt>
                <dd>{period.realizedIncome.label}</dd>
              </div>
              <div>
                <dt>Diferença de receita</dt>
                <dd>
                  {period.incomeDifference.absoluteLabel} · {period.incomeDifference.percentLabel}
                </dd>
              </div>
              <div>
                <dt>Despesas previstas</dt>
                <dd>{period.expectedExpense.label}</dd>
              </div>
              <div>
                <dt>Despesas realizadas</dt>
                <dd>{period.realizedExpense.label}</dd>
              </div>
              <div>
                <dt>Diferença de despesa</dt>
                <dd>
                  {period.expenseDifference.absoluteLabel} · {period.expenseDifference.percentLabel}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}
