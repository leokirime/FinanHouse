import type { RecentEntryViewModel } from '../../view-models/dashboard-view-model.ts'
import './RecentEntries.css'

export interface RecentEntriesProps {
  entries: RecentEntryViewModel[]
}

export function RecentEntries({ entries }: RecentEntriesProps) {
  return (
    <section className="fh-card fh-recent-entries" aria-labelledby="recent-entries-heading">
      <h3 id="recent-entries-heading">Movimentações recentes</h3>
      <table className="fh-recent-entries__table">
        <thead>
          <tr>
            <th scope="col">Descrição</th>
            <th scope="col">Categoria</th>
            <th scope="col">Status</th>
            <th scope="col">Data</th>
            <th scope="col" className="fh-recent-entries__amount-col">
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td data-label="Descrição">{entry.description}</td>
              <td data-label="Categoria">{entry.categoryName}</td>
              <td data-label="Status">
                <span className="fh-badge" data-tone={entry.status}>
                  {entry.statusLabel}
                </span>
              </td>
              <td data-label="Data">{entry.dateLabel}</td>
              <td data-label="Valor" className="fh-recent-entries__amount-col" data-tone={entry.entryType}>
                {entry.amountLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
