import type { CategoryBudgetRowViewModel } from '../../view-models/planning-view-model.ts'
import './Planning.css'

export interface CategoryDistributionListProps {
  rows: CategoryBudgetRowViewModel[]
}

/**
 * Distribuição de despesas previstas por categoria, calculada a partir de
 * movimentações reais — nunca de limites por categoria (`CategoryBudget`
 * ainda não tem persistência própria, ver DT-12). Substitui a antiga
 * `CategoryBudgetList` (que editava/removia limites).
 */
export function CategoryDistributionList({ rows }: CategoryDistributionListProps) {
  if (rows.length === 0) {
    return (
      <section className="fh-card fh-planning-list">
        <h2>Despesas previstas por categoria</h2>
        <p className="fh-text-secondary">Nenhuma despesa planejada, pendente ou realizada nesta competência.</p>
      </section>
    )
  }

  return (
    <section className="fh-card fh-planning-list" aria-labelledby="planning-distribution-heading">
      <h2 id="planning-distribution-heading">Despesas previstas por categoria</h2>
      <p className="fh-text-secondary">
        Limites por categoria serão adicionados em uma próxima evolução — esta tabela mostra apenas a soma das movimentações reais.
      </p>
      <div className="fh-planning-table-wrap">
        <table className="fh-planning-table">
          <thead>
            <tr>
              <th scope="col">Categoria</th>
              <th scope="col">Realizado</th>
              <th scope="col">Pendente</th>
              <th scope="col">Planejado</th>
              <th scope="col">Total previsto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.categoryId}>
                <th scope="row" data-label="Categoria">
                  {row.categoryName}
                </th>
                <td data-label="Realizado">{row.realized.label}</td>
                <td data-label="Pendente">{row.pending.label}</td>
                <td data-label="Planejado">{row.planned.label}</td>
                <td data-label="Total previsto">{row.projected.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
