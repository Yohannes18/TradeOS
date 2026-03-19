import { NextRequest, NextResponse } from 'next/server'
import { runAutoAnalysis } from '@/lib/analysis/engine'
import { AnalysisBias } from '@/lib/analysis/types'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const pair = String(body?.pair || '').trim().toUpperCase()
        const timeframe = String(body?.timeframe || 'intraday') as 'scalp' | 'intraday' | 'swing' | 'position'
        const notes = String(body?.notes || '').trim()
        const manualBias = String(body?.manualBias || 'neutral') as AnalysisBias

        if (!pair) {
            return NextResponse.json({ error: 'Pair is required.' }, { status: 400 })
        }

        const result = await runAutoAnalysis({
            pair,
            timeframe,
            notes,
            manualBias,
        })

        return NextResponse.json({ result })
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to run auto analysis.',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        )
    }
}
