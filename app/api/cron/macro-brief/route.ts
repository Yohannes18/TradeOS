import { NextResponse } from 'next/server'

import { prewarmMacroBriefReports } from '../../macro-brief/route'

function isAuthorized(request: Request): boolean {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return false
    }

    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
    const queryToken = new URL(request.url).searchParams.get('secret')

    return bearerToken === cronSecret || queryToken === cronSecret
}

export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const warmed = await prewarmMacroBriefReports()
        return NextResponse.json({
            ok: true,
            warmedAt: new Date().toISOString(),
            entries: warmed,
        })
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        )
    }
}
