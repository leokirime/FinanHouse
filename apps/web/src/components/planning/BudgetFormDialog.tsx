import { formatMoney, parseMoney, type Money } from '@finanhouse/domain'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { EntryDialog } from '../financial-entries/EntryDialog.tsx'
import type { UsePeriodBudgetsResult } from '../../hooks/use-period-budgets.ts'
import './Planning.css'

export interface BudgetFormDialogProps {
  mode: 'create' | 'edit'
  periodBudgets: UsePeriodBudgetsResult
  categoryId: number
  categoryName: string
  /** Valor atual do limite, em modo "edit" — pré-preenchido, editável. */
  initialLimitAmount?: Money
  onClose: () => void
}

/**
 * Formulário de criação/edição de limite mensal por categoria — persiste
 * via `usePeriodBudgets` (API real, `PUT .../periods/:referenceMonth/budgets/:categoryId`).
 * Toda validação de negócio (categoria ativa/de despesa, competência
 * aberta/em revisão, duplicidade) é feita pela API; este componente só
 * converte texto em `Money` via `parseMoney` e aguarda a resposta real
 * antes de fechar.
 */
export function BudgetFormDialog({ mode, periodBudgets, categoryId, categoryName, initialLimitAmount, onClose }: BudgetFormDialogProps) {
  const titleId = useId()
  const amountErrorId = useId()

  const [amountText, setAmountText] = useState(initialLimitAmount !== undefined ? formatMoney(initialLimitAmount) : '')
  const [amountError, setAmountError] = useState<string | null>(null)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (!submittedRef.current || periodBudgets.pendingAction) return
    submittedRef.current = false
    if (periodBudgets.actionError === null) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodBudgets.mutationVersion])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (periodBudgets.pendingAction) return
    setAmountError(null)

    let limitAmount: Money
    try {
      limitAmount = parseMoney(amountText.trim())
    } catch {
      setAmountError('Informe um valor válido, com ponto e duas casas decimais (ex.: 300.00).')
      return
    }

    submittedRef.current = true
    periodBudgets.createOrUpdate(categoryId, limitAmount)
  }

  return (
    <EntryDialog titleId={titleId} title={mode === 'create' ? `Definir limite — ${categoryName}` : `Editar limite — ${categoryName}`} onClose={onClose}>
      <form className="fh-entry-form" onSubmit={handleSubmit}>
        <div className="fh-entry-form__field">
          <label htmlFor="budget-limit">Limite mensal</label>
          <input
            id="budget-limit"
            type="text"
            inputMode="decimal"
            autoFocus
            placeholder="0.00"
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

        {periodBudgets.actionError && (
          <p className="fh-entry-form__error" role="alert">
            {periodBudgets.actionError}
          </p>
        )}

        <div className="fh-entry-form__actions">
          <button type="button" className="fh-entry-form__secondary" onClick={onClose} disabled={periodBudgets.pendingAction}>
            Cancelar
          </button>
          <button type="submit" className="fh-entry-form__primary" disabled={periodBudgets.pendingAction} aria-busy={periodBudgets.pendingAction}>
            {periodBudgets.pendingAction ? 'Salvando…' : mode === 'create' ? 'Definir limite' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </EntryDialog>
  )
}
