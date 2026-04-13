import { AnalysisBias, AnalysisInput, AnalysisResult, type NewsContextArticle } from './types'
import { z } from 'zod'

type AnalysisCacheEntry = {
    result: AnalysisResult
    storedAt: string
}

type ProviderResult = {
    provider: 'gemini' | 'deepseek'
    bias: AnalysisBias
    confidence: number
    keyLevels: string[]
    reasoning: string
    riskScore: number
    riskFlags: string[]
}

const providerOutputSchema = z
    .object({
        bias: z.enum(['bullish', 'bearish', 'neutral']),
        confidence: z.number().min(0).max(100),
        key_levels: z.array(z.string().trim().min(1)).max(8),
        reasoning: z.string().trim().min(1),
        risk_score: z.number().min(0).max(100),
    })
    .strict()

const providerPayloadSchema = z.object({
    bias: z.string().optional(),
    confidence: z.number().min(0).max(100),
    key_levels: z.array(z.string()).optional(),
    reasoning: z.string().optional(),
    risk_score: z.number().min(0).max(100).optional(),
})

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

function clampRiskScore(value: number): number {
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

function sanitizeList(values: string[] | undefined): string[] {
    if (!values) return []
    return values
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 6)
}

function formatSection(title: string, entries: Array<[string, string]>): string {
    const lines = entries
        .filter(([, value]) => value.trim().length > 0)
        .map(([label, value]) => `- ${label}: ${value}`)

    return [title, ...(lines.length > 0 ? lines : ['- Not provided'])].join('\n')
}

function formatList(values: string[] | undefined): string {
    const list = sanitizeList(values)
    return list.length > 0 ? list.join('; ') : 'Not provided'
}

function getNewsKeywords(pair: string): string[] {
    if (pair.includes('XAU')) {
        return ['gold', 'bullion', 'dollar', 'dxy', 'treasury', 'yield', 'yields', 'fed', 'rates', 'inflation', 'risk-off']
    }

    if (pair.includes('BTC') || pair.includes('ETH')) {
        return ['risk-on', 'risk-off', 'fed', 'rates', 'dollar', 'liquidity', 'etf', 'regulation', 'inflation']
    }

    if (pair.includes('JPY')) {
        return ['yen', 'boj', 'rates', 'yield', 'yields', 'dollar', 'intervention', 'inflation']
    }

    if (pair.includes('GBP') || pair.includes('EUR')) {
        return ['fed', 'ecb', 'boj', 'boe', 'rates', 'inflation', 'dollar', 'pmi', 'cpi']
    }

    return ['fed', 'rates', 'inflation', 'dollar', 'yield', 'yields', 'risk-on', 'risk-off', 'cpi', 'pce', 'nfp']
}

function parsePublishedAt(value?: string | Date): number {
    if (!value) return 0
    const time = value instanceof Date ? value.getTime() : Date.parse(value)
    return Number.isNaN(time) ? 0 : time
}

function scoreNewsArticle(article: NewsContextArticle, pair: string, baseline: AnalysisResult, notes: string): number {
    const haystack = `${article.title} ${article.source} ${article.summary || ''}`.toLowerCase()
    const keywords = getNewsKeywords(pair)
    const contextText = `${baseline.summary} ${notes}`.toLowerCase()

    const keywordHits = keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0)
    const generalSignals = ['fed', 'cpi', 'pce', 'nfp', 'inflation', 'rates', 'dollar', 'treasury', 'yield', 'risk-off', 'risk-on']
        .reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0)
    const contextualOverlap = ['fed', 'cpi', 'pce', 'nfp', 'inflation', 'rates', 'dollar', 'treasury', 'yield', 'risk-off', 'risk-on']
        .reduce((score, keyword) => score + ((contextText.includes(keyword) && haystack.includes(keyword)) ? 1 : 0), 0)

    const relevance = typeof article.relevanceScore === 'number' && Number.isFinite(article.relevanceScore)
        ? Math.max(0, Math.min(100, article.relevanceScore))
        : 0
    const recencyBonus = article.publishedAt ? Math.max(0, 20 - Math.min(20, (Date.now() - parsePublishedAt(article.publishedAt)) / (1000 * 60 * 60))) : 0
    const sentimentBonus = article.sentiment === 'negative' ? 4 : article.sentiment === 'positive' ? 3 : 0
    const genericPenalty = /\b(update|watchlist|recap|market open|daily brief|roundup)\b/i.test(article.title) ? -6 : 0

    return relevance * 0.55 + keywordHits * 14 + generalSignals * 2 + contextualOverlap + recencyBonus + sentimentBonus + genericPenalty
}

function selectRelevantNewsArticles(input: AnalysisInput, baseline: AnalysisResult): NewsContextArticle[] {
    const items = input.context?.news?.items || []
    if (items.length === 0) {
        return []
    }

    const scored = items
        .map((item) => ({
            item,
            score: scoreNewsArticle(item, input.pair.toUpperCase(), baseline, input.notes || ''),
            publishedAt: parsePublishedAt(item.publishedAt),
        }))
        .filter((entry) => entry.score >= 12 || entry.item.relevanceScore === 100)
        .sort((left, right) => right.score - left.score || right.publishedAt - left.publishedAt)

    return scored.slice(0, 4).map((entry) => entry.item)
}

