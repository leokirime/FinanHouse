import { useReadyFinance } from '../../hooks/use-finance.ts'
import type { FinancialEntryRowViewModel } from '../../view-models/financial-entries-view-model.ts'
import './FinancialEntryActions.css'

export interface FinancialEntryActionsProps {
  row: FinancialEntryRowViewModel
  onEdit: () => void
  onRealize: () => void
  onDelete: () => void
}

export function FinancialEntryActions({ row, onEdit, onRealize, onDelete }: FinancialEntryActionsProps) {
  const { dispatch } = useReadyFinance()

  return (
    <div className="fh-entry-actions">
      {row.canEdit && (
        <button type="button" onClick={onEdit}>
          Editar
        </button>
      )}
      {row.canMarkPending && (
        <button type="button" onClick={() => dispatch({ type: 'MARK_PENDING', id: row.id })}>
          Marcar pendente
        </button>
      )}
      {row.canRealize && (
        <button type="button" onClick={onRealize}>
          Realizar
        </button>
      )}
      {row.canDelete && (
        <button type="button" className="fh-entry-actions__delete" onClick={onDelete}>
          Excluir
        </button>
      )}
      {row.canReactivate && (
        <button type="button" onClick={() => dispatch({ type: 'REACTIVATE', id: row.id })}>
          Reativar
        </button>
      )}
      {row.canRevertRealization && (
        <button type="button" onClick={() => dispatch({ type: 'REVERT_REALIZATION', id: row.id })}>
          Estornar
        </button>
      )}
      {!row.canEdit && row.editBlockedReason && <span className="fh-visually-hidden">{row.editBlockedReason}</span>}
    </div>
  )
}
