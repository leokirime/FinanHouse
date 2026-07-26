import type { PlanningChartViewModel } from '../../view-models/planning-view-model.ts'
import './Planning.css'

export interface PlanningChartProps {
  chart: PlanningChartViewModel
}

export function PlanningChart({ chart }: PlanningChartProps) {
  return (
    <section className="fh-card fh-planning-section fh-planning-chart" aria-labelledby="planning-chart-title">
      <div className="fh-planning-section__header">
        <div>
          <h2 id="planning-chart-title">{chart.title}</h2>
          <p className="fh-text-secondary">{chart.summary}</p>
        </div>
        <div className="fh-planning-chart__legend" aria-label="Legenda do gráfico">
          <span>
            <i className="fh-planning-chart__legend-dot" data-tone="healthy" aria-hidden="true" /> Saudável
          </span>
          <span>
            <i className="fh-planning-chart__legend-dot" data-tone="attention" aria-hidden="true" /> Em atenção
          </span>
          <span>
            <i className="fh-planning-chart__legend-dot" data-tone="exceeded" aria-hidden="true" /> Excedido
          </span>
        </div>
      </div>

      {chart.bars.length === 0 ? (
        <p className="fh-text-secondary">Nenhuma categoria com limite definido para visualizar.</p>
      ) : (
        <svg className="fh-planning-chart__svg" viewBox="0 0 640 240" role="img" aria-label={chart.summary}>
          <title>{chart.title}</title>
          <desc>{chart.summary}</desc>
          {chart.bars.map((bar, index) => {
            const y = 20 + index * 48
            const trackWidth = 420
            const barWidth = Math.max(Math.min(bar.projectedPercent, 100) * (trackWidth / 100), 2)
            return (
              <g key={bar.categoryId}>
                <text x="0" y={y + 12} className="fh-planning-chart__label">
                  {bar.categoryName}
                </text>
                <rect x="170" y={y} width={trackWidth} height="16" rx="4" className="fh-planning-chart__track" />
                <rect x="170" y={y} width={barWidth} height="16" rx="4" className="fh-planning-chart__bar" data-tone={bar.status} />
                <text x="600" y={y + 12} textAnchor="end" className="fh-planning-chart__value">
                  {bar.projectedPercent}%
                </text>
              </g>
            )
          })}
        </svg>
      )}

      <p className="fh-visually-hidden">{chart.summary}</p>
    </section>
  )
}
