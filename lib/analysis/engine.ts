import { AnalysisBias, AnalysisInput, AnalysisResult } from './types'

type ProviderResult = {
    provider: 'gemini' | 'deepseek'
    recommendedBias: AnalysisBias
    confidence: number
    summary: string
    keyDrivers: string[]
    riskFlags: string[]
}

function normalizeBias(value: string | undefined | null): AnalysisBias {
    const normalized = (value || '').toLowerCase()
    if (normalized.includes('bull')) return 'bullish'
    if (normalized.includes('bear')) return 'bearish'
    return 'neutral'
}

function clampConfidence(value: number): number {
    if (Number.isNaN(value)) return 50
    return Math.max(0, Math.min(100, Math.round(value)))
}

function keywordScore(text: string, patterns: string[]): number {
    return patterns.reduce((score, pattern) => {
        return score + (text.includes(pattern) ? 1 : 0)
    }, 0)
}

function heuristicAnalysis(input: AnalysisInput): AnalysisResult {
    const notes = (input.notes || '').toLowerCase()
    const pair = input.pair.toUpperCase()

    let macroBull = 0
    let macroBear = 0
    let fundamentalBull = 0
    let fundamentalBear = 0

    const hawkishHits = keywordScore(notes, ['hawkish', 'rate hike', 'higher for longer', 'strong jobs'])
    const dovishHits = keywordScore(notes, ['dovish', 'rate cut', 'easing', 'weak jobs'])
    const riskOnHits = keywordScore(notes, ['risk-on', 'equity rally', 'growth'])
    const riskOffHits = keywordScore(notes, ['risk-off', 'recession', 'geopolitical', 'flight to safety'])

    macroBull += dovishHits + riskOnHits
    macroBear += hawkishHits + riskOffHits

    const inflationHotHits = keywordScore(notes, ['hot cpi', 'higher inflation', 'sticky inflation'])
    const inflationCoolHits = keywordScore(notes, ['cool cpi', 'disinflation', 'falling inflation'])
    const strongNfpHits = keywordScore(notes, ['strong nfp', 'beat nfp'])
    const weakNfpHits = keywordScore(notes, ['weak nfp', 'miss nfp'])

    fundamentalBull += inflationCoolHits + weakNfpHits
    fundamentalBear += inflationHotHits + strongNfpHits

    if (pair.includes('XAU')) {
        macroBull += riskOffHits
        macroBear += riskOnHits + hawkishHits
        fundamentalBull += inflationHotHits
    }

    if (pair.includes('BTC') || pair.includes('ETH')) {
        macroBull += riskOnHits + dovishHits
        macroBear += riskOffHits + hawkishHits
    }

    if (pair.includes('USD')) {
        macroBull += hawkishHits
        macroBear += dovishHits
    }

    if (input.manualBias === 'bullish') macroBull += 1
    if (input.manualBias === 'bearish') macroBear += 1

    const bullScore = macroBull + fundamentalBull
    const bearScore = macroBear + fundamentalBear
    const delta = bullScore - bearScore

    const recommendedBias: AnalysisBias =
        delta >= 2 ? 'bullish' : delta <= -2 ? 'bearish' : 'neutral'

    const confidence = clampConfidence(55 + Math.abs(delta) * 8 + Math.min(15, (hawkishHits + dovishHits + riskOnHits + riskOffHits) * 2))

    const keyDrivers = [
        hawkishHits > 0 ? 'Hawkish policy tone detected' : null,
        dovishHits > 0 ? 'Dovish policy tone detected' : null,
        riskOnHits > 0 ? 'Risk-on sentiment cues present' : null,
        riskOffHits > 0 ? 'Risk-off sentiment cues present' : null,
        inflationHotHits > 0 ? 'Inflation pressure signals detected' : null,
        inflationCoolHits > 0 ? 'Disinflation signals detected' : null,
    ].filter((item): item is string => Boolean(item))

    const riskFlags = [
        Math.abs(delta) <= 1 ? 'Macro and fundamentals are mixed' : null,
        confidence < 65 ? 'Low confidence setup — reduce size or wait for confirmation' : null,
        !notes.trim() ? 'No contextual notes provided — analysis relies on baseline heuristics' : null,
    ].filter((item): item is string => Boolean(item))

    const summary =
        recommendedBias === 'bullish'
            ? 'Macro and fundamental signals lean bullish, but validate with price action before execution.'
            : recommendedBias === 'bearish'
                ? 'Macro and fundamental signals lean bearish, but validate with structure and liquidity before entry.'
                : 'Signals are balanced; wait for clearer confirmation before committing risk.'

    return {
        recommendedBias,
        confidence,
        summary,
        keyDrivers,
        riskFlags,
        providersUsed: ['heuristic'],
        macroScore: { bullish: macroBull, bearish: macroBear },
        fundamentalScore: { bullish: fundamentalBull, bearish: fundamentalBear },
    }
}

