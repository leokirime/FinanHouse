import type { EvolutionPointViewModel } from '../../view-models/dashboard-view-model.ts'
import { formatMoneyPtBr } from '../../utils/format-money-pt-br.ts'
import './FinancialEvolutionChart.css'

export interface FinancialEvolutionChartProps {
  points: EvolutionPointViewModel[]
}

const WIDTH = 600
const HEIGHT = 220
const PADDING = 32

export function FinancialEvolutionChart({ points }: FinancialEvolutionChartProps) {
  const maxValue = points.reduce((max, point) => Math.max(max, Number(point.income), Number(point.expense)), 0)
  // Evita divisão por zero (e, por consequência, NaN/Infinity no path do SVG).
  const safeMax = maxValue > 0 ? maxValue : 1
  const stepX = points.length > 1 ? (WIDTH - PADDING * 2) / (points.length - 1) : 0

  const toY = (value: bigint) => {
    const ratio = Number(value) / safeMax
    return HEIGHT - PADDING - ratio * (HEIGHT - PADDING * 2)
  }

  const toPath = (pick: (point: EvolutionPointViewModel) => bigint) =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${PADDING + index * stepX} ${toY(pick(point))}`).join(' ')

  const incomePath = toPath((point) => point.income)
  const expensePath = toPath((point) => point.expense)

  const textSummary = points
    .map((point) => `${point.monthLabel}: receita ${formatMoneyPtBr(point.income)}, despesa ${formatMoneyPtBr(point.expense)}`)
    .join('; ')

  return (
    <section className="fh-card fh-evolution-chart" aria-labelledby="evolution-heading">
      <div className="fh-evolution-chart__header">
        <h3 id="evolution-heading">Evolução financeira</h3>
        <ul className="fh-evolution-chart__legend">
          <li>
            <span className="fh-evolution-chart__dot" data-tone="income" aria-hidden="true" /> Receita realizada
          </li>
          <li>
            <span className="fh-evolution-chart__dot" data-tone="expense" aria-hidden="true" /> Despesa realizada
          </li>
        </ul>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="fh-evolution-chart__svg" aria-hidden="true">
        <path d={incomePath} className="fh-evolution-chart__line" data-tone="income" />
        <path d={expensePath} className="fh-evolution-chart__line" data-tone="expense" />
        {points.map((point, index) => (
          <g key={point.periodId}>
            <circle cx={PADDING + index * stepX} cy={toY(point.income)} r={3} className="fh-evolution-chart__point" data-tone="income" />
            <circle cx={PADDING + index * stepX} cy={toY(point.expense)} r={3} className="fh-evolution-chart__point" data-tone="expense" />
            <text x={PADDING + index * stepX} y={HEIGHT - 8} textAnchor="middle" className="fh-evolution-chart__label">
              {point.monthLabel}
            </text>
          </g>
        ))}
      </svg>

      <p className="fh-visually-hidden">Resumo por competência: {textSummary}.</p>
    </section>
  )
}
