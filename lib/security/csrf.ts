import { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[]

/**
 * Validate request origin to prevent CSRF attacks.
 *
 * Call this at the top of every POST, PATCH, DELETE handler:
 *   if (!validateCsrfOrigin(request)) return csrfError()
 *
 * Why: Next.js App Router has no built-in CSRF protection.
 * Cross-origin POST requests from malicious sites will execute
 * against authenticated users if this check is missing.
 */
export function validateCsrfOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  if (!origin && !referer) return false

  try {
    const source = origin ?? new URL(referer!).origin
    return ALLOWED_ORIGINS.some((allowed) => source.startsWith(allowed))
  } catch {
    return false
  }
}

export function csrfError(): Response {
  return Response.json(
    { error: 'Forbidden', code: 'CSRF_VIOLATION' },
    { status: 403 }
  )
}
