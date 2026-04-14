import { NextResponse } from 'next/server'

import { prewarmMacroBriefReports } from '../../macro-brief/route'

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
