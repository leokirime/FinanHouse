import { formatMoney, parseMoney, type FinancialEntry } from '@finanhouse/domain'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useFinanceDemo } from '../../hooks/use-finance-demo.ts'
import { EntryDialog } from './EntryDialog.tsx'
import './FinancialEntryForm.css'

export interface RealizeEntryDialogProps {
  entry: FinancialEntry
  onClose: () => void
}

/**
 * O valor previsto aparece pré-preenchido (visível, editável) mas a
 * realização só ocorre com confirmação explícita do formulário — nunca
 * automaticamente a partir do valor previsto.
 */
export function RealizeEntryDialog({ entry, onClose }: RealizeEntryDialogProps) {
  const { state, dispatch } = useFinanceDemo()
  const titleId = useId()
  const errorId = useId()
  const amountErrorId = useId()
  const dateErrorId = useId()

  const [amountText, setAmountText] = useState(formatMoney(entry.expectedAmount))
  const [realizationDate, setRealizationDate] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const pendingSubmitRef = useRef(false)

  useEffect(() => {
    if (!pendingSubmitRef.current) return
    pendingSubmitRef.current = false
    if (state.actionError === null) {
      onClose()
    }
  }, [state, onClose])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setAmountError(null)
    setDateError(null)

    let actualAmount
    try {
      actualAmount = parseMoney(amountText.trim())
    } catch {
      setAmountError('Informe um valor válido, com ponto e duas casas decimais (ex.: 150.00).')
      return
    }
    if (!realizationDate) {
      setDateError('Informe a data em que a movimentação foi realizada.')
      return
    }

    pendingSubmitRef.current = true
    dispatch({ type: 'REALIZE', id: entry.id, actualAmount, realizationDate })
  }

  return (
    <EntryDialog titleId={titleId} title={`Realizar "${entry.description}"`} onClose={onClose}>
      <form className="fh-entry-form" onSubmit={handleSubmit} aria-describedby={state.actionError ? errorId : undefined}>
        <p className="fh-entry-form__hint fh-text-secondary">
          O valor previsto aparece preenchido — confirme ou ajuste antes de realizar.
        </p>

        <div className="fh-entry-form__field">
          <label htmlFor="realize-amount">Valor realizado</label>
          <input
            id="realize-amount"
            type="text"
            inputMode="decimal"
            autoFocus
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={amountError ? amountErrorId : undefined}
          />
          {amountError && (
            <p id={amountErrorId} className="fh-entry-form__field-error" role="alert">
              {amountError}
            </p>
          )}
        </div>

        <div className="fh-entry-form__field">
          <label htmlFor="realize-date">Data de realização</label>
          <input
            id="realize-date"
            type="date"
            value={realizationDate}
            onChange={(event) => setRealizationDate(event.target.value)}
            aria-invalid={dateError ? true : undefined}
            aria-describedby={dateError ? dateErrorId : undefined}
          />
          {dateError && (
            <p id={dateErrorId} className="fh-entry-form__field-error" role="alert">
              {dateError}
            </p>
          )}
        </div>

        {state.actionError && (
          <p id={errorId} className="fh-entry-form__error" role="alert">
            {state.actionError}
          </p>
        )}

        <div className="fh-entry-form__actions">
          <button type="button" className="fh-entry-form__secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="fh-entry-form__primary">
            Confirmar realização
          </button>
        </div>
      </form>
    </EntryDialog>
  )
}
