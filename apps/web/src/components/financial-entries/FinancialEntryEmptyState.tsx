export interface FinancialEntryEmptyStateProps {
  hasActiveFilters: boolean
}

export function FinancialEntryEmptyState({ hasActiveFilters }: FinancialEntryEmptyStateProps) {
  return (
    <div className="fh-financial-entries__empty">
      <p>
        {hasActiveFilters
          ? 'Nenhuma movimentação corresponde aos filtros ou à busca atual.'
          : 'Nenhuma movimentação registrada nesta competência ainda.'}
      </p>
      {hasActiveFilters && <p className="fh-text-secondary">Tente limpar os filtros ou ajustar o termo de busca.</p>}
    </div>
  )
}
