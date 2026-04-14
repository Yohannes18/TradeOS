import { cookies } from 'next/headers'

export interface AuthSession {
  userId: string
  email: string
}

/**
 * Extract and verify the authenticated Supabase session.
 * Throws a structured error if the user is not authenticated.
 *
 * Usage in any protected API route:
 *   const session = await requireSession()
 *   // session.userId is now safe to use
 */
export async function requireSession(): Promise<AuthSession> {
  const { createServerClient } = await import('@/lib/supabase/server')
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    const err = new Error('Authentication required') as any
    err.code = 'UNAUTHENTICATED'
    err.httpStatus = 401
    throw err
  }

  return { userId: user.id, email: user.email ?? '' }
}
