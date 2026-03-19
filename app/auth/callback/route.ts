import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/auth/redirect'

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code')
    const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'))

    if (!code) {
        return NextResponse.redirect(new URL('/auth/error', request.url))
    }

    try {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            return NextResponse.redirect(new URL('/auth/error', request.url))
        }

        return NextResponse.redirect(new URL(nextPath, request.url))
    } catch {
        return NextResponse.redirect(new URL('/auth/error', request.url))
    }
}
