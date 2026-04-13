import { getAuthenticatedUser } from '@/lib/auth/server-user'
import { getCachedTradingAnalytics } from '@/lib/services/analytics-service'
import { handleRouteError, ok } from '@/lib/utils/http'
import { ApiError } from '@/lib/utils/errors'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      throw new ApiError(401, 'Authentication required.')
    }

    const analytics = await getCachedTradingAnalytics(user.id)
    return ok({ analytics })
  } catch (error) {
    return handleRouteError(error)
  }
}
