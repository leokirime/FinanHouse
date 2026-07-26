import type { FinancialEntry } from '@finanhouse/domain'
import { useEffect, useId, useRef } from 'react'
import { useFinanceDemo } from '../../hooks/use-finance-demo.ts'
import { EntryDialog } from './EntryDialog.tsx'
import './FinancialEntryForm.css'

export interface CancelEntryDialogProps {
  entry: FinancialEntry
  onClose: () => void
}

export function CancelEntryDialog({ entry, onClose }: CancelEntryDialogProps) {
  const { state, dispatch } = useFinanceDemo()
  const titleId = useId()
  const pendingSubmitRef = useRef(false)

  useEffect(() => {
    if (!pendingSubmitRef.current) return
    pendingSubmitRef.current = false
    if (state.actionError === null) {
      onClose()
    }
  }, [state, onClose])

  function handleConfirm() {
    pendingSubmitRef.current = true
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
          <button type="button" className="fh-entry-form__secondary" onClick={onClose} autoFocus>
            Voltar
          </button>
          <button type="button" className="fh-entry-form__primary fh-entry-form__primary--danger" onClick={handleConfirm}>
            Confirmar cancelamento
          </button>
        </div>
      </div>
    </EntryDialog>
  )
}
