import { NextResponse, type NextRequest } from 'next/server'
import { isBetterAuthEnabled } from '@/lib/auth/config'

async function hasBetterAuthSession(request: NextRequest): Promise<boolean> {
    const sessionUrl = new URL('/api/auth/get-session', request.url)
    const response = await fetch(sessionUrl, {
        method: 'GET',
        headers: {
            cookie: request.headers.get('cookie') || '',
            accept: 'application/json',
        },
        cache: 'no-store',
    })

    if (!response.ok) return false

    const payload = await response.json().catch(() => null)
    if (!payload) return false

    if (payload?.user) return true
    if (payload?.session?.user) return true
    if (payload?.data?.user) return true

    return false
}

export async function updateBetterAuthSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    const isProtectedPath = pathname.startsWith('/dashboard')
    const isAuthPath = pathname.startsWith('/auth')

    if (!isBetterAuthEnabled) {
        return NextResponse.next({ request })
    }

    let hasSession = false
    try {
        hasSession = await hasBetterAuthSession(request)
    } catch {
        hasSession = false
    }

    if (isProtectedPath && !hasSession) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        const fullPath = `${pathname}${request.nextUrl.search}`
        url.searchParams.set('next', fullPath)
        return NextResponse.redirect(url)
    }

    if (isAuthPath && hasSession) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return NextResponse.next({ request })
}
