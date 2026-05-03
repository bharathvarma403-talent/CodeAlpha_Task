export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-surface-container-high rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-surface-container rounded-lg animate-pulse" />
      </div>

      {/* Metrics skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-surface-container rounded-xl p-5 border border-outline-variant/30 space-y-3 animate-pulse"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-container-high" />
            <div className="h-8 w-16 bg-surface-container-high rounded" />
            <div className="h-3 w-24 bg-surface-container-high rounded" />
          </div>
        ))}
      </div>

      {/* Activity feed skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-32 bg-surface-container-high rounded animate-pulse" />
        <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-6 space-y-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-surface-container-high shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-surface-container-high rounded" />
                <div className="h-3 w-24 bg-surface-container-high rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
