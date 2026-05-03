'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="w-14 h-14 rounded-xl bg-error/10 border border-error/30 flex items-center justify-center">
        <span className="material-symbols-outlined text-error text-2xl">error_outline</span>
      </div>
      <div className="text-center">
        <h2 className="font-h2 text-h2 text-on-surface mb-2">Failed to load data</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
          {error.message || 'An unexpected error occurred while fetching your workspace data.'}
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary-container text-on-primary-container text-sm font-medium rounded-lg hover:bg-primary-fixed transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">refresh</span>
        Try again
      </button>
    </div>
  )
}
