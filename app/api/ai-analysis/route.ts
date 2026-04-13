import { NextRequest, NextResponse } from 'next/server'
import { getMacroReport } from '@/app/api/macro-brief/route'
import { runAutoAnalysis } from '@/lib/analysis/engine'
import { AnalysisProviderError } from '@/lib/analysis/types'
import { guardTradingMutation } from '@/lib/security/request-guard'
import { ApiError } from '@/lib/utils/errors'
import type { ChecklistResult } from '@/lib/trading/types'
import { z } from 'zod'

const checklistSchema = z
    .object({
        status: z.enum(['AUTHORIZED', 'INVALID', 'STANDBY']).default('STANDBY'),
        directionBias: z.enum(['Bullish', 'Bearish', 'Neutral']).default('Neutral'),
        grade: z.string().trim().min(1).default('C'),
        score: z.number().min(0).max(100).default(0),
    })
    .strict()

const aiAnalysisRequestSchema = z
    .object({
        symbol: z.string().trim().min(1).optional(),
        pair: z.string().trim().min(1).optional(),
        checklist: checklistSchema.default({
            status: 'STANDBY',
            directionBias: 'Neutral',
            grade: 'C',
            score: 0,
        }),
    })
    .strict()

function errorResponse(error: string, status: number) {
    return NextResponse.json({ success: false, error }, { status })
}

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

function buildFallbackMacroReport(symbol: string): Awaited<ReturnType<typeof getMacroReport>> {
    return {
        generatedAt: new Date().toISOString(),
        sources: ['Fallback Macro Context'],
        sourceDiagnostics: [],
        cache: {
            mode: 'fresh',
            fetchedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
        marketData: {
            dxy: { value: 0, trend: 'range' },
            us10y: { value: 0, trend: 'range' },
            us2y: { value: 0, trend: 'range' },
            gold_price: 0,
            sp500: 0,
            nasdaq: 0,
            oil_price: 0,
            news: [],
            newsArticles: [],
            economic_events: [],
            social_sentiment: 'mixed',
        },
        macroOverview: ['Macro data unavailable. Using fallback context.'],
        marketDrivers: ['No live market drivers available.'],
        crossAsset: {
            gold: [],
            indices: [],
        },
        newsSentiment: [],
        aiDecision: {
            goldBias: 'Neutral',
            indicesBias: 'Neutral',
            confidence: 0,
            reasoning: ['Live macro report unavailable.'],
        },
        tradeImplication: {
            whatToDo: ['Wait for cleaner confirmation.'],
            whatToAvoid: ['Do not rely on stale macro data.'],
            confirmationSignals: [],
        },
        riskFactors: ['Live macro context unavailable.'],
        decisionEngine: {
            checklistScore: 0,
            signal: 'WAIT',
            confidence: 'LOW',
            status: 'NEUTRAL',
        },
        advancedEdge: {
            marketRegime: 'range',
            conflictDetection: 'No live macro context available.',
            scoreWeighting: [],
            eventAwareness: `Fallback applied for ${symbol}.`,
        },
    }
}

export async function POST(req: NextRequest) {
    try {
        await guardTradingMutation(req, 'ai-analysis:create')
        const body = await req.json()
        const parsedBody = aiAnalysisRequestSchema.safeParse(body)
        if (!parsedBody.success) {
            return errorResponse('Invalid AI analysis request payload.', 400)
        }

        const symbol = (parsedBody.data.symbol || parsedBody.data.pair || 'XAUUSD').toUpperCase()
        const checklist = parsedBody.data.checklist as ChecklistResult
        let macroReport: Awaited<ReturnType<typeof getMacroReport>>
        try {
            macroReport = await getMacroReport((checklist.score || 0) / 10, symbol, { forceFresh: true })
        } catch {
            macroReport = buildFallbackMacroReport(symbol)
        }
        const normalizedNewsArticles = macroReport.marketData.newsArticles || []
        const newsContext =
            normalizedNewsArticles.length > 0
                ? normalizedNewsArticles.slice(0, 6).map((article) => ({
                    title: article.title,
                    source: article.source,
                    summary: article.summary,
                    sentiment: article.sentiment,
                    relevanceScore: article.relevanceScore,
                    publishedAt: article.publishedAt,
                }))
                : macroReport.marketData.news.slice(0, 6).map((headline, index) => ({
                    title: headline,
                    source: macroReport.sources[0] || 'Macro brief',
                    relevanceScore: Math.max(35, 100 - index * 12),
                }))
        const providerResult = await runAutoAnalysis({
            pair: symbol,
            timeframe: 'intraday',
            manualBias:
                checklist.directionBias === 'Bullish' ? 'bullish' : checklist.directionBias === 'Bearish' ? 'bearish' : 'neutral',
            notes: [
                `Checklist status: ${checklist.status}`,
                `Checklist grade: ${checklist.grade}`,
                `Checklist score: ${checklist.score}`,
                `Macro signal: ${macroReport.decisionEngine.signal}`,
                `Macro status: ${macroReport.decisionEngine.status}`,
                `Primary macro driver: ${macroReport.marketDrivers[0] || 'n/a'}`,
            ].join('\n'),
            context: {
                news: {
                    items: newsContext,
                },
            },
        })
        const bias =
            providerResult.recommendedBias === 'bullish'
                ? 'LONG'
                : providerResult.recommendedBias === 'bearish'
                    ? 'SHORT'
                    : deriveBias(checklist, macroReport.decisionEngine.signal)
        const verdict = deriveVerdict(checklist, macroReport.decisionEngine.signal)
        const confidence = Math.max(35, Math.min(98, providerResult.confidence))

        return NextResponse.json({
            success: true,
            analysis: {
                bias,
                confidence,
                verdict,
                summary: `${providerResult.summary} ${summarize(checklist, macroReport)}`,
                key_levels: macroReport.tradeImplication.confirmationSignals.slice(0, 3),
                risk_note: macroReport.riskFactors[0] || 'Check macro alignment before executing.',
                improvement:
                    checklist.status === 'AUTHORIZED'
                        ? 'Stay selective and keep execution quality high.'
                        : macroReport.tradeImplication.whatToDo[0] || 'Wait for stronger structure and cleaner confirmation.',
            },
        })
    } catch (err) {
        if (err instanceof ApiError) {
            return errorResponse(err.message, err.status)
        }

        if (err instanceof SyntaxError) {
            return errorResponse('Invalid AI analysis request payload.', 400)
        }

        if (err instanceof AnalysisProviderError) {
            return errorResponse('Failed to generate AI analysis.', 503)
        }

        return errorResponse('Failed to generate AI analysis.', 500)
    }
}
