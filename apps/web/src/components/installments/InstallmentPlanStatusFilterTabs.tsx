import { INSTALLMENT_PLAN_STATUS_FILTER_LABELS, type InstallmentPlanStatusFilter } from '../../view-models/installment-plan-view-model.ts'
import './InstallmentPlanStatusFilterTabs.css'

const FILTERS: InstallmentPlanStatusFilter[] = ['active', 'completed', 'all']

export interface InstallmentPlanStatusFilterTabsProps {
  value: InstallmentPlanStatusFilter
  onChange: (value: InstallmentPlanStatusFilter) => void
}

/** Filtro de visualização — nunca exclui/altera dado, só decide o que aparece na lista padrão (ajuste pós-validação visual do Bloco 06). */
export function InstallmentPlanStatusFilterTabs({ value, onChange }: InstallmentPlanStatusFilterTabsProps) {
  return (
    <div className="fh-installment-status-filter" role="group" aria-label="Filtrar parcelamentos">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          className="fh-installment-status-filter__tab"
          aria-pressed={value === filter}
          onClick={() => onChange(filter)}
        >
          {INSTALLMENT_PLAN_STATUS_FILTER_LABELS[filter]}
        </button>
      ))}
    </div>
  )
}
