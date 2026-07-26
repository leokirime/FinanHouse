import type { HistoryEntryRowViewModel } from '../../view-models/history-view-model.ts'
import './History.css'

export interface HistoricalEntriesProps {
  entries: HistoryEntryRowViewModel[]
  emptyMessage: string | null
}

/** Somente consulta — nenhuma ação de editar/realizar/cancelar/excluir é oferecida aqui. */
export function HistoricalEntries({ entries, emptyMessage }: HistoricalEntriesProps) {
  return (
    <section className="fh-card fh-history-entries" aria-labelledby="history-entries-heading">
      <h2 id="history-entries-heading">Movimentações da competência</h2>
      {entries.length === 0 ? (
        <p className="fh-text-secondary">{emptyMessage}</p>
      ) : (
        <div className="fh-history-table-wrap">
          <table className="fh-history-table">
            <thead>
              <tr>
                <th scope="col">Descrição</th>
                <th scope="col">Categoria</th>
                <th scope="col">Status</th>
                <th scope="col">Data</th>
                <th scope="col">Valor</th>
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
                  <td data-label="Valor">{entry.amountLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
