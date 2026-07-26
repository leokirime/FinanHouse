import { useFinanceDemo } from '../../hooks/use-finance-demo.ts'
import type { CategoryBudgetRowViewModel } from '../../view-models/planning-view-model.ts'
import { BudgetProgress } from './BudgetProgress.tsx'
import './Planning.css'

export interface CategoryBudgetListProps {
  rows: CategoryBudgetRowViewModel[]
  onEditLimit: (row: CategoryBudgetRowViewModel) => void
  onDefineLimit: (row: CategoryBudgetRowViewModel) => void
}

export function CategoryBudgetList({ rows, onEditLimit, onDefineLimit }: CategoryBudgetListProps) {
  const { state, dispatch } = useFinanceDemo()

  if (rows.length === 0) {
    return (
      <section className="fh-card fh-planning-list">
        <h2>Limites por categoria</h2>
        <p className="fh-text-secondary">Nenhuma categoria com limite definido ou despesa nesta competência.</p>
      </section>
    )
  }

  return (
    <section className="fh-card fh-planning-list" aria-labelledby="planning-list-heading">
      <h2 id="planning-list-heading">Limites por categoria</h2>
      <div className="fh-planning-table-wrap">
        <table className="fh-planning-table">
          <thead>
            <tr>
              <th scope="col">Categoria</th>
              <th scope="col">Limite</th>
              <th scope="col">Realizado</th>
              <th scope="col">Pendente</th>
              <th scope="col">Planejado</th>
              <th scope="col">Projetado</th>
              <th scope="col">Consumo</th>
              <th scope="col">Status</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.categoryId}>
                <th scope="row" data-label="Categoria">
                  {row.categoryName}
                </th>
                <td data-label="Limite">{row.limit?.label ?? 'Sem limite'}</td>
                <td data-label="Realizado">{row.realized.label}</td>
                <td data-label="Pendente">{row.pending.label}</td>
                <td data-label="Planejado">{row.planned.label}</td>
                <td data-label="Projetado">{row.projected.label}</td>
                <td data-label="Consumo">
                  <BudgetProgress status={row.status} percentConsumed={row.percentConsumed} />
                  <span className="fh-text-secondary">{row.percentLabel}</span>
                </td>
                <td data-label="Status">
                  <span className="fh-badge" data-tone={row.status}>
                    {row.statusLabel}
                  </span>
                </td>
                <td data-label="Ações">
                  <div className="fh-planning-list__actions">
                    {row.hasLimit && row.budgetId !== null ? (
                      <>
                        <button type="button" onClick={() => onEditLimit(row)}>
                          Editar limite
                        </button>
                        <button type="button" onClick={() => dispatch({ type: 'REMOVE_CATEGORY_BUDGET', id: row.budgetId! })}>
                          Remover limite
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => onDefineLimit(row)}>
                        Definir limite
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {state.actionError && (
        <p className="fh-entry-form__error" role="alert">
          {state.actionError}
        </p>
      )}
    </section>
  )
}
