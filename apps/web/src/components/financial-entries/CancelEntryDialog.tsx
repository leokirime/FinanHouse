import type { FinancialEntry } from '@finanhouse/domain'
import { useId } from 'react'
import { useMutationDialog } from '../../hooks/use-mutation-dialog.ts'
import { useReadyFinance } from '../../hooks/use-finance.ts'
import { EntryDialog } from './EntryDialog.tsx'
import './FinancialEntryForm.css'

export interface CancelEntryDialogProps {
  entry: FinancialEntry
  onClose: () => void
}

export function CancelEntryDialog({ entry, onClose }: CancelEntryDialogProps) {
  const { state, dispatch } = useReadyFinance()
  const titleId = useId()

  const { markSubmitted } = useMutationDialog({ state, onSuccess: onClose })

  function handleConfirm() {
    if (state.pendingAction) return
    markSubmitted()
    dispatch({ type: 'CANCEL', id: entry.id })
  }

  return (
    <EntryDialog titleId={titleId} title="Cancelar movimentação" onClose={onClose}>
      <div className="fh-entry-form">
        <p>
          Tem certeza que deseja cancelar <strong>"{entry.description}"</strong>? É possível reativá-la depois, se
          necessário.
        </p>

        {state.actionError && (
          <p className="fh-entry-form__error" role="alert">
            {state.actionError}
          </p>
        )}

        <div className="fh-entry-form__actions">
          <button type="button" className="fh-entry-form__secondary" onClick={onClose} autoFocus disabled={state.pendingAction}>
            Voltar
          </button>
          <button
            type="button"
            className="fh-entry-form__primary fh-entry-form__primary--danger"
            onClick={handleConfirm}
            disabled={state.pendingAction}
            aria-busy={state.pendingAction}
          >
            {state.pendingAction ? 'Cancelando…' : 'Confirmar cancelamento'}
          </button>
        </div>
      </div>
    </EntryDialog>
  )
}
