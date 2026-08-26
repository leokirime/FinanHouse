import type { FinancialEntry, InstallmentPlan } from '@finanhouse/domain'
import { FinancialEntryStatusBadge } from '../financial-entries/FinancialEntryStatusBadge.tsx'
import { buildInstallmentRows, formatReferenceMonthLabel } from '../../view-models/installment-plan-view-model.ts'
import { formatMoneyPtBr } from '../../utils/format-money-pt-br.ts'
import './InstallmentPlanDetail.css'

export interface InstallmentPlanDetailProps {
  plan: InstallmentPlan
  installments: FinancialEntry[]
  onClose: () => void
}

export function InstallmentPlanDetail({ plan, installments, onClose }: InstallmentPlanDetailProps) {
  const rows = buildInstallmentRows(plan, installments)

  return (
    <div className="fh-card fh-installment-detail">
      <div className="fh-installment-detail__header">
        <div>
          <h3>{plan.description}</h3>
          <p className="fh-text-secondary">
            {formatMoneyPtBr(plan.totalAmount)} em {plan.installmentCount}x — a partir de {formatReferenceMonthLabel(plan.firstReferenceMonth)}, vencimento
            dia {plan.dueDay}
          </p>
        </div>
        <button type="button" className="fh-entry-form__secondary" onClick={onClose}>
          Fechar
        </button>
      </div>

      <ul className="fh-installment-detail__list">
        {rows.map((row) => (
          <li key={row.id} className="fh-installment-detail__item">
            <span className="fh-installment-detail__number">
              {row.installmentNumber ?? '—'}/{row.totalCount}
            </span>
            <span className="fh-installment-detail__amount">{row.amountLabel}</span>
            <span className="fh-installment-detail__due">{row.dueDateLabel ?? 'Sem vencimento'}</span>
            <FinancialEntryStatusBadge status={row.status} label={row.statusLabel} />
          </li>
        ))}
      </ul>
    </div>
  )
}
