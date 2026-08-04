import type { CategoryBudgetStatus } from '@finanhouse/domain'
import './Planning.css'

export interface BudgetProgressProps {
  status: CategoryBudgetStatus
  /** `null` quando não há limite definido — a barra fica vazia, sem inventar um percentual. */
  percentConsumed: number | null
}

/**
 * Barra de progresso puramente visual — a leitura do estado nunca depende
 * apenas dela: quem usa este componente sempre exibe `statusLabel` em texto
 * ao lado. A largura é limitada a 100% mesmo quando o percentual real
 * excede isso (categoria excedida), para a barra continuar informativa.
 */
export function BudgetProgress({ status, percentConsumed }: BudgetProgressProps) {
  const width = percentConsumed === null ? 0 : Math.min(percentConsumed, 100)
  return (
    <div className="fh-budget-progress" data-tone={status} role="presentation">
      <div className="fh-budget-progress__track">
        <div className="fh-budget-progress__bar" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}
