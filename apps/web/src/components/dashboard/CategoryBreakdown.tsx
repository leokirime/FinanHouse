import type { CategoryBreakdownItemViewModel } from '../../view-models/dashboard-view-model.ts'
import './CategoryBreakdown.css'

export interface CategoryBreakdownProps {
  items: CategoryBreakdownItemViewModel[]
}

export function CategoryBreakdown({ items }: CategoryBreakdownProps) {
  return (
    <section className="fh-card fh-category-breakdown" aria-labelledby="category-breakdown-heading">
      <h3 id="category-breakdown-heading">Distribuição de despesas</h3>
      <ul>
        {items.map((item) => (
          <li key={item.categoryId} className="fh-category-breakdown__row">
            <div className="fh-category-breakdown__label">
              <span>{item.name}</span>
              <span className="fh-text-secondary">
                {item.amountLabel} · {item.percent.toLocaleString('pt-BR')}%
              </span>
            </div>
            <div className="fh-category-breakdown__track">
              <div className="fh-category-breakdown__bar" style={{ width: `${Math.min(item.percent, 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
