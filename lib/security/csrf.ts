import type { NextRequest } from 'next/server'
import { ApiError } from '@/lib/utils/errors'

const STATEFUL_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function getRequestHost(request: NextRequest) {
  return request.headers.get('x-forwarded-host') || request.headers.get('host')
}

export function assertSameOrigin(request: NextRequest) {
  if (!STATEFUL_METHODS.has(request.method)) {
    return
  }

  const requestHost = getRequestHost(request)
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  if (origin) {
    const originHost = new URL(origin).host
    if (originHost !== requestHost) {
      throw new ApiError(403, 'Cross-site requests are not allowed.')
    }
    return
  }

  if (referer) {
    const refererHost = new URL(referer).host
    if (refererHost !== requestHost) {
      throw new ApiError(403, 'Cross-site requests are not allowed.')
    }
    return
  }

  throw new ApiError(403, 'Origin header is required for state-changing requests.')
}
