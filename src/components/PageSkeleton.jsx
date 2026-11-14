export default function PageSkeleton({ cards = 3 }) {
  return (
    <div className="page-skeleton" role="status" aria-label="Loading content">
      <span className="skeleton-line skeleton-heading" />
      <span className="skeleton-line skeleton-copy" />
      <div className="skeleton-card-grid">
        {Array.from({ length: cards }, (_, index) => (
          <div className="skeleton-card" key={index}>
            <span className="skeleton-block" />
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-copy" />
          </div>
        ))}
      </div>
    </div>
  )
}
