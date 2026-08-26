export interface InstallmentPlanEmptyStateProps {
  onCreate: () => void
}

/** Nenhum dado fictício — só aparece quando `GET .../installment-plans` real devolve `[]` (seção 20 do prompt do Bloco 05). */
export function InstallmentPlanEmptyState({ onCreate }: InstallmentPlanEmptyStateProps) {
  return (
    <div className="fh-financial-entries__empty">
      <p>Nenhum parcelamento cadastrado.</p>
      <p className="fh-text-secondary">Cadastre uma compra parcelada para acompanhar os próximos vencimentos.</p>
      <button type="button" className="fh-financial-entries-page__new" onClick={onCreate}>
        Novo parcelamento
      </button>
    </div>
  )
}
