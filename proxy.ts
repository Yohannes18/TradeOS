import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

// Public routes that never require authentication
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/sign-up',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/callback',
  '/auth/confirm',
  '/auth/error',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public auth routes through immediately
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next({ request })
  }

  // Cron endpoints authenticate via CRON_SECRET header (handled inside the route)
  if (pathname.startsWith('/api/cron')) {
    return NextResponse.next({ request })
  }

  // Single auth system: Supabase SSR only.
  // Better Auth removed — dual-auth fallback was a silent security risk.
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
