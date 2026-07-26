import type { PlanningEntryRowViewModel } from '../../view-models/planning-view-model.ts'
import './Planning.css'

export interface PlanningEntriesProps {
  plannedEntries: PlanningEntryRowViewModel[]
  pendingEntries: PlanningEntryRowViewModel[]
}

function EntryList({ title, entries, emptyText }: { title: string; entries: PlanningEntryRowViewModel[]; emptyText: string }) {
  return (
    <div className="fh-planning-entries__group">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <p className="fh-text-secondary">{emptyText}</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.description}</strong>
              <small>
                {entry.categoryName}
                {entry.dueDateLabel ? ` · vence em ${entry.dueDateLabel}` : ''}
              </small>
              <span>{entry.amountLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Contexto de quais movimentações compõem os totais "pendente"/"planejado" dos cards acima — nenhum total é recalculado aqui, apenas listado. */
export function PlanningEntries({ plannedEntries, pendingEntries }: PlanningEntriesProps) {
  return (
    <section className="fh-card fh-planning-section fh-planning-entries" aria-labelledby="planning-entries-heading">
      <h2 id="planning-entries-heading">Despesas planejadas e pendentes</h2>
      <div className="fh-planning-entries__grid">
        <EntryList title="Pendentes" entries={pendingEntries} emptyText="Nenhuma despesa pendente nesta competência." />
        <EntryList title="Planejadas" entries={plannedEntries} emptyText="Nenhuma despesa planejada nesta competência." />
      </div>
    </section>
  )
}
