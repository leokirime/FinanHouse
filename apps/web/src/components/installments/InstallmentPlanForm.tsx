import type { Money } from '@finanhouse/domain'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { InstallmentPurchaseResult } from '../../api/financial-api.ts'
import { EntryDialog } from '../financial-entries/EntryDialog.tsx'
import { useReadyFinance } from '../../hooks/use-finance.ts'
import type { CreateInstallmentPlanInput, UseInstallmentPlansResult } from '../../hooks/use-installment-plans.ts'
import { parseMoneyPtBr } from '../../utils/format-money-pt-br.ts'
import { buildInstallmentPreview, INSTALLMENT_COUNT_MIN, monthInputValueToReferenceMonth } from '../../view-models/installment-plan-view-model.ts'
import '../financial-entries/FinancialEntryForm.css'
import './InstallmentPlanForm.css'

export interface InstallmentPlanFormProps {
  installmentPlans: UseInstallmentPlansResult
  onClose: () => void
  /** Chamado com o resultado REAL do `POST` (plano + parcelas) assim que a criação é confirmada pela API — nunca antes da resposta HTTP. */
  onCreated: (result: InstallmentPurchaseResult) => void
}

/**
 * Formulário de criação de parcelamento — `POST .../installment-plans`
 * (Sessão 12, Bloco 05). Usuário digita o valor em formato pt-BR (ex.:
 * "3000,00", "3.000,00") — `parseMoneyPtBr` normaliza para a string decimal
 * canônica ("3000.00") antes de `parseMoney` (domínio); nunca usa
 * `Number`/`parseFloat` como fonte de verdade. Toda validação de negócio
 * (categoria ativa/de despesa, mínimo de parcelas, competência/dia válidos)
 * é feita pela API; este componente só converte texto em `Money`/competência
 * e aguarda a resposta real antes de fechar — nunca confirma sucesso antes
 * da resposta HTTP (`installmentPlans.lastCreated`, sempre o corpo real
 * devolvido pela API).
 */
export function InstallmentPlanForm({ installmentPlans, onClose, onCreated }: InstallmentPlanFormProps) {
  const { state } = useReadyFinance()
  const titleId = useId()
  const errorId = useId()
  const amountErrorId = useId()

  const availableCategories = state.categories.filter((category) => category.entryType === 'expense' && category.status === 'active')

  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [amountText, setAmountText] = useState('')
  const [installmentCount, setInstallmentCount] = useState<number | ''>('')
  const [monthValue, setMonthValue] = useState('')
  const [dueDay, setDueDay] = useState<number | ''>('')
  const [amountError, setAmountError] = useState<string | null>(null)

  const submittedRef = useRef(false)

  useEffect(() => {
    if (!submittedRef.current || installmentPlans.pendingAction) return
    submittedRef.current = false
    if (installmentPlans.actionError === null && installmentPlans.lastCreated) {
      onCreated(installmentPlans.lastCreated)
      onClose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installmentPlans.mutationVersion])

  let totalAmount: Money | null = null
  try {
    totalAmount = amountText.trim() ? parseMoneyPtBr(amountText.trim()) : null
  } catch {
    totalAmount = null
  }
  const preview = totalAmount !== null && installmentCount !== '' ? buildInstallmentPreview(totalAmount, installmentCount) : null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (installmentPlans.pendingAction) return
    setAmountError(null)

    let parsedAmount: Money
    try {
      parsedAmount = parseMoneyPtBr(amountText.trim())
    } catch {
      setAmountError('Informe um valor válido em reais (ex.: 3000,00).')
      return
    }

    if (categoryId === '' || installmentCount === '' || monthValue === '' || dueDay === '') return

    const input: CreateInstallmentPlanInput = {
      description: description.trim(),
      categoryId: Number(categoryId),
      totalAmount: parsedAmount,
      installmentCount: Number(installmentCount),
      firstReferenceMonth: monthInputValueToReferenceMonth(monthValue),
      dueDay: Number(dueDay),
    }

    submittedRef.current = true
    installmentPlans.create(input)
  }

  return (
    <EntryDialog titleId={titleId} title="Novo parcelamento" onClose={onClose}>
      <form className="fh-entry-form" onSubmit={handleSubmit} aria-describedby={installmentPlans.actionError ? errorId : undefined}>
        <div className="fh-entry-form__field">
          <label htmlFor="installment-description">Descrição</label>
          <input
            id="installment-description"
            type="text"
            autoFocus
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="fh-entry-form__row">
          <div className="fh-entry-form__field">
            <label htmlFor="installment-category">Categoria</label>
            <select id="installment-category" required value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))}>
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
            <label htmlFor="installment-amount">Valor total</label>
            <input
              id="installment-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
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
            <label htmlFor="installment-count">Número de parcelas</label>
            <input
              id="installment-count"
              type="number"
              min={INSTALLMENT_COUNT_MIN}
              step={1}
              required
              value={installmentCount}
              onChange={(event) => setInstallmentCount(event.target.value === '' ? '' : Number(event.target.value))}
            />
          </div>

          <div className="fh-entry-form__field">
            <label htmlFor="installment-first-month">Primeira competência</label>
            <input id="installment-first-month" type="month" required value={monthValue} onChange={(event) => setMonthValue(event.target.value)} />
          </div>
        </div>

        <div className="fh-entry-form__field">
          <label htmlFor="installment-due-day">Dia do vencimento</label>
          <input
            id="installment-due-day"
            type="number"
            min={1}
            max={31}
            step={1}
            required
            value={dueDay}
            onChange={(event) => setDueDay(event.target.value === '' ? '' : Number(event.target.value))}
          />
          <p className="fh-entry-form__hint fh-text-secondary">
            Em meses mais curtos (ex.: fevereiro), o vencimento é ajustado automaticamente para o último dia válido do mês.
          </p>
        </div>

        {preview && (
          <p className="fh-installment-form__preview" aria-live="polite">
            {preview.totalLabel} em {installmentCount}x — aproximadamente {preview.perInstallmentLabel} cada. O valor final de cada parcela é definido pela
            API ao salvar.
          </p>
        )}

        {installmentPlans.actionError && (
          <p id={errorId} className="fh-entry-form__error" role="alert">
            {installmentPlans.actionError}
          </p>
        )}

        <div className="fh-entry-form__actions">
          <button type="button" className="fh-entry-form__secondary" onClick={onClose} disabled={installmentPlans.pendingAction}>
            Cancelar
          </button>
          <button type="submit" className="fh-entry-form__primary" disabled={installmentPlans.pendingAction} aria-busy={installmentPlans.pendingAction}>
            {installmentPlans.pendingAction ? 'Salvando…' : 'Criar parcelamento'}
          </button>
        </div>
      </form>
    </EntryDialog>
  )
}
