import { updateSession } from '@/lib/supabase/middleware'
import { updateBetterAuthSession } from '@/lib/auth/middleware'
import { applyTradingApiMiddleware } from '@/lib/security/trading-api-middleware'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    const tradingApiResponse = await applyTradingApiMiddleware(request)
    if (tradingApiResponse) {
        return tradingApiResponse
    }

    if (request.nextUrl.pathname.startsWith('/api/auth')) {
        return NextResponse.next({ request })
    }

    if (process.env.BETTER_AUTH_ENABLED === 'true') {
        try {
            return await updateBetterAuthSession(request)
        } catch {
            return await updateSession(request)
        }
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
