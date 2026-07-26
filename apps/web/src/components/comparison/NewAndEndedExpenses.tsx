import type { ExpenseIdentityViewModel } from '../../view-models/comparison-view-model.ts'
import './Comparison.css'

export interface NewAndEndedExpensesProps {
  newExpenses: ExpenseIdentityViewModel[]
  endedExpenses: ExpenseIdentityViewModel[]
}

interface ExpenseListProps {
  title: string
  emptyText: string
  expenses: ExpenseIdentityViewModel[]
}

function ExpenseList({ title, emptyText, expenses }: ExpenseListProps) {
  return (
    <div className="fh-comparison-expense-list">
      <h3>{title}</h3>
      {expenses.length === 0 ? (
        <p className="fh-text-secondary">{emptyText}</p>
      ) : (
        <ul>
          {expenses.map((expense) => (
            <li key={`${expense.categoryId}-${expense.description}`}>
              <span>
                <strong>{expense.description}</strong>
                <small>{expense.categoryName}</small>
              </span>
              <span>{expense.amount.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function NewAndEndedExpenses({ newExpenses, endedExpenses }: NewAndEndedExpensesProps) {
  return (
    <section className="fh-card fh-comparison-section">
      <div className="fh-comparison-section__header">
        <div>
          <h2>Despesas novas e encerradas</h2>
          <p className="fh-text-secondary">Chave: tipo, categoria e descrição normalizada; a descrição exibida permanece original.</p>
        </div>
      </div>
      <div className="fh-comparison-expense-grid">
        <ExpenseList title="Despesas novas" emptyText="Nenhuma despesa nova neste recorte." expenses={newExpenses} />
        <ExpenseList title="Despesas encerradas" emptyText="Nenhuma despesa encerrada neste recorte." expenses={endedExpenses} />
      </div>
    </section>
  )
}
