import type { CategoryComparisonViewModel } from '../../view-models/comparison-view-model.ts'
import './Comparison.css'

export interface CategoryComparisonProps {
  rows: CategoryComparisonViewModel[]
  biggestIncrease: CategoryComparisonViewModel | null
  biggestReduction: CategoryComparisonViewModel | null
}

function highlightText(label: string, row: CategoryComparisonViewModel | null): string {
  if (!row) return `${label}: sem variação relevante`
  return `${label}: ${row.categoryName} (${row.change.absoluteLabel})`
}

export function CategoryComparison({ rows, biggestIncrease, biggestReduction }: CategoryComparisonProps) {
  return (
    <section className="fh-card fh-comparison-section fh-comparison-category">
      <div className="fh-comparison-section__header">
        <div>
          <h2>Comparação por categoria</h2>
          <p className="fh-text-secondary">Somente despesas, ordenadas pela maior variação absoluta.</p>
        </div>
      </div>
      <div className="fh-comparison-category__highlights" aria-label="Destaques por categoria">
        <span className="fh-badge">{highlightText('Maior aumento', biggestIncrease)}</span>
        <span className="fh-badge">{highlightText('Maior redução', biggestReduction)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="fh-text-secondary">Nenhuma despesa não cancelada nos períodos selecionados.</p>
      ) : (
        <div className="fh-comparison-table-wrap">
          <table className="fh-comparison-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Base</th>
                <th>Comparado</th>
                <th>Variação</th>
                <th>Direção</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.categoryId}>
                  <th scope="row">{row.categoryName}</th>
                  <td>{row.base.label}</td>
                  <td>{row.compared.label}</td>
                  <td>
                    {row.change.absoluteLabel} · {row.change.percentLabel}
                  </td>
                  <td>{row.change.directionLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