function formatNewsSection(items: NewsContextArticle[]): string {
    if (items.length === 0) {
        return 'News Context\n- Not provided'
    }

    const lines = items.map((item) => {
        const parts = [`[${item.source}] ${item.title}`]
        if (item.summary) parts.push(item.summary)
        if (item.sentiment) parts.push(`sentiment=${item.sentiment}`)
        return `- ${parts.join(' | ')}`
    })

    return ['News Context', ...lines].join('\n')
}

function buildNewsDigest(input: AnalysisInput, baseline: AnalysisResult): string {
    const selected = selectRelevantNewsArticles(input, baseline)
    if (selected.length === 0) {
        return ''
    }

    return selected
        .slice(0, 2)
        .map((item) => `${item.source}: ${item.title}`)
        .join(' | ')
}

function appendNewsSignal(result: AnalysisResult, newsDigest: string): AnalysisResult {
    if (!newsDigest) {
        return result
    }

    const newsDriver = `News focus: ${newsDigest}`
    if (result.keyDrivers.includes(newsDriver)) {
        return result
    }

    return {
        ...result,
        summary: `${result.summary} ${newsDriver}`,
        keyDrivers: [...result.keyDrivers.slice(0, 5), newsDriver].slice(0, 6),
    }
}

const analysisCache = new Map<string, AnalysisCacheEntry>()
const analysisInFlight = new Map<string, Promise<AnalysisResult>>()

function buildAnalysisCacheKey(input: AnalysisInput): string {
    const selectedNews = (input.context?.news?.items || [])
        .slice(0, 4)
        .map((item) => `${item.source}:${item.title}:${item.publishedAt || ''}:${item.relevanceScore ?? ''}`)

    return JSON.stringify({
        pair: input.pair.toUpperCase(),
        timeframe: input.timeframe,
        manualBias: input.manualBias || 'neutral',
        notes: (input.notes || '').trim().slice(0, 160),
        selectedNews,
    })
}

function buildRuleBasedFallback(input: AnalysisInput, baseline: AnalysisResult): AnalysisResult {
    const newsDigest = buildNewsDigest(input, baseline)
    const fallback = appendNewsSignal(baseline, newsDigest)

    return {
        ...fallback,
        riskFlags: Array.from(
            new Set([
                ...fallback.riskFlags,
                'Live AI response unavailable, using deterministic fallback.',
            ]),
        ).slice(0, 6),
    }
}

export function buildAnalysisPrompt(input: AnalysisInput, baseline: AnalysisResult): string {
    const marketState = input.context?.marketState
    const preTrade = input.context?.preTrade
    const execution = input.context?.execution
    const risk = input.context?.risk
    const news = selectRelevantNewsArticles(input, baseline)

    return [
        'You are TradeOS AI Analysis.',
        'Return JSON only. Do not include markdown, commentary, or additional keys.',
        'Use this exact output shape:',
        '{"bias":"bullish|bearish|neutral","confidence":number,"key_levels":[],"reasoning":string,"risk_score":number}',
        'Confidence and risk_score must both be numbers from 0 to 100.',
        'When news context is present, cite the most relevant headline or source in the reasoning and ignore low-signal items.',
        '',
        formatSection('Market State', [
            ['pair', marketState?.pair || input.pair],
            ['timeframe', marketState?.timeframe || input.timeframe],
            ['regime', marketState?.regime || 'Not provided'],
            ['summary', marketState?.summary || baseline.summary],
            ['key_drivers', formatList(marketState?.keyDrivers || baseline.keyDrivers)],
            ['risk_flags', formatList(marketState?.riskFlags || baseline.riskFlags)],
        ]),
        '',
        formatSection('PreTrade Data', [
            ['verdict', preTrade?.verdict || 'Not provided'],
            ['score', typeof preTrade?.score === 'number' ? String(preTrade.score) : 'Not provided'],
            ['bias', preTrade?.bias || input.manualBias || 'neutral'],
            ['entry', preTrade?.entry?.toString() || 'Not provided'],
            ['stop_loss', preTrade?.stopLoss?.toString() || 'Not provided'],
            ['take_profit', preTrade?.takeProfit?.toString() || 'Not provided'],
            ['risk_percent', preTrade?.riskPercent?.toString() || 'Not provided'],
        ]),
        '',
        formatSection('Execution Context', [
            ['status', execution?.status || 'Not provided'],
            ['entry', execution?.entry?.toString() || 'Not provided'],
            ['stop_loss', execution?.stopLoss?.toString() || 'Not provided'],
            ['take_profit', execution?.takeProfit?.toString() || 'Not provided'],
            ['position_size', execution?.positionSize?.toString() || 'Not provided'],
            ['close_price', execution?.closePrice?.toString() || 'Not provided'],
        ]),
        '',
        formatSection('Risk Parameters', [
            ['account_balance', risk?.accountBalance?.toString() || 'Not provided'],
            ['risk_percent', risk?.riskPercent?.toString() || 'Not provided'],
            ['risk_score', typeof risk?.riskScore === 'number' ? String(risk.riskScore) : 'Not provided'],
            ['rr_ratio', typeof risk?.rrRatio === 'number' ? String(risk.rrRatio) : 'Not provided'],
            ['max_loss', risk?.maxLoss?.toString() || 'Not provided'],
        ]),
        '',
        formatSection('User Input', [
            ['manual_bias', input.manualBias || 'neutral'],
            ['notes', (input.notes || 'Not provided').slice(0, 2000)],
        ]),
        '',
        formatNewsSection(news),
        '',
        'Return only the JSON object. If data is missing, infer cautiously and reflect uncertainty in confidence and risk_score.',
    ].join('\n')
}

