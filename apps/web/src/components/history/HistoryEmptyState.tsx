import './History.css'

export interface HistoryEmptyStateProps {
  title: string
  description: string
}

export function HistoryEmptyState({ title, description }: HistoryEmptyStateProps) {
  return (
    <section className="fh-card fh-history-empty" aria-live="polite">
      <h2>{title}</h2>
      <p className="fh-text-secondary">{description}</p>
    </section>
  )
}
