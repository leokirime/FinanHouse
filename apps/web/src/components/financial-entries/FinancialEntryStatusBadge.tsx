import type { FinancialEntryStatus } from '@finanhouse/domain'

export interface FinancialEntryStatusBadgeProps {
  status: FinancialEntryStatus
  label: string
}

export function FinancialEntryStatusBadge({ status, label }: FinancialEntryStatusBadgeProps) {
  return (
    <span className="fh-badge" data-tone={status}>
      {label}
    </span>
  )
}
