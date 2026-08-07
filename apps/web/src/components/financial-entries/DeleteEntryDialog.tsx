import type { FinancialEntry } from '@finanhouse/domain'
import { useId } from 'react'
import { useMutationDialog } from '../../hooks/use-mutation-dialog.ts'
import { useReadyFinance } from '../../hooks/use-finance.ts'
import { EntryDialog } from './EntryDialog.tsx'
import './FinancialEntryForm.css'

export interface DeleteEntryDialogProps {
  entry: FinancialEntry
  onClose: () => void
}

/** Confirmação de exclusão real e permanente (Bloco 20, substitui `CancelEntryDialog` como ação destrutiva). */
export function DeleteEntryDialog({ entry, onClose }: DeleteEntryDialogProps) {
  const { state, dispatch } = useReadyFinance()
  const titleId = useId()

  const { markSubmitted } = useMutationDialog({ state, onSuccess: onClose })

  function handleConfirm() {
    if (state.pendingAction) return
    markSubmitted()
    dispatch({ type: 'DELETE_ENTRY', id: entry.id })
  }

  return (
    <EntryDialog titleId={titleId} title="Excluir lançamento?" onClose={onClose}>
      <div className="fh-entry-form">
        <p>
          Este lançamento será removido permanentemente do FinanHouse. <strong>"{entry.description}"</strong> não
          poderá ser recuperado depois.
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
            {state.pendingAction ? 'Excluindo…' : 'Excluir lançamento'}
          </button>
        </div>
      </div>
    </EntryDialog>
  )
}
