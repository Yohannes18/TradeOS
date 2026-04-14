'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global error boundary — prevents a single component crash from
 * unmounting the entire trading dashboard.
 *
 * Also add route-level error.tsx files inside each segment:
 *   app/(dashboard)/pre-trade/error.tsx
 *   app/(dashboard)/journal/error.tsx
 */
export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Wire up Sentry here: Sentry.captureException(error)
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-muted-foreground">ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
