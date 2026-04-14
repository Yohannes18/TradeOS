import { ApiError } from '@/lib/utils/errors'

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
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new ApiError(401, 'Authentication required.', { code: 'UNAUTHENTICATED' })
  }

  return { userId: user.id, email: user.email ?? '' }
}
