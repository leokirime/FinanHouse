import type { UpcomingEntryViewModel } from '../../view-models/dashboard-view-model.ts'
import './UpcomingEntries.css'

export interface UpcomingEntriesProps {
  entries: UpcomingEntryViewModel[]
}

export function UpcomingEntries({ entries }: UpcomingEntriesProps) {
  return (
    <section className="fh-card fh-upcoming-entries" aria-labelledby="upcoming-entries-heading">
      <h3 id="upcoming-entries-heading">Pendências próximas</h3>
      {entries.length === 0 ? (
        <p className="fh-text-secondary">Nenhuma pendência com vencimento próximo.</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id} className="fh-upcoming-entries__row">
              <div>
                <p>{entry.description}</p>
                <p className="fh-text-secondary">
                  {entry.categoryName} · vence em {entry.dueDateLabel}
                </p>
              </div>
              <span className="fh-upcoming-entries__amount">{entry.amountLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
