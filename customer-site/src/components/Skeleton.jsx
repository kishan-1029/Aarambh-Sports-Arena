export default function Skeleton({ rows = 3, height = 14, className = '' }) {
  return (
    <div className={`skeleton-stack ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height,
            width: i === rows - 1 ? '68%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4, className = 'sport-grid' }) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <article className="skeleton-card" key={i}>
          <div className="skeleton" style={{ height: 16, width: '36%' }} />
          <div className="skeleton" style={{ height: 26, width: '72%' }} />
          <div className="skeleton" style={{ height: 12, width: '90%' }} />
          <div className="skeleton" style={{ height: 12, width: '64%' }} />
          <div className="skeleton sk-btn" />
        </article>
      ))}
    </div>
  );
}

export function SkeletonSlots({ count = 8 }) {
  return (
    <div className="slot-grid" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton sk-slot" key={i} />
      ))}
    </div>
  );
}