function extractFirstJsonObject(raw: string): string | null {
    const codeFenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    const source = codeFenceMatch?.[1] || raw
    const firstBrace = source.indexOf('{')
    const lastBrace = source.lastIndexOf('}')

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return null
    }

    return source.slice(firstBrace, lastBrace + 1)
}

function parseProviderRaw(raw: string, provider: ProviderResult['provider']): ProviderResult | null {
    const direct = safeJsonParse<unknown>(raw)
    const extracted = extractFirstJsonObject(raw)
    const fromExtracted = extracted ? safeJsonParse<unknown>(extracted) : null
    const candidate = direct ?? fromExtracted
    if (!candidate || typeof candidate !== 'object') return null

    const payload = providerPayloadSchema.safeParse(candidate)
    if (!payload.success) return null

    const normalized = {
        bias: normalizeBias(payload.data.bias),
        confidence: clampConfidence(payload.data.confidence ?? 50),
        key_levels: sanitizeList(payload.data.key_levels),
        reasoning: (payload.data.reasoning || '').trim() || 'Provider analysis produced no reasoning.',
        risk_score: clampRiskScore(payload.data.risk_score ?? 50),
    }

    const validated = providerOutputSchema.safeParse(normalized)
    if (!validated.success) return null

    return {
        provider,
        bias: validated.data.bias,
        confidence: validated.data.confidence,
        keyLevels: validated.data.key_levels,
        reasoning: validated.data.reasoning,
        riskScore: validated.data.risk_score,
        riskFlags: [`AI risk score (${provider}): ${validated.data.risk_score}`],
    }
}

async function analyzeWithGemini(input: AnalysisInput, baseline: AnalysisResult): Promise<ProviderResult | null> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return null

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
    const prompt = buildAnalysisPrompt(input, baseline)

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
            }),
        })

        if (!response.ok) return null

        const data = await response.json()
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!raw || typeof raw !== 'string') return null

        const parsed = parseProviderRaw(raw, 'gemini')
        if (!parsed) return null

        return parsed
    } catch {
        return null
    }
}

async function analyzeWithDeepSeek(input: AnalysisInput, baseline: AnalysisResult): Promise<ProviderResult | null> {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) return null

    const prompt = buildAnalysisPrompt(input, baseline)

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                temperature: 0.2,
                response_format: { type: 'json_object' },
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

        const parsed = parseProviderRaw(raw, 'deepseek')
        if (!parsed) return null

        return parsed
    } catch {
        return null
    }
}

function mergeResults(baseline: AnalysisResult, providers: ProviderResult[]): AnalysisResult {
    if (providers.length === 0) {
        return baseline
    }

    const bullishVotes = providers.filter((item) => item.bias === 'bullish').length
    const bearishVotes = providers.filter((item) => item.bias === 'bearish').length

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

    const keyDrivers = Array.from(new Set([...baseline.keyDrivers, ...providers.flatMap((item) => item.keyLevels)])).slice(0, 6)

    const riskFlags = Array.from(
        new Set([
            ...baseline.riskFlags,
            ...providers.flatMap((item) => item.riskFlags),
        ]),
    ).slice(0, 6)

    const providerSummaries = providers.map((item) => `${item.provider}: ${item.reasoning}`)

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
    const cacheKey = buildAnalysisCacheKey(input)
    const cached = analysisCache.get(cacheKey)

    if (cached) {
        return cached.result
    }

    const inflight = analysisInFlight.get(cacheKey)
    if (inflight) {
        return inflight
    }

    const analysisPromise = (async () => {
        const [geminiResult, deepseekResult] = await Promise.all([
            analyzeWithGemini(input, baseline),
            analyzeWithDeepSeek(input, baseline),
        ])

        const providers = [geminiResult, deepseekResult].filter((item): item is ProviderResult => Boolean(item))
        if (providers.length === 0) {
            return buildRuleBasedFallback(input, baseline)
        }

        const merged = appendNewsSignal(mergeResults(baseline, providers), buildNewsDigest(input, baseline))
        analysisCache.set(cacheKey, {
            result: merged,
            storedAt: new Date().toISOString(),
        })

        return merged
    })()

    analysisInFlight.set(cacheKey, analysisPromise)

    try {
        return await analysisPromise
    } finally {
        analysisInFlight.delete(cacheKey)
    }
}
