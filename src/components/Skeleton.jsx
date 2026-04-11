/**
 * Skeleton loading placeholders.
 *
 * Use to indicate progress while Firestore data is loading.
 *   <SkeletonCard />               — one card placeholder
 *   <SkeletonList count={3} />     — multiple card placeholders
 *   <SkeletonStatGrid count={4} /> — stat grid placeholder
 */

export function SkeletonLine({ width = '100%', height = 14 }) {
  return <div className="skeleton-line" style={{ width, height }} />;
}

export function SkeletonCard() {
  return (
    <div className="card skeleton-card">
      <SkeletonLine width="40%" height={18} />
      <div style={{ height: 12 }} />
      <SkeletonLine width="90%" />
      <div style={{ height: 8 }} />
      <SkeletonLine width="70%" />
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}

export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="grid-4 mb-16">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card stat-card skeleton-card">
          <div className="skeleton-circle" />
          <SkeletonLine width="60%" height={24} />
          <div style={{ height: 6 }} />
          <SkeletonLine width="80%" height={10} />
        </div>
      ))}
    </div>
  );
}
