import { NextResponse, type NextRequest } from 'next/server'
import { assertSameOrigin } from '@/lib/security/csrf'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { ApiError } from '@/lib/utils/errors'

const PROTECTED_PREFIXES = ['/api/pre-trade', '/api/execution', '/api/journal']

export function isProtectedTradingApi(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function applyTradingApiMiddleware(request: NextRequest) {
  if (!isProtectedTradingApi(request.nextUrl.pathname)) {
    return null
  }

  try {
    assertSameOrigin(request)
    await enforceRateLimit(request, `edge:${request.nextUrl.pathname}`)
    return null
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    return NextResponse.json({ error: 'Security middleware failed.' }, { status: 500 })
  }
}
