import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { ApiError } from '@/lib/utils/errors'

let ratelimit: Ratelimit | null | undefined

function getRatelimit() {
  if (ratelimit !== undefined) {
    return ratelimit
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    ratelimit = null
    return ratelimit
  }

  const redis = new Redis({ url, token })
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'tradeos-api',
  })

  return ratelimit
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return request.headers.get('x-real-ip') || 'unknown'
}

export async function enforceRateLimit(request: NextRequest, identifier: string) {
  const limiter = getRatelimit()

  if (!limiter) {
    return
  }

  const result = await limiter.limit(`${identifier}:${getClientIp(request)}`)

  if (!result.success) {
    throw new ApiError(429, 'Rate limit exceeded.')
  }
}
