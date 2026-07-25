import type { Category, FinancialEntry } from '@finanhouse/domain'
import { buildFinancialEntryRow } from '../../view-models/financial-entries-view-model.ts'
import { FinancialEntryActions } from './FinancialEntryActions.tsx'
import { FinancialEntryStatusBadge } from './FinancialEntryStatusBadge.tsx'
import './FinancialEntryList.css'

export interface FinancialEntryListProps {
  entries: FinancialEntry[]
  categories: Category[]
  onEdit: (entry: FinancialEntry) => void
  onRealize: (entry: FinancialEntry) => void
  onCancel: (entry: FinancialEntry) => void
}

export function FinancialEntryList({ entries, categories, onEdit, onRealize, onCancel }: FinancialEntryListProps) {
  return (
    <div className="fh-card fh-entry-list">
      <table className="fh-entry-list__table">
        <thead>
          <tr>
            <th scope="col">Descrição</th>
            <th scope="col">Categoria</th>
            <th scope="col">Tipo</th>
            <th scope="col">Status</th>
            <th scope="col">Previsto</th>
            <th scope="col">Realizado</th>
            <th scope="col">Vencimento</th>
            <th scope="col">Realização</th>
            <th scope="col">Responsável</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const row = buildFinancialEntryRow(entry, categories)
            return (
              <tr key={entry.id}>
                <td data-label="Descrição">{row.description}</td>
                <td data-label="Categoria">{row.categoryName}</td>
                <td data-label="Tipo">{row.entryType === 'income' ? 'Receita' : 'Despesa'}</td>
                <td data-label="Status">
                  <FinancialEntryStatusBadge status={row.status} label={row.statusLabel} />
                </td>
                <td data-label="Previsto">{row.expectedAmountLabel}</td>
                <td data-label="Realizado">{row.actualAmountLabel ?? '—'}</td>
                <td data-label="Vencimento">{row.dueDateLabel ?? '—'}</td>
                <td data-label="Realização">{row.realizationDateLabel ?? '—'}</td>
                <td data-label="Responsável">{row.responsibleLabel ?? '—'}</td>
                <td data-label="Ações">
                  <FinancialEntryActions
                    row={row}
                    onEdit={() => onEdit(entry)}
                    onRealize={() => onRealize(entry)}
                    onCancel={() => onCancel(entry)}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
