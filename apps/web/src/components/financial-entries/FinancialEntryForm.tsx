import { formatMoney, parseMoney, type FinancialEntry, type FinancialEntryType } from '@finanhouse/domain'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { fixtureMemberLabels } from '../../data/dashboard-fixtures.ts'
import { useFinanceDemo } from '../../hooks/use-finance-demo.ts'
import { EntryDialog } from './EntryDialog.tsx'
import './FinancialEntryForm.css'

export interface FinancialEntryFormProps {
  mode: 'create' | 'edit'
  /** Obrigatório em modo "edit" — a movimentação sendo editada. */
  entry?: FinancialEntry
  onClose: () => void
}

/**
 * Formulário de criação e edição de movimentações. Toda validação de
 * negócio (valor positivo, duas casas decimais, categoria/membro ativos,
 * competência aberta) é feita por `@finanhouse/domain` dentro do reducer —
 * este componente só converte texto em `Money` via `parseMoney` (a mesma
 * função do domínio) e monta a ação a despachar.
 */
export function FinancialEntryForm({ mode, entry, onClose }: FinancialEntryFormProps) {
  const { state, dispatch } = useFinanceDemo()
  const titleId = useId()
  const errorId = useId()
  const amountErrorId = useId()

  const [entryType, setEntryType] = useState<FinancialEntryType>(entry?.entryType ?? 'expense')
  const [description, setDescription] = useState(entry?.description ?? '')
  const [categoryId, setCategoryId] = useState<number | ''>(entry?.categoryId ?? '')
  const [amountText, setAmountText] = useState(entry ? formatMoney(entry.expectedAmount) : '')
  const [initialStatus, setInitialStatus] = useState<'planned' | 'pending'>('planned')
  const [dueDate, setDueDate] = useState(entry?.dueDate ?? '')
  const [responsibleMemberId, setResponsibleMemberId] = useState<number | ''>(entry?.responsibleMemberId ?? '')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [amountError, setAmountError] = useState<string | null>(null)

  const pendingSubmitRef = useRef(false)

  useEffect(() => {
    if (!pendingSubmitRef.current) return
    pendingSubmitRef.current = false
    if (state.actionError === null) {
      onClose()
    }
  }, [state, onClose])

  const availableCategories = state.categories.filter((category) => category.entryType === entryType && category.status === 'active')
  const availableMembers = state.members.filter((member) => member.status === 'active')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setAmountError(null)

    let expectedAmount
    try {
      expectedAmount = parseMoney(amountText.trim())
    } catch {
      setAmountError('Informe um valor válido, com ponto e duas casas decimais (ex.: 150.00).')
      return
    }

    if (categoryId === '') return

    pendingSubmitRef.current = true

    if (mode === 'create') {
      dispatch({
        type: 'CREATE_ENTRY',
        input: {
          entryType,
          description: description.trim(),
          categoryId: Number(categoryId),
          expectedAmount,
          initialStatus,
          dueDate: dueDate || null,
          responsibleMemberId: responsibleMemberId === '' ? null : Number(responsibleMemberId),
          notes: notes.trim() || null,
        },
      })
    } else if (entry) {
      dispatch({
        type: 'UPDATE_ENTRY',
        id: entry.id,
        changes: {
          description: description.trim(),
          categoryId: Number(categoryId),
          expectedAmount,
          dueDate: dueDate || null,
          responsibleMemberId: responsibleMemberId === '' ? null : Number(responsibleMemberId),
          notes: notes.trim() || null,
        },
      })
    }
  }

  return (
    <EntryDialog titleId={titleId} title={mode === 'create' ? 'Nova movimentação' : 'Editar movimentação'} onClose={onClose}>
      <form className="fh-entry-form" onSubmit={handleSubmit} aria-describedby={state.actionError ? errorId : undefined}>
        {mode === 'create' && (
          <div className="fh-entry-form__row">
            <div className="fh-entry-form__field">
              <label htmlFor="entry-type">Tipo</label>
              <select
                id="entry-type"
                autoFocus
                value={entryType}
                onChange={(event) => {
                  setEntryType(event.target.value as FinancialEntryType)
                  setCategoryId('')
                }}
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>
            <div className="fh-entry-form__field">
              <label htmlFor="entry-initial-status">Status inicial</label>
              <select id="entry-initial-status" value={initialStatus} onChange={(event) => setInitialStatus(event.target.value as 'planned' | 'pending')}>
                <option value="planned">Planejado</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
          </div>
        )}

        <div className="fh-entry-form__field">
          <label htmlFor="entry-description">Descrição</label>
          <input
            id="entry-description"
            type="text"
            autoFocus={mode === 'edit'}
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="fh-entry-form__row">
          <div className="fh-entry-form__field">
            <label htmlFor="entry-category">Categoria</label>
            <select id="entry-category" required value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))}>
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
            <label htmlFor="entry-amount">Valor previsto</label>
            <input
              id="entry-amount"
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
        </div>

        <div className="fh-entry-form__row">
          <div className="fh-entry-form__field">
            <label htmlFor="entry-due-date">Vencimento (opcional)</label>
            <input id="entry-due-date" type="date" value={dueDate ?? ''} onChange={(event) => setDueDate(event.target.value)} />
          </div>

          <div className="fh-entry-form__field">
            <label htmlFor="entry-member">Responsável (opcional)</label>
            <select
              id="entry-member"
              value={responsibleMemberId}
              onChange={(event) => setResponsibleMemberId(event.target.value === '' ? '' : Number(event.target.value))}
            >
              <option value="">Nenhum</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {fixtureMemberLabels[member.id] ?? `Membro #${member.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fh-entry-form__field">
          <label htmlFor="entry-notes">Observações (opcional)</label>
          <textarea id="entry-notes" rows={2} value={notes ?? ''} onChange={(event) => setNotes(event.target.value)} />
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
            {mode === 'create' ? 'Adicionar movimentação' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </EntryDialog>
  )
}
