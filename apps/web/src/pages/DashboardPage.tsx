import { CategoryBreakdown } from '../components/dashboard/CategoryBreakdown.tsx'
import { FinancialEvolutionChart } from '../components/dashboard/FinancialEvolutionChart.tsx'
import { HeroBrand } from '../components/dashboard/HeroBrand.tsx'
import { RecentEntries } from '../components/dashboard/RecentEntries.tsx'
import { SummaryCard } from '../components/dashboard/SummaryCard.tsx'
import { UpcomingEntries } from '../components/dashboard/UpcomingEntries.tsx'
import { useDashboardViewModel } from '../hooks/use-dashboard-view-model.ts'
import './DashboardPage.css'

export function DashboardPage() {
  const viewModel = useDashboardViewModel()

  return (
    <div className="fh-dashboard-page">
      <HeroBrand overview={viewModel.periodOverview} />

      <div className="fh-grid fh-dashboard-page__indicators">
        {viewModel.indicators.map((indicator) => (
          <SummaryCard key={indicator.key} indicator={indicator} />
        ))}
      </div>

      <div className="fh-grid fh-dashboard-page__insights">
        <FinancialEvolutionChart points={viewModel.evolution} />
        <CategoryBreakdown items={viewModel.categoryBreakdown} />
      </div>

      <div className="fh-grid fh-dashboard-page__lists">
        <RecentEntries entries={viewModel.recentEntries} />
        <UpcomingEntries entries={viewModel.upcomingEntries} />
      </div>
    </div>
  )
}