function safeJsonParse<T>(value: string): T | null {
    try {
        return JSON.parse(value) as T
    } catch {
        return null
    }
}

async function analyzeWithGemini(input: AnalysisInput, baseline: AnalysisResult): Promise<ProviderResult | null> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return null

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
    const prompt = `You are a trading analyst. Return ONLY valid JSON with shape: {"recommendedBias":"bullish|bearish|neutral","confidence":number,"summary":string,"keyDrivers":string[],"riskFlags":string[]}.
Pair: ${input.pair}
Timeframe: ${input.timeframe}
Manual bias: ${input.manualBias || 'neutral'}
User notes: ${input.notes || 'none'}
Baseline summary: ${baseline.summary}
Baseline bias: ${baseline.recommendedBias}
Baseline confidence: ${baseline.confidence}`

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
        }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw || typeof raw !== 'string') return null

    const parsed = safeJsonParse<{
        recommendedBias?: string
        confidence?: number
        summary?: string
        keyDrivers?: string[]
        riskFlags?: string[]
    }>(raw)
    if (!parsed) return null

    return {
        provider: 'gemini',
        recommendedBias: normalizeBias(parsed.recommendedBias),
        confidence: clampConfidence(parsed.confidence ?? 50),
        summary: parsed.summary || 'Gemini analysis produced no summary.',
        keyDrivers: parsed.keyDrivers || [],
        riskFlags: parsed.riskFlags || [],
    }
}

async function analyzeWithDeepSeek(input: AnalysisInput, baseline: AnalysisResult): Promise<ProviderResult | null> {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) return null

    const prompt = `You are a trading analyst. Return ONLY valid JSON with shape: {"recommendedBias":"bullish|bearish|neutral","confidence":number,"summary":string,"keyDrivers":string[],"riskFlags":string[]}.
Pair: ${input.pair}
Timeframe: ${input.timeframe}
Manual bias: ${input.manualBias || 'neutral'}
User notes: ${input.notes || 'none'}
Baseline summary: ${baseline.summary}
Baseline bias: ${baseline.recommendedBias}
Baseline confidence: ${baseline.confidence}`

    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            temperature: 0.2,
            messages: [
                { role: 'system', content: 'You are an expert macro and fundamental trading analyst.' },
                { role: 'user', content: prompt },
            ],
        }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content
    if (!raw || typeof raw !== 'string') return null

    const parsed = safeJsonParse<{
        recommendedBias?: string
        confidence?: number
        summary?: string
        keyDrivers?: string[]
        riskFlags?: string[]
    }>(raw)
    if (!parsed) return null

    return {
        provider: 'deepseek',
        recommendedBias: normalizeBias(parsed.recommendedBias),
        confidence: clampConfidence(parsed.confidence ?? 50),
        summary: parsed.summary || 'DeepSeek analysis produced no summary.',
        keyDrivers: parsed.keyDrivers || [],
        riskFlags: parsed.riskFlags || [],
    }
}

function mergeResults(baseline: AnalysisResult, providers: ProviderResult[]): AnalysisResult {
    if (providers.length === 0) {
        return baseline
    }

    const bullishVotes = providers.filter((item) => item.recommendedBias === 'bullish').length
    const bearishVotes = providers.filter((item) => item.recommendedBias === 'bearish').length

    const recommendedBias: AnalysisBias =
        bullishVotes > bearishVotes
            ? 'bullish'
            : bearishVotes > bullishVotes
                ? 'bearish'
                : baseline.recommendedBias

    const confidence = clampConfidence(
        Math.round(
            (baseline.confidence + providers.reduce((acc, item) => acc + item.confidence, 0)) / (providers.length + 1),
        ),
    )

    const keyDrivers = Array.from(
        new Set([baseline.summary, ...baseline.keyDrivers, ...providers.flatMap((item) => item.keyDrivers)]),
    ).slice(0, 6)

    const riskFlags = Array.from(
        new Set([...baseline.riskFlags, ...providers.flatMap((item) => item.riskFlags)]),
    ).slice(0, 6)

    const providerSummaries = providers.map((item) => `${item.provider}: ${item.summary}`)

    return {
        ...baseline,
        recommendedBias,
        confidence,
        summary: [baseline.summary, ...providerSummaries].join(' '),
        keyDrivers,
        riskFlags,
        providersUsed: [...baseline.providersUsed, ...providers.map((item) => item.provider)],
    }
}

export async function runAutoAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
    const baseline = heuristicAnalysis(input)

    const [geminiResult, deepseekResult] = await Promise.all([
        analyzeWithGemini(input, baseline),
        analyzeWithDeepSeek(input, baseline),
    ])

    const providers = [geminiResult, deepseekResult].filter((item): item is ProviderResult => Boolean(item))
    return mergeResults(baseline, providers)
}
