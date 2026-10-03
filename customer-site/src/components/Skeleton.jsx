export default function Skeleton({ rows = 3, height = 14, className = '' }) {
  return (
    <div className={`skeleton-stack ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height,
            width: i === rows - 1 ? '70%' : '100%',
            marginBottom: 8,
          }}
        />
      ))}
    </div>
  );
}
