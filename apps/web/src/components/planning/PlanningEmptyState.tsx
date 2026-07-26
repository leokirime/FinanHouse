import './Planning.css'

export interface PlanningEmptyStateProps {
  title: string
  description: string
}

export function PlanningEmptyState({ title, description }: PlanningEmptyStateProps) {
  return (
    <section className="fh-card fh-planning-empty" aria-live="polite">
      <h2>{title}</h2>
      <p className="fh-text-secondary">{description}</p>
    </section>
  )
}
