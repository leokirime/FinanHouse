import type { Category, FinancialEntry, InstallmentPlan } from '@finanhouse/domain'
import { buildInstallmentPlanRows } from '../../view-models/installment-plan-view-model.ts'
import './InstallmentPlanList.css'

export interface InstallmentPlanListProps {
  plans: InstallmentPlan[]
  categories: Category[]
  entries: FinancialEntry[]
  selectedPlanId: number | null
  onSelect: (plan: InstallmentPlan) => void
}

export function InstallmentPlanList({ plans, categories, entries, selectedPlanId, onSelect }: InstallmentPlanListProps) {
  const rows = buildInstallmentPlanRows(plans, categories, entries)
  const plansById = new Map(plans.map((plan) => [plan.id, plan]))

  return (
    <div className="fh-card fh-installment-list">
      <table className="fh-installment-list__table">
        <thead>
          <tr>
            <th scope="col">Descrição</th>
            <th scope="col">Categoria</th>
            <th scope="col">Total</th>
            <th scope="col">Parcelas</th>
            <th scope="col">Valor da parcela</th>
            <th scope="col">1ª competência</th>
            <th scope="col">Vencimento</th>
            <th scope="col">Progresso</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="fh-installment-list__row"
              data-selected={row.id === selectedPlanId ? 'true' : undefined}
            >
              <td data-label="Descrição">
                <button type="button" className="fh-installment-list__select" onClick={() => onSelect(plansById.get(row.id)!)}>
                  {row.description}
                </button>
              </td>
              <td data-label="Categoria">{row.categoryName}</td>
              <td data-label="Total">{row.totalAmountLabel}</td>
              <td data-label="Parcelas">{row.installmentCount}x</td>
              <td data-label="Valor da parcela">{row.approxInstallmentLabel}</td>
              <td data-label="1ª competência">{row.firstReferenceMonthLabel}</td>
              <td data-label="Vencimento">Dia {row.dueDay}</td>
              <td data-label="Progresso">
                <span className="fh-installment-list__progress">
                  <span className="fh-badge">{row.progress.label}</span>
                  {row.progress.isCompleted && (
                    <span className="fh-badge" data-tone="realized">
                      Concluído
                    </span>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
