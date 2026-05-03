'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0f] text-white flex items-center justify-center min-h-screen font-sans">
        <div className="max-w-md text-center px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <span className="text-red-400 text-3xl">!</span>
          </div>
          <h1 className="text-2xl font-bold mb-3 text-white">Something went wrong</h1>
          <p className="text-gray-400 text-sm mb-2">
            An unexpected error occurred. This has been recorded.
          </p>
          {error.digest && (
            <p className="text-gray-600 text-xs font-mono mb-6">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
