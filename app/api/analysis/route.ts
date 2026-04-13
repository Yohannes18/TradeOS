import { NextRequest, NextResponse } from 'next/server'
import { runAutoAnalysis } from '@/lib/analysis/engine'
import { AnalysisProviderError } from '@/lib/analysis/types'
import { guardTradingMutation } from '@/lib/security/request-guard'
import { ApiError } from '@/lib/utils/errors'
import { z } from 'zod'

const analysisRequestSchema = z
    .object({
        pair: z.string().trim().min(1).transform((value) => value.toUpperCase()),
        timeframe: z.enum(['scalp', 'intraday', 'swing', 'position']).default('intraday'),
        notes: z.string().trim().max(4000).default(''),
        manualBias: z.enum(['bullish', 'bearish', 'neutral']).default('neutral'),
    })
    .strict()

function errorResponse(error: string, status: number) {
    return NextResponse.json({ success: false, error }, { status })
}

export async function POST(request: NextRequest) {
    try {
        await guardTradingMutation(request, 'analysis:create')
        const body = await request.json()
        const parsedBody = analysisRequestSchema.safeParse(body)
        if (!parsedBody.success) {
            return errorResponse('Invalid analysis request payload.', 400)
        }

        const result = await runAutoAnalysis(parsedBody.data)
        return NextResponse.json({ success: true, result })
    } catch (error) {
        if (error instanceof ApiError) {
            return errorResponse(error.message, error.status)
        }

        if (error instanceof SyntaxError) {
            return errorResponse('Invalid analysis request payload.', 400)
        }

        if (error instanceof AnalysisProviderError) {
            return errorResponse('Failed to run auto analysis.', 503)
        }

        return errorResponse('Failed to run auto analysis.', 500)
    }
}
