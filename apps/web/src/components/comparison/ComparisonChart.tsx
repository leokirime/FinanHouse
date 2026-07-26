import type { ComparisonChartMetricViewModel } from '../../view-models/comparison-view-model.ts'
import './Comparison.css'

export interface ComparisonChartProps {
  title: string
  summary: string
  metrics: ComparisonChartMetricViewModel[]
}

export function ComparisonChart({ title, summary, metrics }: ComparisonChartProps) {
  return (
    <section className="fh-card fh-comparison-section fh-comparison-chart" aria-labelledby="comparison-chart-title">
      <div className="fh-comparison-section__header">
        <div>
          <h2 id="comparison-chart-title">{title}</h2>
          <p className="fh-text-secondary">{summary}</p>
        </div>
      </div>
      <svg className="fh-comparison-chart__svg" viewBox="0 0 640 280" role="img" aria-label={summary}>
        <title>{title}</title>
        <desc>{summary}</desc>
        {metrics.map((metric, index) => {
          const y = 24 + index * 64
          return (
            <g key={metric.key}>
              <text x="0" y={y} className="fh-comparison-chart__label">
                {metric.label}
              </text>
              <rect x="190" y={y - 16} width={Math.max(metric.basePercent * 3.3, 0)} height="16" rx="4" className="fh-comparison-chart__bar-base" />
              <rect
                x="190"
                y={y + 8}
                width={Math.max(metric.comparedPercent * 3.3, 0)}
                height="16"
                rx="4"
                className="fh-comparison-chart__bar-compared"
              />
              <text x="535" y={y - 4} className="fh-comparison-chart__value">
                {metric.baseLabel}
              </text>
              <text x="535" y={y + 20} className="fh-comparison-chart__value">
                {metric.comparedLabel}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="fh-comparison-chart__legend" aria-label="Legenda do gráfico">
        <span>
          <i className="fh-comparison-chart__legend-base" aria-hidden="true" /> Base
        </span>
        <span>
          <i className="fh-comparison-chart__legend-compared" aria-hidden="true" /> Comparado
        </span>
      </div>
    </section>
  )
}
