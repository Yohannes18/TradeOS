import { NextRequest } from 'next/server'
import { ApiError } from '@/lib/utils/errors'

/**
 * Rate limiting via Upstash Redis.
 *
 * Setup:
 *   npm install @upstash/ratelimit @upstash/redis
 *   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel
 *
 * Without Upstash configured, this is a no-op (logs warning, passes requests).
 */

let Ratelimit: any
let Redis: any
let redis: any
const limiters: Record<string, any> = {}
let initialized = false

async function init() {
  if (initialized) return
  initialized = true
  try {
    const rl = await import('@upstash/ratelimit' as string)
    const rd = await import('@upstash/redis' as string)
    Ratelimit = rl.Ratelimit
    Redis = rd.Redis
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      console.warn('[rate-limit] UPSTASH_REDIS_REST_URL not set — rate limiting disabled')
      return
    }
    redis = Redis.fromEnv()
    const make = (n: number, w: string, p: string) =>
      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(n, w), analytics: true, prefix: p })
    limiters.ai    = make(10,  '1 m',  'rl:ai')
    limiters.trade = make(30,  '1 m',  'rl:trade')
    limiters.read  = make(120, '1 m',  'rl:read')
    limiters.auth  = make(5,   '15 m', 'rl:auth')
  } catch {
    console.warn('[rate-limit] @upstash/ratelimit not installed — rate limiting disabled')
  }
}

export type LimiterKey = 'ai' | 'trade' | 'read' | 'auth'

export async function checkRateLimit(
  key: LimiterKey,
  identifier: string
): Promise<Response | null> {
  await init()
  if (!limiters[key]) return null
  const { success, remaining, reset } = await limiters[key].limit(identifier)
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    return Response.json(
      { error: 'Too many requests', code: 'RATE_LIMITED', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }
  return null
}

export function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  return `ip:${ip}`
}

export async function enforceRateLimit(
  request: NextRequest,
  identifier: string,
  key: LimiterKey = 'trade',
): Promise<void> {
  const blockedResponse = await checkRateLimit(key, getIdentifier(request, identifier))
  if (!blockedResponse) return

  let message = 'Too many requests.'
  let details: unknown

  try {
    const payload = await blockedResponse.json() as { error?: string; code?: string; retryAfter?: number }
    message = payload.error || message
    details = payload
  } catch {
    details = undefined
  }

  throw new ApiError(429, message, details)
}
