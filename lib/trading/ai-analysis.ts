import type { AIAnalysisResult, ChecklistResult } from '@/lib/trading/types'

const SYMBOL_PROFILES: Record<string, { bias: 'LONG' | 'SHORT' | 'NEUTRAL'; newsImpact: string; events: string[]; socialSentiment: string }> = {
    XAUUSD: {
        bias: 'LONG',
        newsImpact: 'USD softness and real-yield compression support gold demand.',
        events: ['US CPI', 'Fed Chair Speech', 'US10Y Auction'],
        socialSentiment: 'Risk-off leaning with elevated gold mentions.',
    },
    EURUSD: {
        bias: 'LONG',
        newsImpact: 'ECB hold with improving euro-zone PMIs supports mild upside.',
        events: ['ECB Minutes', 'US NFP', 'Euro CPI Flash'],
        socialSentiment: 'Constructive risk appetite and stable positioning.',
    },
    GBPUSD: {
        bias: 'NEUTRAL',
        newsImpact: 'Conflicting inflation and growth data keeps sterling in balance.',
        events: ['BoE Commentary', 'UK CPI', 'US Retail Sales'],
        socialSentiment: 'Mixed sentiment with two-way flow.',
    },
    US10Y: {
        bias: 'SHORT',
        newsImpact: 'Higher issuance pressure and sticky inflation expectations.',
        events: ['Treasury Auction', 'Fed Speakers', 'PCE Core'],
        socialSentiment: 'Bond bears active; duration remains under pressure.',
    },
}

export function buildAIAnalysis(symbol: string, checklist: ChecklistResult): AIAnalysisResult {
    const profile = SYMBOL_PROFILES[symbol] || {
        bias: 'NEUTRAL' as const,
        newsImpact: 'No dominant macro impulse detected.',
        events: ['High-impact data pending'],
        socialSentiment: 'Neutral with low conviction.',
    }

    const baseConfidence = profile.bias === 'NEUTRAL' ? 54 : 66
    const checklistBoost = checklist.status === 'AUTHORIZED' ? 20 : checklist.status === 'STANDBY' ? 4 : -18
    const confidence = Math.max(0, Math.min(100, baseConfidence + checklistBoost))

    const recommendedAction: AIAnalysisResult['recommendedAction'] =
        checklist.status === 'INVALID'
            ? 'INVALID'
            : confidence >= 75
                ? 'CONFIRM'
                : 'WAIT'

    return {
        symbol,
        bias: recommendedAction === 'INVALID' ? 'NEUTRAL' : profile.bias,
        confidence,
        checklistGrade: checklist.grade,
        newsImpact: profile.newsImpact,
        economicEvents: profile.events,
        socialSentiment: profile.socialSentiment,
        recommendedAction,
    }
}
