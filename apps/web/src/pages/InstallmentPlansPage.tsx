import { useState } from 'react'
import type { InstallmentPurchaseResult } from '../api/financial-api.ts'
import { FinancialAreaTabs } from '../components/financial-entries/FinancialAreaTabs.tsx'
import { InstallmentPlanDetail } from '../components/installments/InstallmentPlanDetail.tsx'
import { InstallmentPlanEmptyState } from '../components/installments/InstallmentPlanEmptyState.tsx'
import { InstallmentPlanForm } from '../components/installments/InstallmentPlanForm.tsx'
import { InstallmentPlanList } from '../components/installments/InstallmentPlanList.tsx'
import { useInstallmentPlanDetail } from '../hooks/use-installment-plan-detail.ts'
import { useInstallmentPlans } from '../hooks/use-installment-plans.ts'
import { useReadyFinance } from '../hooks/use-finance.ts'
import './FinancialEntriesPage.css'

/**
 * Detalhe exibido pode vir de duas fontes, ambas dados reais: o parcelamento
 * recém-criado (corpo do `POST`, sem round-trip extra) ou um parcelamento já
 * existente selecionado na lista (`GET .../installment-plans/:id`).
 */
type DetailSource = { kind: 'created'; result: InstallmentPurchaseResult } | { kind: 'selected'; id: number }

export function InstallmentPlansPage() {
  const { state } = useReadyFinance()
  const installmentPlans = useInstallmentPlans()
  const [showForm, setShowForm] = useState(false)
  const [detailSource, setDetailSource] = useState<DetailSource | null>(null)

  const fetchedDetail = useInstallmentPlanDetail(detailSource?.kind === 'selected' ? detailSource.id : null)

  const activeDetail =
    detailSource?.kind === 'created'
      ? { plan: detailSource.result.plan, installments: detailSource.result.installments }
      : detailSource?.kind === 'selected' && fetchedDetail.status === 'ready' && fetchedDetail.plan
        ? { plan: fetchedDetail.plan, installments: fetchedDetail.installments }
        : null

  return (
    <div className="fh-financial-entries-page">
      <FinancialAreaTabs />

      <div className="fh-card fh-card--elevated fh-financial-entries-page__intro">
        <div>
          <h2>Parcelamentos</h2>
          <p className="fh-text-secondary">Compras parceladas do household — cada parcela é gerada como uma movimentação real.</p>
        </div>
        <button type="button" className="fh-financial-entries-page__new" onClick={() => setShowForm(true)}>
          Novo parcelamento
        </button>
      </div>

      {installmentPlans.status === 'error' && (
        <div className="fh-financial-entries-page__toast" role="alert">
          <span>Não foi possível carregar os parcelamentos: {installmentPlans.error?.message}</span>
          <button type="button" onClick={installmentPlans.retry}>
            Tentar novamente
          </button>
        </div>
      )}

      {fetchedDetail.status === 'error' && (
        <div className="fh-financial-entries-page__toast" role="alert">
          <span>Não foi possível carregar este parcelamento: {fetchedDetail.error?.message}</span>
          <button type="button" onClick={fetchedDetail.retry}>
            Tentar novamente
          </button>
        </div>
      )}

      {installmentPlans.status === 'ready' && installmentPlans.plans.length === 0 && (
        <InstallmentPlanEmptyState onCreate={() => setShowForm(true)} />
      )}

      {installmentPlans.status === 'ready' && installmentPlans.plans.length > 0 && (
        <InstallmentPlanList
          plans={installmentPlans.plans}
          categories={state.categories}
          entries={state.entries}
          selectedPlanId={detailSource?.kind === 'selected' ? detailSource.id : (activeDetail?.plan.id ?? null)}
          onSelect={(plan) => setDetailSource({ kind: 'selected', id: plan.id })}
        />
      )}

      {activeDetail && (
        <InstallmentPlanDetail plan={activeDetail.plan} installments={activeDetail.installments} onClose={() => setDetailSource(null)} />
      )}

      {showForm && (
        <InstallmentPlanForm
          installmentPlans={installmentPlans}
          onClose={() => setShowForm(false)}
          onCreated={(result) => setDetailSource({ kind: 'created', result })}
        />
      )}
    </div>
  )
}
