import { NextRequest, NextResponse } from 'next/server'
import { getMacroReport } from '@/app/api/macro-brief/route'
import type { ChecklistResult } from '@/lib/trading/types'

function deriveBias(checklist: ChecklistResult, macroSignal: string) {
    if (checklist.directionBias === 'Bullish') return 'LONG'
    if (checklist.directionBias === 'Bearish') return 'SHORT'
    if (macroSignal === 'BUY') return 'LONG'
    if (macroSignal === 'SELL') return 'SHORT'
    return 'NEUTRAL'
}

function deriveVerdict(checklist: ChecklistResult, macroSignal: string) {
    if (checklist.status === 'INVALID') return 'INVALID'
    if (checklist.status === 'AUTHORIZED' && (macroSignal === 'BUY' || macroSignal === 'SELL' || macroSignal === 'WAIT')) {
        return 'AUTHORIZED'
    }
    return 'STANDBY'
}

function summarize(checklist: ChecklistResult, report: Awaited<ReturnType<typeof getMacroReport>>) {
    const firstMacro = report.macroOverview[0] || 'Macro context is neutral.'
    const firstDriver = report.marketDrivers[0] || 'Cross-asset drivers are balanced.'
    return `${firstMacro} ${firstDriver} Checklist grade is ${checklist.grade} with ${checklist.score}% confluence.`
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const symbol = body.symbol || body.pair || 'XAUUSD'
        const checklist = (body.checklist || {}) as ChecklistResult
        const macroReport = await getMacroReport((checklist.score || 0) / 10, symbol)
        const bias = deriveBias(checklist, macroReport.decisionEngine.signal)
        const verdict = deriveVerdict(checklist, macroReport.decisionEngine.signal)
        const confidence = Math.max(
            35,
            Math.min(
                98,
                Math.round((macroReport.aiDecision.confidence + (checklist.score || 0)) / 2),
            ),
        )

        return NextResponse.json({
            success: true,
            analysis: {
                bias,
                confidence,
                verdict,
                summary: summarize(checklist, macroReport),
                key_levels: macroReport.tradeImplication.confirmationSignals.slice(0, 3),
                risk_note: macroReport.riskFactors[0] || 'Check macro alignment before executing.',
                improvement:
                    checklist.status === 'AUTHORIZED'
                        ? 'Stay selective and keep execution quality high.'
                        : macroReport.tradeImplication.whatToDo[0] || 'Wait for stronger structure and cleaner confirmation.',
            },
        })
    } catch (err) {
        return NextResponse.json({
            success: false,
            analysis: {
                bias: 'NEUTRAL',
                confidence: 45,
                verdict: 'STANDBY',
                summary: 'Macro-linked AI analysis is temporarily unavailable. Use the enforced checklist output while the report reloads.',
                key_levels: ['HTF structure', 'LTF liquidity', 'DXY confirmation'],
                risk_note: 'Do not override failed gates with discretion.',
                improvement: 'Refresh the macro report and verify quarter behavior before execution.',
            },
            error: err instanceof Error ? err.message : 'Unknown error',
        })
    }
}
