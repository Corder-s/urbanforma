/** Dashboard loading skeleton — calm placeholder shapes, no blank screen. */
export function DashboardSkeleton() {
  const block = "animate-pulse bg-surface-2";
  return (
    <div role="status" aria-label="Loading your workspace" className="animate-fade-in space-y-6">
      {/* greeting */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2.5">
          <div className={`h-7 w-64 rounded-xl ${block}`} />
          <div className={`h-4 w-80 max-w-full rounded-xl ${block}`} />
        </div>
        <div className={`h-11 w-36 rounded-xl ${block}`} />
      </div>

      {/* continue working */}
      <div className={`h-72 w-full rounded-3xl ${block}`} />

      {/* quick actions + metrics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-24 rounded-2xl ${block}`} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-24 rounded-2xl ${block}`} />
          ))}
        </div>
      </div>

      {/* recent projects */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-64 rounded-3xl ${block}`} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
