import type { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { assertSameOrigin } from '@/lib/security/csrf'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { ApiError } from '@/lib/utils/errors'

export async function guardTradingMutation(request: NextRequest, scope: string) {
  assertSameOrigin(request)

  const user = await getAuthenticatedUser()
  if (!user) {
    throw new ApiError(401, 'Authentication required.')
  }

  await enforceRateLimit(request, `${scope}:${user.id}`)

  return user
}
