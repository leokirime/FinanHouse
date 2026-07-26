import { formatMoney, parseMoney } from '@finanhouse/domain'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { EntryDialog } from '../financial-entries/EntryDialog.tsx'
import { useFinanceDemo } from '../../hooks/use-finance-demo.ts'
import './Planning.css'

export interface CategoryBudgetFormProps {
  mode: 'create' | 'edit'
  /** Obrigatório em modo "edit" — o limite sendo editado. */
  budgetId?: number
  /** Categoria pré-selecionada (ex.: veio de uma linha "sem planejamento"); ainda pode ser trocada em modo "create". */
  initialCategoryId?: number
  /** Valor atual do limite, em modo "edit" — pré-preenchido, editável. */
  initialLimitAmountCents?: bigint
  onClose: () => void
}

/**
 * Formulário de criação/edição de limite de orçamento. Toda validação de
 * negócio (categoria ativa e de despesa, competência aberta/em revisão,
 * duplicidade) é feita por `@finanhouse/domain` dentro do reducer — este
 * componente só converte texto em `Money` via `parseMoney` (a mesma função
 * do domínio) e despacha a ação.
 */
export function CategoryBudgetForm({ mode, budgetId, initialCategoryId, initialLimitAmountCents, onClose }: CategoryBudgetFormProps) {
  const { state, dispatch } = useFinanceDemo()
  const titleId = useId()
  const amountErrorId = useId()

  const [categoryId, setCategoryId] = useState<number | ''>(initialCategoryId ?? '')
  const [amountText, setAmountText] = useState(initialLimitAmountCents !== undefined ? formatMoney(initialLimitAmountCents) : '')
  const [amountError, setAmountError] = useState<string | null>(null)

  const pendingSubmitRef = useRef(false)

  useEffect(() => {
    if (!pendingSubmitRef.current) return
    pendingSubmitRef.current = false
    if (state.actionError === null) {
      onClose()
    }
  }, [state, onClose])

  const budgetedCategoryIds = new Set(
    state.categoryBudgets.filter((budget) => budget.periodId === state.currentPeriodId).map((budget) => budget.categoryId),
  )
  const availableCategories = state.categories.filter(
    (category) =>
      category.entryType === 'expense' &&
      category.status === 'active' &&
      (mode === 'edit' || category.id === initialCategoryId || !budgetedCategoryIds.has(category.id)),
  )

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setAmountError(null)

    let limitAmount
    try {
      limitAmount = parseMoney(amountText.trim())
    } catch {
      setAmountError('Informe um valor válido, com ponto e duas casas decimais (ex.: 300.00).')
      return
    }

    if (categoryId === '') return

    pendingSubmitRef.current = true

    if (mode === 'create') {
      dispatch({ type: 'CREATE_CATEGORY_BUDGET', input: { categoryId: Number(categoryId), limitAmount } })
    } else if (budgetId !== undefined) {
      dispatch({ type: 'UPDATE_CATEGORY_BUDGET', id: budgetId, changes: { limitAmount } })
    }
  }

  return (
    <EntryDialog titleId={titleId} title={mode === 'create' ? 'Definir limite de orçamento' : 'Editar limite de orçamento'} onClose={onClose}>
      <form className="fh-entry-form" onSubmit={handleSubmit}>
        <div className="fh-entry-form__field">
          <label htmlFor="budget-category">Categoria</label>
          <select
            id="budget-category"
            autoFocus
            required
            disabled={mode === 'edit'}
            value={categoryId}
            onChange={(event) => setCategoryId(Number(event.target.value))}
          >
            <option value="" disabled>
              Selecione
            </option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="fh-entry-form__field">
          <label htmlFor="budget-limit">Limite mensal</label>
          <input
            id="budget-limit"
            type="text"
            inputMode="decimal"
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

        {state.actionError && (
          <p className="fh-entry-form__error" role="alert">
            {state.actionError}
          </p>
        )}

        <p className="fh-text-secondary">Planejamento atualizado somente nesta sessão demonstrativa.</p>

        <div className="fh-entry-form__actions">
          <button type="button" className="fh-entry-form__secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="fh-entry-form__primary">
            {mode === 'create' ? 'Definir limite' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </EntryDialog>
  )
}
