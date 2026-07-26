import './Comparison.css'

export interface ComparisonEmptyStateProps {
  title: string
  description: string
}

export function ComparisonEmptyState({ title, description }: ComparisonEmptyStateProps) {
  return (
    <section className="fh-card fh-comparison-empty" aria-live="polite">
      <h2>{title}</h2>
      <p className="fh-text-secondary">{description}</p>
    </section>
  )
}
